import assert from 'node:assert';
import { submitSignedEvidence, submitRewardClaim } from '../../ns-node-client.js';

// Ensure postWithRetry uses the deterministic mock path so tests are offline-friendly
process.env.VP_NODE_TEST_MOCK_NS_CLIENT = 'true';

(async () => {
  const mock = {
    evidence: { evidenceId: 'EVID-TEST-1', validatorId: 'V-TEST-1' },
    validatorSignature: 'SIG-MOCK'
  } as const;

  // Should resolve and dispatch a confirmation alert (mocked alerting)
  await submitSignedEvidence(mock as any);
  console.log('[TEST] ns-node-client: signed evidence passed');

  // Also verify reward claim submission helper
  const rv = await submitRewardClaim({ type: 'reward-claim', payload: { foo: 'bar' } });
  assert.ok(rv?.txHash, 'expected txHash from mock reward claim');
  console.log('[TEST] ns-node-client: reward claim passed');
})();
