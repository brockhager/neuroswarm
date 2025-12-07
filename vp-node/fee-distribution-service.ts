import crypto from 'crypto';
import { submitRewardClaim as submitToNsNode } from './ns-node-client.js';
import {
  persistRewardClaim,
  markRewardClaimSubmitted,
  markRewardClaimFailed,
} from './reward-claims-db-service.js';

// --- MOCK CONSTANTS & CONFIGURATION ---

export const FEE_SPLIT_PERCENTAGES = {
  PRODUCER_SHARE: 0.60, // Direct reward to the validator who produced the block/job
  STAKE_POOL_SHARE: 0.30, // Reward distributed to all delegators/stakers in the pool
  NETWORK_FUND_SHARE: 0.10, // Share sent to the governance/network development fund
} as const;

interface JobResult {
  producerId: string;
  jobFeeAmount: number; // Total fee paid by the user for this job
  jobCompletionHeight: number;
}

export interface FeeAllocation {
  producerId: string;
  producerReward: number;
  stakePoolReward: number;
  networkFundShare: number;
  totalAmount: number; // Should equal jobFeeAmount
}

/**
 * Calculates the exact split of the job fee according to governance percentages.
 */
export function calculateFeeSplit(jobResult: JobResult): FeeAllocation {
  const { producerId, jobFeeAmount } = jobResult;

  const producerReward = jobFeeAmount * FEE_SPLIT_PERCENTAGES.PRODUCER_SHARE;
  const stakePoolReward = jobFeeAmount * FEE_SPLIT_PERCENTAGES.STAKE_POOL_SHARE;
  const networkFundShare = jobFeeAmount * FEE_SPLIT_PERCENTAGES.NETWORK_FUND_SHARE;

  // Ensure total is correctly accounted for (minor floating point adjustment tolerated)
  const totalAmount = producerReward + stakePoolReward + networkFundShare;

  if (Math.abs(totalAmount - jobFeeAmount) > 0.001) {
    console.warn(
      `[Fee Split Warning] Total calculated fees (${totalAmount.toFixed(4)}) do not match job fee (${jobFeeAmount}).`
    );
  }

  return {
    producerId,
    producerReward: parseFloat(producerReward.toFixed(4)),
    stakePoolReward: parseFloat(stakePoolReward.toFixed(4)),
    networkFundShare: parseFloat(networkFundShare.toFixed(4)),
    totalAmount: parseFloat(jobFeeAmount.toFixed(4)),
  };
}

/**
 * Submits the fee allocation data as a reward claim to the NS-Node for on-chain settlement.
 * Uses the ns-node-client abstraction so it benefits from its retry/timeouts and auth handling.
 */
export async function submitRewardClaim(allocation: FeeAllocation): Promise<{ claimId: string; settlementTxHash?: string } | null> {
  console.log(`[Fee Service] Attempting to submit reward claim for Producer: ${allocation.producerId}`);

  const claimPayload = {
    claimId: `CLAIM-${crypto.randomBytes(8).toString('hex')}`,
    timestamp: new Date().toISOString(),
    allocation: allocation,
    // VP-Node should sign this payload in production; tests use a mock signature
    validatorSignature: `SIG-CLAIM-MOCK-${allocation.producerId}`,
  } as const;

  // Persist claim immediately so we can recover/retry if the process dies before submission.
  await persistRewardClaim({
    claimId: claimPayload.claimId,
    producerId: allocation.producerId,
    allocation: allocation,
    status: 'PENDING',
    txHash: null,
  });

  try {
    const result = await submitToNsNode({ type: 'reward-claim', payload: claimPayload });

    console.log(`[Fee Service SUCCESS] Reward claim ${claimPayload.claimId} submitted.`);
    if (result?.txHash) {
      console.log(`[Fee Service LEDGER] Settlement queued: ${result.txHash}`);
      await markRewardClaimSubmitted(claimPayload.claimId, result.txHash);
    } else {
      await markRewardClaimSubmitted(claimPayload.claimId, undefined);
    }

    return { claimId: claimPayload.claimId, settlementTxHash: result?.txHash };
  } catch (err) {
    console.error(
      `[Fee Service FAILURE] Failed to submit reward claim for ${allocation.producerId}: ${err instanceof Error ? err.message : String(err)}`
    );
    await markRewardClaimFailed(claimPayload.claimId, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Primary external function to be called after a job result has been validated.
 */
export async function processJobFeeSettlement(jobResult: JobResult): Promise<void> {
  console.log(`\n[Fee Settlement] Processing fee for Job at Height ${jobResult.jobCompletionHeight}`);

  const allocation = calculateFeeSplit(jobResult);

  console.log('--- Fee Allocation Breakdown ---');
  console.log(`Producer (${allocation.producerId}): ${allocation.producerReward.toFixed(4)}`);
  console.log(`Stake Pool: ${allocation.stakePoolReward.toFixed(4)}`);
  console.log(`Network Fund: ${allocation.networkFundShare.toFixed(4)}`);
  console.log(`Total: ${allocation.totalAmount.toFixed(4)}`);

  await submitRewardClaim(allocation);
}

// Simple simulation helper used by maintainers locally (not executed during tests unless imported and run)
export async function runFeeDistributionSimulation() {
  console.log('\n*** SIMULATION: Validator Fee Distribution (CN-08-A) ***');

  const successfulJob: JobResult = {
    producerId: 'V-PRODUCER-A-01',
    jobFeeAmount: 100.0,
    jobCompletionHeight: 5020,
  };

  await processJobFeeSettlement(successfulJob);

  const smallJob: JobResult = {
    producerId: 'V-PRODUCER-B-02',
    jobFeeAmount: 12.55,
    jobCompletionHeight: 5021,
  };

  await processJobFeeSettlement(smallJob);

  console.log('\n*** SIMULATION COMPLETE ***');
}

export default { calculateFeeSplit, submitRewardClaim, processJobFeeSettlement };
