// shared/key-management.test.ts
// CN-07-H Phase 3: Unit tests for key management prototype

import { KmsVaultClient, PublicKeyRegistry } from './key-management.ts';
import { bufferToHex } from './crypto-utils.ts';

describe('CN-07-H: Key Management (Phase 3 prototype)', () => {
  const validatorId = 'V-PRODUCER-TEST-01';

  it('should sign deterministically inside KMS for identical payloads (KmsVaultClient)', async () => {
    const vault = new KmsVaultClient();
    const payload = Buffer.from('deadbeef', 'hex');
    const s1 = await vault.signPayloadInKms(validatorId, payload);
    const s2 = await vault.signPayloadInKms(validatorId, payload);
    expect(s1.equals(s2)).toBe(true);
    expect(s1 instanceof Buffer).toBe(true);
    expect(s1.length).toBeGreaterThan(8);
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

  it('should honor environment override for signed payload via VAULT_SIGN_<KEYID>', async () => {
    const envKeyName = `VAULT_SIGN_${validatorId.replace(/[^A-Z0-9_-]/gi, '_').toUpperCase()}`;
    process.env[envKeyName] = 'cafebabe';
    const vault = new KmsVaultClient();
    const payload = Buffer.from('abcd', 'hex');
    const sig = await vault.signPayloadInKms(validatorId, payload);
    expect(bufferToHex(sig)).toBe('cafebabe');
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
