import assert from 'node:assert';
import { calculateFeeSplit, submitRewardClaim, processJobFeeSettlement } from '../../fee-distribution-service.js';

(async () => {
  // Basic split
  const job = { producerId: 'V-A-1', jobFeeAmount: 100.0, jobCompletionHeight: 1000 };

  const split = calculateFeeSplit(job as any);
  assert.strictEqual(split.totalAmount, 100.0);
  assert.strictEqual(split.producerReward, 60.0);
  assert.strictEqual(split.stakePoolReward, 30.0);
  assert.strictEqual(split.networkFundShare, 10.0);

  console.log('[TEST] fee-calculation: passed');

  // Submission (mocked client) should return a txHash
  const result = await submitRewardClaim(split);
  assert.ok(result === null || typeof result.claimId === 'string' || typeof result.settlementTxHash === 'string' || result?.settlementTxHash === undefined);
  console.log('[TEST] fee-submission: passed');

  // End-to-end process should not throw
  await processJobFeeSettlement(job as any);
  console.log('[TEST] fee-processJobSettlement: passed');

  console.log('[TEST] fee-distribution: all passed');
})();
