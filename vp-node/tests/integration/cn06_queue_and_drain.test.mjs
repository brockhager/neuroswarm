import test from 'node:test';
import assert from 'assert';

process.env.VALIDATOR_ID = 'val-cn06-test';
process.env.NS_NODE_URL = 'http://ns.cn06';
process.env.GATEWAY_URL = 'http://gw.cn06';

const server = await import('../../server.js');

test('VP queues REQUEST_REVIEW while syncing and drains when synced', async () => {
  // This test will simulate initial OFFLINE/unsynced NS responses so that produceLoop enqueues the review.
  let syncedNow = false;
  const posts = [];

  global.fetch = async (url, opts) => {
    const s = String(url);
    // Gateway mempool always returns one REQUEST_REVIEW
    if (s.startsWith('http://gw.cn06/v1/mempool')) {
      return { ok: true, json: async () => ({ mempool: [{ payload: { type: 'REQUEST_REVIEW', artifact_id: 'abc' } }] }) };
    }

    // NS endpoints: first call -> unsynced (simulate error / missing), second call -> synced
    if (s.startsWith('http://ns.cn06/headers/tip')) {
      if (!syncedNow) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, json: async () => ({ header: {} }) };
    }
    if (s.startsWith('http://ns.cn06/chain/height')) {
      if (!syncedNow) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, json: async () => ({ height: 42 }) };
    }

    if (s.startsWith('http://ns.cn06/validators')) return { ok: true, json: async () => ({ validators: [{ validatorId: process.env.VALIDATOR_ID, stake: 100 }] }) };

    // designated producer - set to our validator id so drain code can attempt produce
    if (s.startsWith('http://ns.cn06/chain/producer/')) return { ok: true, json: async () => ({ producerId: process.env.VALIDATOR_ID }) };

    // Consume call: when produceLoop posts to /blocks/produce we capture it
    if (s.includes('/blocks/produce')) {
      posts.push({ url: s, opts });
      return { ok: true, json: async () => ({ ok: true }) };
    }

    // Gateway consume endpoint stub
    if (s.startsWith('http://gw.cn06/v1/mempool/consume')) return { ok: true, json: async () => ({ ok: true }) };

    return { ok: false, status: 404, json: async () => ({}) };
  };

  // ensure we're in a fresh state
  server.reviewQueue.drainAll();
  // inject a lightweight critiqueProcessor stub so queued items can be converted when drained
  server.__setCritiqueProcessorForTest({
    generateCritique: async (req, content) => ({ artifact_id: req.artifact_id || req.id, summary: 'stubbed', issues: [] }),
    fetchArtifactContent: async (id, gw) => 'dummy content',
    createCritiqueTx: (payload) => ({ type: 'ARTIFACT_CRITIQUE', payload })
  });
  // initial state should be SYNCING (server.main() sets initial state)
  // Run produceLoop once - should set state to SYNCING and enqueue request
  await server.produceLoop();
  assert.strictEqual(server.vpState.getState(), 'SYNCING_LEDGER');
  assert.strictEqual(server.reviewQueue.size() > 0, true, 'Expected queued review after unsynced produce loop');

  // Now run again - fetch will indicate NS is healthy; produceLoop should drain queue and produce
  syncedNow = true;
  await server.produceLoop();
  // After draining and producing we should have attempted a POST to /blocks/produce
  assert.ok(posts.length > 0, 'Expected a POST to /blocks/produce after drain');
  assert.strictEqual(server.reviewQueue.size(), 0, 'Queue should be drained after successful production');
});
