import assert from 'node:assert';
import {
  persistRewardClaim,
  listPendingRewardClaims,
  markRewardClaimSubmitted,
  markRewardClaimFailed,
  markRewardClaimSettled,
} from '../../reward-claims-db-service.js';

(async () => {
  const record = {
    claimId: 'CLAIM-TEST-1',
    producerId: 'V-PROD-1',
    allocation: { producerReward: 10, stakePoolReward: 5, networkFundShare: 1, totalAmount: 16 },
    status: 'PENDING',
  } as any;

  await persistRewardClaim(record);
  const pending = await listPendingRewardClaims();
  assert.ok(pending.find(r => r.claim_id === 'CLAIM-TEST-1' || r.claimId === 'CLAIM-TEST-1'));
  console.log('[TEST] persistRewardClaim/listPending: passed');

  await markRewardClaimSubmitted('CLAIM-TEST-1', 'TX-SETTLE-123');
  const pending2 = await listPendingRewardClaims();
  assert.ok(!pending2.find(r => r.claim_id === 'CLAIM-TEST-1' || r.claimId === 'CLAIM-TEST-1'));
  console.log('[TEST] markRewardClaimSubmitted: passed');

  // Insert again for failure path
  await persistRewardClaim({ ...record, claimId: 'CLAIM-TEST-2' });
  await markRewardClaimFailed('CLAIM-TEST-2', 'network failure');
  const p3 = await listPendingRewardClaims();
  // CLAIM-TEST-2 is considered 'FAILED' and should appear in pending list according to our definition
  assert.ok(p3.find(r => r.claim_id === 'CLAIM-TEST-2' || r.claimId === 'CLAIM-TEST-2'));
  console.log('[TEST] markRewardClaimFailed: passed');

  await markRewardClaimSettled('CLAIM-TEST-2', 'TX-SETTLE-999');
  const p4 = await listPendingRewardClaims();
  assert.ok(!p4.find(r => r.claim_id === 'CLAIM-TEST-2' || r.claimId === 'CLAIM-TEST-2'));
  console.log('[TEST] markRewardClaimSettled: passed');

  console.log('[TEST] reward-persistence: all tests passed');
})();
