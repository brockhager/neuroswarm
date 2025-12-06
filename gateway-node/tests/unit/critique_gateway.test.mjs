import test from 'node:test';
import assert from 'assert';
import crypto from 'crypto';
import { canonicalize as sharedCanonicalize } from '../../../shared/crypto.js';

process.env.PORT = '9022';
const server = await import('../../server.js');

async function waitHealth(port = 9022) {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server did not come up');
}

test('gateway rejects ARTIFACT_CRITIQUE without signature/publicKey', async () => {
  await waitHealth();
  const tx = { type: 'ARTIFACT_CRITIQUE', fee: 1, payload: { artifact_id: 'bafytest1', review_block_height: 1, critique_version: '1.0.0', llm_model: 'stub', issues: [] } };
  const r = await fetch('http://localhost:9022/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) });
  assert.strictEqual(r.status, 400);
  const j = await r.json();
  assert.ok(j.error && (j.error === 'missing_signer' || j.error === 'missing_signature' || j.error === 'missing_public_key'));
});

test('gateway accepts valid signed ARTIFACT_CRITIQUE and rejects duplicate review', async () => {
  await waitHealth();
  // create keypair
  const kp = crypto.generateKeyPairSync('ed25519');
  const priv = kp.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pub = kp.publicKey.export({ type: 'spki', format: 'pem' });

  const tx = { type: 'ARTIFACT_CRITIQUE', fee: 1, signedBy: 'val-test', publicKey: pub, payload: { artifact_id: 'bafydup1', review_block_height: 101, critique_version: '1.0.0', llm_model: 'stub', issues: [] } };
  const copy = { ...tx }; delete copy.signature;
  const data = sharedCanonicalize(copy);
  const sig = crypto.sign(null, Buffer.from(data, 'utf8'), kp.privateKey).toString('base64');
  tx.signature = sig;

  const r1 = await fetch('http://localhost:9022/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) });
  assert.strictEqual(r1.status, 200);
  const j1 = await r1.json();
  assert.ok(j1.ok && j1.txId, 'accepted tx should return txId');

  // Post duplicate critique → expect duplicate_review
  const tx2 = { ...tx };
  const r2 = await fetch('http://localhost:9022/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx2) });
  assert.strictEqual(r2.status, 409);
  const j2 = await r2.json();
  assert.strictEqual(j2.error, 'duplicate_review');

  // shutdown test server
  await fetch('http://localhost:9022/__test/shutdown', { method: 'POST' });
});
