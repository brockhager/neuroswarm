import { test } from 'node:test';
import assert from 'node:assert';

// Prepare environment
process.env.VALIDATOR_ID = 'val-test-review';
process.env.NS_NODE_URL = 'http://ns.test';
process.env.GATEWAY_URL = 'http://gateway.test';

// Pre-import shared ns-llm-client and stub generate
const nsMod = await import('../../../shared/ns-llm-client.js');
nsMod.default.generate = async (prompt) => {
  // Return a structured JSON string
  return JSON.stringify([
    { severity: 'minor', line_number: 1, comment: 'Small nit' },
    { severity: 'major', line_number: 10, comment: 'Security issue: use safe API' }
  ]);
};

// Now import server (it will pick up the mocked ns-llm-client)
const server = await import('../../server.js');

function createFetchMock(mapping) {
  return async (url, opts) => {
    for (const [key, resp] of Object.entries(mapping)) {
      if (String(url).startsWith(key)) {
        const out = typeof resp === 'function' ? resp(url, opts) : resp;
        return { ok: true, status: 200, json: async () => out, text: async () => (typeof out === 'string' ? out : JSON.stringify(out)) };
      }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

test('produceLoop processes REQUEST_REVIEW and includes ARTIFACT_CRITIQUE in produced block', async () => {
  const posted = [];

  global.fetch = createFetchMock({
    'http://gateway.test/v1/mempool': { mempool: [{ payload: { type: 'REQUEST_REVIEW', artifactId: 'QmTestCid', id: 'req1' } }] },
    'http://ns.test/headers/tip': {},
    'http://ns.test/chain/height': { height: 20 },
    'http://ns.test/validators': { validators: [{ validatorId: 'val-test-review', stake: 5000 }] },
    // Designated producer is this validator
    'http://ns.test/chain/producer/': { producerId: process.env.VALIDATOR_ID },
    // Artifact fetch path
    'http://ns.test/api/v1/artifact/QmTestCid': 'function hello() { return 42; }',
    // capture blocks/produce POST
    'http://ns.test/blocks/produce': async (url, opts) => {
      posted.push({ url: String(url), opts });
      return { ok: true, json: async () => ({ ok: true }) };
    }
  });

  await server.produceLoop();

  assert.ok(posted.length > 0, 'expected a produce POST');
  // Parse first POST's body and check txs contain ARTIFACT_CRITIQUE
  const body = JSON.parse(posted[0].opts.body);
  const hasCrit = Array.isArray(body.txs) && body.txs.some(t => t && t.type === 'ARTIFACT_CRITIQUE' && t.artifactId === 'QmTestCid');
  assert.ok(hasCrit, 'ARTIFACT_CRITIQUE tx should be included in produced block');
});
