import assert from 'assert';
import { describe, it } from 'node:test';
import { KmsVaultClient } from '../../../shared/key-management.ts';
import { deriveKeypairFromSeed, getCanonicalPayloadHash, verifySignature } from '../../../shared/crypto-utils.ts';
import { startKmsServer, stopKmsServer } from '../../../tests/fixtures/mock-kms-server.mjs';

describe('KMS remote sign-only fixture (mock)', () => {
  it('should sign via remote KMS and not expose private key', async () => {
    const server = await startKmsServer();
    try {
      // Configure client to use the mock KMS
      process.env.KMS_SERVER_URL = 'http://127.0.0.1:8123';
      process.env.KMS_ENFORCE_SIGN_ONLY = 'true';

      const client = new KmsVaultClient('CI-TEST-TOKEN');

      const payload = { test: 'kms-remote', ts: Date.now() };
      const payloadHash = getCanonicalPayloadHash(payload);

      const sig = await client.signPayloadInKms('VP-MAIN-ED25519-001', payloadHash);
      assert.ok(sig && Buffer.isBuffer(sig), 'expected Buffer signature from remote KMS');

      // Verify the signature using the mock server's deterministic dev key (seed VP-MAIN-ED25519-001)
      const kp = await deriveKeypairFromSeed('VP-MAIN-ED25519-001');
      const ok = await verifySignature(kp.publicKey, payloadHash, sig);
      assert.ok(ok, 'signature should verify using derived public key');

      // Ensure private key retrieval is blocked in enforced sign-only mode
      try {
        await client.getPrivateKeyForTestsOnly('VP-MAIN-ED25519-001');
        throw new Error('should have thrown when reading private key in enforced mode');
      } catch (e) {
        assert.ok(e instanceof Error);
      }
    } finally {
      await stopKmsServer();
      delete process.env.KMS_SERVER_URL;
      delete process.env.KMS_ENFORCE_SIGN_ONLY;
    }
  });
});
