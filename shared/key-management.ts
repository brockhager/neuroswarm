// shared/key-management.ts
// CN-07-H Phase 3: Key Management Integration (prototype)
// Provides a lightweight mock interface for a vault-backed private key store
// and an authoritative public key registry. This is intentionally simple for
// prototyping; Phase 3 should be replaced with a real KMS/HSM integration.

import { hexToBuffer, bufferToHex, deriveKeypairFromSeed } from './crypto-utils'; 
import { Buffer } from 'buffer';
import crypto from 'crypto';

/**
 * Retrieve a private key for a validator from the "vault" (mock).
 * In production this would call HashiCorp Vault / AWS KMS / HSM and not expose raw private keys.
 * For prototyping we deterministically derive key material so E2E tests can run.
 */
export class VaultClient {
  private isAuthenticated: boolean = false;
  private vaultUrl: string = process.env.VAULT_URL || 'http://vault.internal:8200';

  constructor(private token: string = process.env.VAULT_TOKEN || 'MOCK_VP_SERVICE_TOKEN_123') {
    if (!this.token) throw new Error('VaultClient: VAULT_TOKEN not provided');
    // In a real implementation we would authenticate here and refresh tokens.
    this.isAuthenticated = true;
    console.log('[VaultClient] Initialized (mock).');
  }

  public async getPrivateKey(validatorId: string): Promise<Buffer> {
    if (!this.isAuthenticated) throw new Error('VaultClient: not authenticated');

    // TEST/PROTOTYPE: allow explicit override via env
    const envKey = process.env[`VAULT_PRIVKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`];
    if (envKey && envKey.length > 10) return hexToBuffer(envKey);

    // Simulate latency
    await new Promise((r) => setTimeout(r, 50));

    // For prototype, derive deterministic keypair from seed
    try {
      const kp = await deriveKeypairFromSeed(validatorId);
      return kp.privateKey;
    } catch (e) {
      throw new Error(`VaultClient: unable to derive private key for ${validatorId}: ${e instanceof Error ? e.message : String(e)}`);
    }
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
    // For prototype, only producer IDs are valid
    if (!validatorId.startsWith('V-PRODUCER')) return null;

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

  // future: key status, revocation checks
}

export default { VaultClient, PublicKeyRegistry };
