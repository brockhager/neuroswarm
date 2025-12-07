// shared/key-management.ts
// CN-07-H Phase 3: Key Management Integration (prototype)
// Provides a lightweight mock interface for a vault-backed private key store
// and an authoritative public key registry. This is intentionally simple for
// prototyping; Phase 3 should be replaced with a real KMS/HSM integration.

import crypto from 'crypto';

/**
 * Retrieve a private key for a validator from the "vault" (mock).
 * In production this would call HashiCorp Vault / AWS KMS / HSM and not expose raw private keys.
 * For prototyping we deterministically derive key material so E2E tests can run.
 */
export async function getPrivateKeyFromVault(validatorId: string): Promise<string> {
  // If the environment provides an explicit test key, prefer that
  const envKey = process.env[`VAULT_PRIVKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`];
  if (envKey && envKey.length > 10) return envKey; // assume hex

  // Deterministic derivation for tests/prototype: sha256 of "VAULT:validatorId"
  const derived = crypto.createHash('sha256').update(`VAULT:${validatorId}`).digest('hex');
  return derived;
}

/**
 * Retrieve a public key for a validator from the authoritative registry (mock).
 * In production the registry would be consensus-backed (on-chain) or a secure database.
 */
export async function getPublicKeyFromRegistry(validatorId: string): Promise<string | null> {
  // Example special-case: only producers that begin with 'V-PRODUCER' are registered for tests
  if (!validatorId.startsWith('V-PRODUCER')) return null;

  // If caller provided a public key override in env, use it
  const envKey = process.env[`REGISTRY_PUBKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`];
  if (envKey && envKey.length > 10) return envKey;

  // Deterministic derivation used by prototypes
  const derived = crypto.createHash('sha256').update(`REGISTRY:${validatorId}`).digest('hex');
  return derived;
}

export default { getPrivateKeyFromVault, getPublicKeyFromRegistry };
