// shared/key-management.test.ts
// CN-07-H Phase 3: Unit tests for key management prototype

import { getPrivateKeyFromVault, getPublicKeyFromRegistry } from './key-management';

describe('CN-07-H: Key Management (Phase 3 prototype)', () => {
  const validatorId = 'V-PRODUCER-TEST-01';

  it('should derive a deterministic private key for a validator', async () => {
    const p1 = await getPrivateKeyFromVault(validatorId);
    const p2 = await getPrivateKeyFromVault(validatorId);
    expect(p1).toBe(p2);
    expect(typeof p1).toBe('string');
    expect(p1.length).toBeGreaterThan(40);
  });

  it('should return null for non-registered validators for public key', async () => {
    const v = await getPublicKeyFromRegistry('NOT_A_PRODUCER');
    expect(v).toBeNull();
  });

  it('should derive a deterministic public key for known producer', async () => {
    const pk1 = await getPublicKeyFromRegistry(validatorId);
    const pk2 = await getPublicKeyFromRegistry(validatorId);
    expect(pk1).toBe(pk2);
    expect(typeof pk1).toBe('string');
  });

  it('should honor environment override for vault private key', async () => {
    const envKeyName = `VAULT_PRIVKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`;
    process.env[envKeyName] = 'deadbeef';
    const pk = await getPrivateKeyFromVault(validatorId);
    expect(pk).toBe('deadbeef');
    delete process.env[envKeyName];
  });

  it('should honor environment override for registry public key', async () => {
    const envKeyName = `REGISTRY_PUBKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`;
    process.env[envKeyName] = 'cafebabe';
    const pk = await getPublicKeyFromRegistry(validatorId);
    expect(pk).toBe('cafebabe');
    delete process.env[envKeyName];
  });
});
