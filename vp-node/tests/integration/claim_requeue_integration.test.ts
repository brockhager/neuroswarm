import test from 'node:test';
import assert from 'assert';

process.env.VP_NODE_TEST_MOCK_NS_CLIENT = 'true';

import { persistRewardClaim, listPendingRewardClaims } from '../../reward-claims-db-service.js';
import { runRequeueWorkerCycle } from '../../claim-requeue-worker.js';

test('requeue worker processes pending claims (integration, mock NS client)', async () => {
  // create two distinct pending claims
  await persistRewardClaim({ claimId: 'R-REQUEUE-1', producerId: 'V-R-1', allocation: { producerId: 'V-R-1', totalAmount: 10 }, status: 'PENDING' } as any);
  await persistRewardClaim({ claimId: 'R-REQUEUE-2', producerId: 'V-R-2', allocation: { producerId: 'V-R-2', totalAmount: 20 }, status: 'PENDING' } as any);

  // run a single cycle
  await runRequeueWorkerCycle();

  const pending = await listPendingRewardClaims();
  const found = pending.find(r => (r.claim_id || r.claimId) && ((r.claim_id || r.claimId) === 'R-REQUEUE-1' || (r.claim_id || r.claimId) === 'R-REQUEUE-2'));
  assert.ok(!found, 'expected no pending claims after successful requeue submission');
});
