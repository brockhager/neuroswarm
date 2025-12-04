import test from 'node:test';
import assert from 'assert';
import { generateEd25519KeypairPem, signHeaderWithPrivateKey, verifyHeaderSignature, canonicalize } from '../../src/producer-core.mjs';

test('signHeaderWithPrivateKey produces a verifiable signature and tamper detection works', () => {
  const { privateKeyPem, publicKeyPem } = generateEd25519KeypairPem();

  const header = {
    version: '1.0.0',
    chainId: 'neuroswarm-testnet',
    height: 123,
    producerId: 'val-1',
    prevHash: '00'.repeat(32),
    payloadCid: 'cid:test',
    sourcesRoot: 'deadbeef',
    merkleRoot: 'feedface',
    timestamp: 1700000000000,
    txCount: 2
  };

  const sig = signHeaderWithPrivateKey(privateKeyPem, header);
  assert.strictEqual(typeof sig, 'string');

  // verify should pass
  const ok = verifyHeaderSignature(publicKeyPem, header, sig);
  assert.ok(ok, 'signature should validate for canonical header bytes');

  // tamper header
  const tampered = { ...header, txCount: 3 };
  const ok2 = verifyHeaderSignature(publicKeyPem, tampered, sig);
  assert.strictEqual(ok2, false, 'signature should fail after tampering');
});
