import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

process.env.VALIDATOR_ID = 'val-producer-test';
// Generate a keypair for signing in test
const kp = crypto.generateKeyPairSync('ed25519');
process.env.VALIDATOR_PRIVATE_KEY = kp.privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.VALIDATOR_PUBLIC_KEY = kp.publicKey.export({ type: 'spki', format: 'pem' });
process.env.NS_NODE_URL = 'http://ns.test';
process.env.GATEWAY_URL = 'http://gateway.test';

const server = await import('../../server.js');

test('produceLoop does NOT create critique when not designated', async () => {
  const calls = [];
  global.fetch = async (url, opts) => {
    const s = String(url);
    // simulate mempool with a single REQUEST_REVIEW
    if (s.startsWith('http://gateway.test/v1/mempool')) return { ok: true, json: async () => ({ mempool: [{ payload: { type: 'REQUEST_REVIEW', artifact_id: 'abc' } }] }) };
    if (s.startsWith('http://ns.test/headers/tip')) return { ok: true, json: async () => ({ header: {} }) };
    if (s.startsWith('http://ns.test/chain/height')) return { ok: true, json: async () => ({ height: 10 }) };
    if (s.startsWith('http://ns.test/validators')) return { ok: true, json: async () => ({ validators: [] }) };
    if (s.startsWith('http://ns.test/chain/producer/')) return { ok: true, json: async () => ({ producerId: 'someone-else' }) };

    calls.push({ url: s, opts });
    return { ok: false, status: 404, json: async () => ({}) };
  };

  // stub critiqueProcessor so it's present but should not be invoked
  server.__setCritiqueProcessorForTest({
    fetchArtifactContent: async () => 'code',
    generateCritique: async () => ({ artifact_id: 'abc', review_block_height: 10, critique_version: '1.0.0', llm_model: 'stub', issues: [] }),
    createCritiqueTx: payload => ({ type: 'ARTIFACT_CRITIQUE', payload, from: process.env.VALIDATOR_ID })
  });

  await server.produceLoop();

  // Ensure no POST to gateway mempool that attempted to gossip ARTIFACT_CRITIQUE
  const gossipAttempt = calls.some(c => c.url.startsWith('http://gateway.test/v1/mempool') && c.opts && c.opts.method === 'POST');
  assert.strictEqual(gossipAttempt, false, 'Non-producer should not gossip critiques');
});

test('produceLoop produces and signs critique when designated producer', async () => {
  const posts = [];
  global.fetch = async (url, opts) => {
    const s = String(url);
    if (s.startsWith('http://gateway.test/v1/mempool') && (!opts || opts.method === 'GET')) return { ok: true, json: async () => ({ mempool: [{ payload: { type: 'REQUEST_REVIEW', artifact_id: 'abc', block_height: 42 } }] }) };
    if (s.startsWith('http://ns.test/headers/tip')) return { ok: true, json: async () => ({ header: {} }) };
    if (s.startsWith('http://ns.test/chain/height')) return { ok: true, json: async () => ({ height: 42 }) };
    if (s.startsWith('http://ns.test/validators')) return { ok: true, json: async () => ({ validators: [{ validatorId: process.env.VALIDATOR_ID, stake: 10000 }] }) };
    if (s.startsWith('http://ns.test/chain/producer/')) return { ok: true, json: async () => ({ producerId: process.env.VALIDATOR_ID }) };
    if (s.startsWith('http://gateway.test/v1/mempool') && opts && opts.method === 'POST') {
      posts.push({ url: s, opts });
      return { ok: true, json: async () => ({ ok: true }) };
    }
    if (s.includes('/blocks/produce')) return { ok: true, json: async () => ({ ok: true }) };
    return { ok: false, status: 404, json: async () => ({}) };
  };

  // stub critiqueProcessor to generate known output
  server.__setCritiqueProcessorForTest({
    fetchArtifactContent: async () => 'console.log("ok")',
    generateCritique: async () => ({ artifact_id: 'abc', review_block_height: 42, critique_version: '1.0.0', llm_model: 'stub', issues: [] }),
    createCritiqueTx: payload => ({ type: 'ARTIFACT_CRITIQUE', payload, from: process.env.VALIDATOR_ID })
  });

  await server.produceLoop();

  // ensure we POSTed a signed ARTIFACT_CRITIQUE to gateway mempool
  assert.ok(posts.length > 0, 'Producer should gossip the generated critique to the mempool');
  const postBody = JSON.parse(posts[0].opts.body);
  const tx = postBody.tx || postBody;
  assert.strictEqual(tx.type, 'ARTIFACT_CRITIQUE', 'Should be ARTIFACT_CRITIQUE tx');
  assert.strictEqual(tx.signedBy, process.env.VALIDATOR_ID, 'Signer should be the producer id');
  assert.ok(tx.signature, 'Transaction should be signed by producer');
});
