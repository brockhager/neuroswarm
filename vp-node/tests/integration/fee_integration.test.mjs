import test from 'node:test';
import assert from 'assert';

import { processJobFeeSettlement, submitRewardClaim } from '../../fee-distribution-service.ts';

test('end-to-end fee settlement and submission (mocked NS client)', async () => {
  // Ensure the ns-node-client uses the mock path in CI / offline tests
  process.env.VP_NODE_TEST_MOCK_NS_CLIENT = 'true';

  const job = { producerId: 'V-INTEG-1', jobFeeAmount: 123.45, jobCompletionHeight: 7000 };

  // The top-level call should complete without throwing
  await processJobFeeSettlement(job);

  // And lower-level claim submission should return a txHash in mock mode
  const alloc = { producerId: job.producerId, producerReward: 74.07, stakePoolReward: 37.03, networkFundShare: 12.35, totalAmount: 123.45 };
  const res = await submitRewardClaim(alloc);
  assert.ok(res?.txHash, 'expected a txHash for queued settlement');
});
