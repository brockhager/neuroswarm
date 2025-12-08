// shared/vault-transit-connector-vault.ts
// Concrete HashiCorp Vault Transit connector implementation.
// Ready to use once the developer installs `node-vault` and provides production credentials.

// NOTE: we intentionally avoid importing the TypeScript-only `SecureTransitConnector`
// interface at runtime because interfaces are erased from emitted JS and attempting
// to import them directly from .ts in a node test-runner environment causes failures.
// The class below conforms to the SecureTransitConnector contract.
import { Buffer } from 'buffer';

type NodeVaultClient = {
  write: (path: string, body?: any) => Promise<any>;
  token?: string;
  // Optional token lookup to verify auth
  tokenLookupSelf?: () => Promise<any>;
  approleLogin?: (opt: { role_id: string; secret_id: string }) => Promise<any>;
  request?: (opt: any) => Promise<any>;
};

export interface VaultTransitConfig {
  endpoint?: string; // VAULT_ADDR
  token?: string; // VAULT_TOKEN (preferred)
  approle?: { roleId: string; secretId: string } | null; // optional AppRole params
  transitMount?: string; // default: 'transit'
}

/**
 * VaultTransitConnector
 * - Uses node-vault (dynamically imported) when no client is injected.
 * - Strictly adheres to sign-only semantics: it calls the Transit engine to sign a pre-hashed
 *   digest and returns the raw signature bytes. It never exports or manages private key material.
 *
 * Usage (production):
 *   1. npm install node-vault
 *   2. const conn = new VaultTransitConnector({ endpoint: process.env.VAULT_ADDR, token: process.env.VAULT_TOKEN });
 *   3. await conn.authenticate();
 *   4. await conn.signHash('my-key', Buffer.from(...));
 */
export class VaultTransitConnector /* implements SecureTransitConnector */ {
  private client?: NodeVaultClient;
  private cfg: VaultTransitConfig;
  private mount: string;
  private isAuth = false;

  constructor(cfg?: VaultTransitConfig, client?: NodeVaultClient) {
    this.cfg = cfg || {};
    this.mount = this.cfg.transitMount ?? 'transit';

    if (client) {
      this.client = client;
    }
  }

  // Lazy initialize node-vault client if not provided by tests
  private async ensureClient() {
    if (this.client) return this.client;

    // Dynamically import node-vault so CI/dev environments without the package don't fail
    // Developers should `npm install node-vault` when wiring the connector in production.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const createClient = await import('node-vault').then((m) => (m.default ? m.default : m));

    const options: any = {};
    if (this.cfg.endpoint) options.endpoint = this.cfg.endpoint;
    if (this.cfg.token) options.token = this.cfg.token;

    // Create client instance
    // node-vault v2+ exports a factory function
    // @ts-ignore - runtime import
    const client = createClient(options) as any;
    this.client = client as NodeVaultClient;
    return this.client;
  }

  public async authenticate(): Promise<void> {
    // If AppRole credentials provided, perform login to get a client token.
    if (this.cfg.approle && (!this.cfg.token || this.cfg.token.length === 0)) {
      const client = (await this.ensureClient()) as any;
      // AppRole login: /v1/auth/approle/login
      const { roleId, secretId } = this.cfg.approle;
      const res = await client.approleLogin ? client.approleLogin({ role_id: roleId, secret_id: secretId }) : client.request({ path: '/v1/auth/approle/login', method: 'POST', json: { role_id: roleId, secret_id: secretId } });
      const token = res?.auth?.client_token;
      if (!token) throw new Error('Vault AppRole login failed to return a client token');
      // assign token for subsequent requests
      (this.client as any).token = token;
    }

    // Verify lookup self if client exposes token lookup
    const c = await this.ensureClient();
    if (typeof (c as any).tokenLookupSelf === 'function') {
      await (c as any).tokenLookupSelf();
    }

    this.isAuth = true;
  }

  public async signHash(keyId: string, hashBuffer: Buffer): Promise<Buffer> {
    if (!this.isAuth) throw new Error('Connector not authenticated');

    const client = await this.ensureClient();

    // Call Transit sign endpoint
    // POST /v1/<mount>/sign/<keyId>
    const path = `${this.mount}/sign/${keyId}`;
    const input = hashBuffer.toString('base64');

    // Use prehashed=true so Vault treats the input as pre-hashed (recommended when signing hashes)
    // Some Vault versions may ignore prehashed for specific key types; keep a tolerant approach.
    const body = { input, prehashed: true };

    const res = await client.write(path, body);

    // Vault returns a 'signature' field in the form `vault:v1:<base64>` or in some versions `signature_raw`
    const signatureField = res?.data?.signature || res?.data?.signature_raw || res?.data?.raw_signature || null;
    if (!signatureField) {
      throw new Error('Vault did not return a signature in the expected field');
    }

    // If the signature is in the `vault:v1:<b64>` format, extract the tail
    let b64 = signatureField;
    if (typeof signatureField === 'string' && signatureField.includes(':')) {
      const parts = signatureField.split(':');
      b64 = parts[parts.length - 1];
    }

    return Buffer.from(b64, 'base64');
  }
}

export default { VaultTransitConnector };
