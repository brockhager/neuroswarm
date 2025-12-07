// shared/key-management.test.ts
// CN-07-H Phase 3: Unit tests for key management prototype

import { VaultClient, PublicKeyRegistry } from './key-management';
import { bufferToHex } from './crypto-utils';

describe('CN-07-H: Key Management (Phase 3 prototype)', () => {
  const validatorId = 'V-PRODUCER-TEST-01';

  it('should derive a deterministic private key for a validator (VaultClient)', async () => {
    const vault = new VaultClient();
    const p1 = await vault.getPrivateKey(validatorId);
    const p2 = await vault.getPrivateKey(validatorId);
    expect(p1.equals(p2)).toBe(true);
    expect(p1 instanceof Buffer).toBe(true);
    expect(p1.length).toBeGreaterThan(16);
  });

  it('should return null for non-registered validators for public key (PublicKeyRegistry)', async () => {
    const r = new PublicKeyRegistry();
    const v = await r.getPublicKey('NOT_A_PRODUCER');
    expect(v).toBeNull();
  });

  it('should derive a deterministic public key for known producer', async () => {
    const r = new PublicKeyRegistry();
    const pk1 = await r.getPublicKey(validatorId);
    const pk2 = await r.getPublicKey(validatorId);
    expect(pk1!.equals(pk2!)).toBe(true);
    expect(pk1 instanceof Buffer).toBe(true);
  });

  it('should honor environment override for vault private key', async () => {
    const envKeyName = `VAULT_PRIVKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`;
    process.env[envKeyName] = 'deadbeef';
    const vault = new VaultClient();
    const pk = await vault.getPrivateKey(validatorId);
    expect(bufferToHex(pk)).toBe('deadbeef');
    delete process.env[envKeyName];
  });

  it('should honor environment override for registry public key', async () => {
    const envKeyName = `REGISTRY_PUBKEY_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`;
    process.env[envKeyName] = 'cafebabe';
    const r = new PublicKeyRegistry();
    const pk = await r.getPublicKey(validatorId);
    expect(bufferToHex(pk!)).toBe('cafebabe');
    delete process.env[envKeyName];
  });
});
