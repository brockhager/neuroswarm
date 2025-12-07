import { listPendingRewardClaims, markRewardClaimSubmitted, markRewardClaimFailed } from './reward-claims-db-service.js';
import { submitRewardClaim as submitToNs } from './ns-node-client.js';
import { dispatchAlert } from './alerting-service.js';

// --- CONFIGURATION ---
const WORKER_INTERVAL_MS = Number(process.env.VP_CLAIM_REQUEUE_INTERVAL_MS || 60_000);
const MAX_SUBMISSION_ATTEMPTS = Number(process.env.VP_CLAIM_MAX_ATTEMPTS || 10);
const INITIAL_BACKOFF_MS = Number(process.env.VP_CLAIM_INITIAL_BACKOFF_MS || 5_000);

// --- BACKOFF LOGIC ---
function getExponentialBackoffDelay(attempts: number): number {
  if (attempts <= 1) return 0;
  const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempts - 2);
  return Math.min(delay, 3_600_000); // cap 1 hour
}

function normalizeClaim(record: any) {
  // Normalize DB row shapes: sqlite returns snake_case columns, the in-memory store uses camelCase
  const claimId = record.claimId || record.claim_id;
  const status = record.status;
  const attempts = Number(record.attempts ?? record.attempt_count ?? 0);
  const lastAttemptTimestamp = record.lastAttemptTimestamp || record.last_attempt_timestamp || record.last_attempt || record.updatedAt || record.updated_at || null;
  let allocation = record.allocation || record.alloc || null;
  if (allocation && typeof allocation === 'string') {
    try { allocation = JSON.parse(allocation); } catch { /* leave as string */ }
  }

  return { claimId, status, attempts, lastAttemptTimestamp, allocation };
}

export async function processClaim(record: any): Promise<void> {
  const { claimId, attempts, lastAttemptTimestamp, allocation } = normalizeClaim(record);
  if (!claimId) return;

  const requiredDelay = getExponentialBackoffDelay(attempts ?? 0);
  const lastAttempt = lastAttemptTimestamp ? new Date(lastAttemptTimestamp).getTime() : 0;
  const timeSinceLast = Date.now() - lastAttempt;

  if (timeSinceLast < requiredDelay) {
    console.log(`[Requeue] claim=${claimId} skipping; backoff requires ${requiredDelay}ms; waited ${timeSinceLast}ms`);
    return;
  }

  if ((attempts ?? 0) >= MAX_SUBMISSION_ATTEMPTS) {
    console.error(`[Requeue CRITICAL] claim=${claimId} exceeded max attempts=${MAX_SUBMISSION_ATTEMPTS}`);
    await dispatchAlert({
      source: 'VP-Node:ClaimRequeue',
      level: 'CRITICAL',
      title: 'Claim exceeded max retry attempts',
      description: `Claim ${claimId} has exceeded ${MAX_SUBMISSION_ATTEMPTS} attempts and requires manual review.`,
      details: { claimId, attempts },
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    return;
  }

  try {
    console.log(`[Requeue] Attempting submission for claim=${claimId} attempt=${(attempts ?? 0) + 1}`);

    const payload = {
      claimId,
      timestamp: new Date().toISOString(),
      allocation,
      validatorSignature: `SIG-CLAIM-MOCK-${allocation?.producerId ?? allocation?.producer_id ?? 'unknown'}`,
    };

    const res = await submitToNs({ type: 'reward-claim', payload });

    // Mark as submitted and record txHash when available
    await markRewardClaimSubmitted(claimId, res?.txHash ?? undefined);
    console.log(`[Requeue SUCCESS] claim=${claimId} submitted tx=${res?.txHash ?? '<unknown>'}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markRewardClaimFailed(claimId, message).catch(() => {});
    console.warn(`[Requeue FAIL] claim=${claimId} failed: ${message}`);
  }
}

async function runRequeueWorkerCycle(): Promise<void> {
  console.log(`\n--- Claim Requeue Worker cycle start (${new Date().toISOString()}) ---`);
  try {
    const rows = await listPendingRewardClaims();
    if (!rows || rows.length === 0) {
      console.log('[Requeue] no claims to process');
      return;
    }

    console.log(`[Requeue] processing ${rows.length} claims`);
    // Concurrency controlled in production; for prototype do all concurrently
    await Promise.all(rows.map((r) => processClaim(r)));
  } catch (err) {
    console.error(`[Requeue CRITICAL] worker cycle failed: ${err instanceof Error ? err.message : String(err)}`);
    await dispatchAlert({
      source: 'VP-Node:ClaimRequeue',
      level: 'CRITICAL',
      title: 'Requeue worker error',
      description: 'Claim requeue worker encountered an error',
      details: { error: err instanceof Error ? err.message : String(err) },
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } finally {
    console.log('--- Claim Requeue Worker cycle complete ---');
  }
}

let workerTimer: NodeJS.Timeout | null = null;

export function startRequeueWorker(): void {
  if (workerTimer) return;
  console.log('[Requeue] starting worker');
  workerTimer = setInterval(runRequeueWorkerCycle, WORKER_INTERVAL_MS);
  // run immediately
  void runRequeueWorkerCycle();
}

export function stopRequeueWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

// Simulation when executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('claim-requeue-worker.ts')) {
  (async () => {
    process.env.VP_NODE_TEST_MOCK_NS_CLIENT = 'true';
    console.log('Simulating a single requeue worker cycle (mock mode)');
    await runRequeueWorkerCycle();
  })();
}

export { runRequeueWorkerCycle };

export default { startRequeueWorker, stopRequeueWorker, runRequeueWorkerCycle, processClaim };
