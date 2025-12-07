import test from 'node:test';
import assert from 'assert';

// Ensure the ns-node-client uses the deterministic mock path in test runs
process.env.VP_NODE_TEST_MOCK_NS_CLIENT = 'true';

import { processJobFeeSettlement, submitRewardClaim } from '../../fee-distribution-service.js';

test('end-to-end fee settlement and submission (mocked NS client) - tsx runner', async () => {
  const job = { producerId: 'V-INTEG-1', jobFeeAmount: 123.45, jobCompletionHeight: 7000 };

  // The top-level call should complete without throwing
  await processJobFeeSettlement(job);

  // And lower-level claim submission should return a txHash in mock mode
  const alloc = { producerId: job.producerId, producerReward: 74.07, stakePoolReward: 37.03, networkFundShare: 12.35, totalAmount: 123.45 };
  const res = await submitRewardClaim(alloc as any);
  assert.ok(res?.settlementTxHash || res?.claimId || res?.txHash, 'expected a txHash or claimId for queued settlement');
});
