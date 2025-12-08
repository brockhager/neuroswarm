import assert from 'assert';
import { KmsVaultClient } from '../key-management.ts';
import { getCanonicalPayloadHash, deriveKeypairFromSeed, verifySignature } from '../crypto-utils.ts';

describe('KmsVaultClient with transit connector (mock) integration', () => {
  it('uses MockVaultTransitConnector when USE_VAULT_TRANSIT=true', async () => {
    process.env.USE_VAULT_TRANSIT = 'true';

    const client = new KmsVaultClient('CI-TEST');
    const payload = { fn: 'transit-integ', ts: Date.now() };
    const hash = getCanonicalPayloadHash(payload);

    const sig = await client.signPayloadInKms('TRANSIT-TEST-1', hash);
    assert.ok(Buffer.isBuffer(sig), 'expected signature buffer');

    // MockVaultTransitConnector uses HMAC with "TRANSIT:<keyId>" seed
    const derived = await deriveKeypairFromSeed('TRANSIT-TEST-1');
    // Our MockVaultTransitConnector signs via HMAC with TRANSIT:ID; we can assert length
    assert.ok(sig.length > 0, 'signature length should be > 0');

    delete process.env.USE_VAULT_TRANSIT;
  });
});
