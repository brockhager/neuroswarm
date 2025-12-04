import { test } from 'node:test';
import assert from 'node:assert';

// Set environment before importing server to initialize VAL_ID etc
process.env.VALIDATOR_ID = 'val-test-guard';
process.env.NS_NODE_URL = 'http://ns.test';
process.env.GATEWAY_URL = 'http://gateway.test';

// We'll import the server module after setting env vars
const server = await import('../../server.js');

// Helper to mock global fetch with a map of URL -> response
function createFetchMock(mapping) {
  return async (url, opts) => {
    // Find a matching mapping key; allow simple startsWith matching
    for (const [key, resp] of Object.entries(mapping)) {
      if (url.toString().startsWith(key)) {
        // If resp is a function, call it to get dynamic behavior
        const out = typeof resp === 'function' ? resp(url, opts) : resp;
        return {
          ok: true,
          json: async () => out,
          status: 200
        };
      }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
}

test('produceLoop skips when designated producer is different', async () => {
  const calls = [];
  global.fetch = createFetchMock({
    'http://gateway.test/v1/mempool': { mempool: [] },
    'http://ns.test/headers/tip': {},
    'http://ns.test/chain/height': { height: 5 },
    'http://ns.test/validators': { validators: [] },
    // designated is someone else
    'http://ns.test/chain/producer/': { producerId: 'someone-else' }
  });

  // Wrap fetch to record POSTs to blocks/produce
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.push({ url: String(url), opts });
    return originalFetch(url, opts);
  };

  // Run produceLoop once
  await server.produceLoop();

  // Ensure there was NO POST to /blocks/produce
  const posted = calls.some(c => c.url.includes('/blocks/produce') && c.opts && c.opts.method === 'POST');
  assert.strictEqual(posted, false, 'VP should NOT attempt to produce when not designated');
});

test('produceLoop proceeds when designated producer matches VAL_ID', async () => {
  const posts = [];

  // Provide responses simulating a mempool and valid NS responses
  global.fetch = async (url, opts) => {
    const s = String(url);
    if (s.startsWith('http://gateway.test/v1/mempool')) return { ok: true, json: async () => ({ mempool: [{ payload: { id: 't1' } }] }) };
    if (s.startsWith('http://ns.test/headers/tip')) return { ok: true, json: async () => ({ header: {} }) };
    if (s.startsWith('http://ns.test/chain/height')) return { ok: true, json: async () => ({ height: 10 }) };
    if (s.startsWith('http://ns.test/validators')) return { ok: true, json: async () => ({ validators: [{ validatorId: 'val-test-guard', stake: 10000 }] }) };

    if (s.startsWith('http://ns.test/chain/producer/')) return { ok: true, json: async () => ({ producerId: process.env.VALIDATOR_ID }) };
    if (s.includes('/blocks/produce')) {
      posts.push({ url: s, opts });
      return { ok: true, json: async () => ({ ok: true }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  // Run produceLoop once
  await server.produceLoop();

  // Confirm that a POST to /blocks/produce was attempted
  assert.ok(posts.length > 0, 'VP should attempt to produce when it is designated');
});
