// shared/key-management.ts
// CN-07-H Phase 3: Key Management Integration (prototype)
// Provides a lightweight mock interface for a vault-backed private key store
// and an authoritative public key registry. This is intentionally simple for
// prototyping; Phase 3 should be replaced with a real KMS/HSM integration.

import { hexToBuffer, bufferToHex, deriveKeypairFromSeed } from './crypto-utils.ts'; 
import { Buffer } from 'buffer';
import crypto from 'crypto';

/**
 * Retrieve a private key for a validator from the "vault" (mock).
 * In production this would call HashiCorp Vault / AWS KMS / HSM and not expose raw private keys.
 * For prototyping we deterministically derive key material so E2E tests can run.
 */
export class KmsVaultClient {
  private isAuthenticated: boolean = false;
  private vaultUrl: string = process.env.VAULT_URL || 'http://vault.internal:8200';
  private token: string;

  constructor(token: string = process.env.VAULT_TOKEN || 'MOCK_VP_SERVICE_TOKEN_123') {
    this.token = token;
    if (!this.token) throw new Error('KmsVaultClient: VAULT_TOKEN not provided');
    // In a real implementation we would authenticate here and refresh tokens.
    this.isAuthenticated = true;
    console.log('[KmsVaultClient] Initialized (mock).');
  }

  /**
   * Sign a payload hash inside the KMS/HSM and return the signature buffer.
   * The private key NEVER leaves the KMS in production.
   * @param keyId logical key identifier (e.g., 'ns-primary' or 'V-PRODUCER-01')
   * @param payloadHash canonical payload hash to sign
   */
  public async signPayloadInKms(keyId: string, payloadHash: Buffer): Promise<Buffer> {
    if (!this.isAuthenticated) throw new Error('KmsVaultClient: not authenticated');

    // Environment override for deterministic CI testing: VAULT_SIGN_<KEYID>=hexsig
    const envKeyName = `VAULT_SIGN_${keyId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`;
    const override = process.env[envKeyName];
    if (override && override.length > 8) return hexToBuffer(override);

    // simulate latency
    await new Promise((r) => setTimeout(r, 50));

    // For prototype: derive private key deterministically from keyId and sign locally.
    try {
      const kp = await deriveKeypairFromSeed(keyId);
      const { signPayload } = await import('./crypto-utils.ts');
      const sig = await signPayload(kp.privateKey, payloadHash);
      return sig;
    } catch (e) {
      throw new Error(`KmsVaultClient: failed to sign with key ${keyId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // DEPRECATED in production: test-friendly helper to derive the private key (not for production use)
  public async getPrivateKeyForTestsOnly(keyId: string): Promise<Buffer> {
    if (!this.isAuthenticated) throw new Error('KmsVaultClient: not authenticated');
    // CI / hardened mode: enforce sign-only interface — disallow tests from reading private key
    if (process.env.KMS_ENFORCE_SIGN_ONLY === 'true') {
      throw new Error('KmsVaultClient: getPrivateKeyForTestsOnly disabled when KMS_ENFORCE_SIGN_ONLY=true');
    }
    const envKey = process.env[`VAULT_PRIVKEY_${keyId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`];
    if (envKey && envKey.length > 10) return hexToBuffer(envKey);
    await new Promise((r) => setTimeout(r, 50));
    const kp = await deriveKeypairFromSeed(keyId);
    return kp.privateKey;
  }

  // future: key rotation, revoke, audit-log helper methods
}

/**
 * Retrieve a public key for a validator from the authoritative registry (mock).
 * In production the registry would be consensus-backed (on-chain) or a secure database.
 */
export class PublicKeyRegistry {
  private registryUrl = process.env.REGISTRY_URL || 'https://dpos-registry.neuroswarm.net/api/v1/keys';

  constructor() {
    console.log(`[PublicKeyRegistry] Initialized pointing at ${this.registryUrl}`);
  }

  public async getPublicKey(validatorId: string): Promise<Buffer | null> {
    // For prototype, accept validator IDs and node IDs (e.g., 'V-PRODUCER-*' or 'NS-*').
    // If an environment override is provided, use that; otherwise derive deterministically from the id.

    const envKey = process.env[`REGISTRY_PUBKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`];
    if (envKey && envKey.length > 10) return hexToBuffer(envKey);

    // Simulate network lookup latency
    await new Promise((r) => setTimeout(r, 30));

    try {
      const kp = await deriveKeypairFromSeed(validatorId);
      return kp.publicKey;
    } catch (e) {
      throw new Error(`PublicKeyRegistry: failed to derive public key for ${validatorId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * Return all public keys associated with a registry identity.
   * Allows rotation overlap testing: env override REGISTRY_PUBKEY_<ID> may contain comma-separated hex public keys.
   */
  public async getPublicKeys(validatorId: string): Promise<Buffer[]> {
    const envKey = process.env[`REGISTRY_PUBKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`];
    if (envKey && envKey.length > 0) {
      // split comma-separated keys
      const parts = envKey.split(',').map(s => s.trim()).filter(Boolean);
      return parts.map(p => hexToBuffer(p));
    }

    // default: single derived key
    const kp = await deriveKeypairFromSeed(validatorId);
    return [kp.publicKey];
  }

  // future: key status, revocation checks
}

export default { KmsVaultClient, PublicKeyRegistry };
