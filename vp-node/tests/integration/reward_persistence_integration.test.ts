import test from 'node:test';
import assert from 'assert';

process.env.VP_NODE_TEST_MOCK_NS_CLIENT = 'true';

import { processJobFeeSettlement } from '../../fee-distribution-service.js';
import { listPendingRewardClaims } from '../../reward-claims-db-service.js';

test('vp-node reward persistence end-to-end (mock NS client)', async () => {
  const job = { producerId: 'V-PERSIST-1', jobFeeAmount: 55.5, jobCompletionHeight: 9000 };

  // top-level should not throw
  await processJobFeeSettlement(job);

  // pending list should not contain the just-submitted claim because it should be marked SUBMITTED
  const pend = await listPendingRewardClaims();
  const found = pend.find(r => (r.claim_id || r.claimId) && (r.claim_id || r.claimId).startsWith('CLAIM-'));
  assert.ok(!found, 'no pending claims after a successful submit');
});
