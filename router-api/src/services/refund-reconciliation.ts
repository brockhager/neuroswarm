import { JobQueueService } from './job-queue';
import { SolanaService } from './solana';
import { AlertingService } from './alerting';

const RECONCILE_INTERVAL = Number(process.env.REFUND_RECONCILE_INTERVAL || 120);

export class RefundReconciliationService {
    private timer: NodeJS.Timeout | null = null;
    // Throttle map for alerts: key -> lastSentTimestamp (ms)
    private lastAlertTs: Map<string, number> = new Map();
    // Retry tracking for refund attempts: jobId -> { count, lastTriedTs }
    private refundRetries: Map<string, { count: number; lastTried: number }> = new Map();
    private jobQueue: JobQueueService;
    private solana: SolanaService;
    private alerts: AlertingService | null;

    constructor(jobQueue?: JobQueueService, solana?: SolanaService, alerts?: AlertingService) {
        this.jobQueue = jobQueue || new JobQueueService();
        this.solana = solana || new SolanaService();
        this.alerts = alerts || null;
        console.log(`[Reconciler] Initialized (interval=${RECONCILE_INTERVAL}s)`);
    }

    public start() {
        if (this.timer) return;
        this.tick().catch(e => console.error('[Reconciler] initial tick failed', e));
        this.timer = setInterval(() => this.tick().catch(e => console.error('[Reconciler] periodic tick failed', e)), RECONCILE_INTERVAL * 1000);
    }

    public stop() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    private async tick() {
        try {
            console.log(`[Reconciler] Reconciling refunds at ${new Date().toISOString()}`);

            // 1) Jobs marked refunded with no refund_tx_signature -> critical alert (throttled)
            const unsigned = await this.jobQueue.getUnsignedRefundJobs();
            if (unsigned && unsigned.length) {
                await this.alertCriticalFailure(unsigned);
            }

            // 2) Jobs with signature but not confirmed: verify on-chain
            const refunded = await this.jobQueue.getJobsByStatus('refunded');
            for (const j of refunded) {
                const sig = (j as any).refund_tx_signature;
                if (!sig) continue; // already handled above

                try {
                    const confirmed = await this.solana.checkTransactionConfirmation(sig);
                    if (confirmed) {
                        console.log(`[Reconciler] Confirmed refund for job ${j.id} tx=${sig.substring(0,8)}...`);
                        await this.jobQueue.updateJobStatus(j.id, 'refunded', 'CONFIRMED');
                    } else {
                        console.log(`[Reconciler] Refund pending for job ${j.id} tx=${sig.substring(0,8)}...`);
                        // 3) If not confirmed, attempt auto-retry up to configured limit
                        await this.handlePendingRefund(j as any);
                    }
                } catch (err) {
                    console.error(`[Reconciler] Error verifying ${sig} for job ${j.id}:`, err);
                }
            }

        } catch (err) {
            console.error('[Reconciler] Fatal error during reconciliation:', err);
        }
    }

    private async alertCriticalFailure(jobs: any[]) {
        const ids = jobs.map(j => j.id).join(', ');
        const title = `Unsigned refunded jobs (${jobs.length})`;
        const details = `Jobs marked 'refunded' but missing refund_tx_signature: ${ids}`;

        const now = Date.now();
        const globalKey = 'unsigned_refunds';
        const throttleSeconds = Number(process.env.REFUND_ALERT_THROTTLE_SECONDS || 3600);

        const last = this.lastAlertTs.get(globalKey) || 0;
        if (now - last < throttleSeconds * 1000) {
            console.log(`[Reconciler] Skipping alert (throttled) for unsigned refunds: next allowed in ${Math.ceil((throttleSeconds*1000 - (now-last))/1000)}s`);
            return;
        }

        this.lastAlertTs.set(globalKey, now);

        if (this.alerts) {
            try {
                await this.alerts.dispatchCritical(title, details, ['refund', 'reconciliation']);
                return;
            } catch (err) {
                console.error('[Reconciler] Alert dispatch failed', err);
            }
        }

        // Fallback logging
        console.error('\n================== REFUND ALERT ==================');
        console.error(`CRITICAL: ${jobs.length} refunded jobs with no tx signature: ${ids}`);
        console.error('================================================\n');
    }

    private async handlePendingRefund(job: any) {
        const maxRetries = Number(process.env.REFUND_RETRY_MAX || 3);
        const retryInterval = Number(process.env.REFUND_RETRY_INTERVAL_SECONDS || 300);
        const now = Date.now();

        const state = this.refundRetries.get(job.id) || { count: 0, lastTried: 0 };

        // If we've already exhausted retries, throttle per-job critical alerts
        if (state.count >= maxRetries) {
            const jobKey = `job_alert_${job.id}`;
            const throttleSeconds = Number(process.env.REFUND_ALERT_THROTTLE_SECONDS || 3600);
            const last = this.lastAlertTs.get(jobKey) || 0;
            if (now - last >= throttleSeconds * 1000) {
                this.lastAlertTs.set(jobKey, now);
                const title = `Refund not confirmed for job ${job.id}`;
                const details = `Refund tx ${job.refund_tx_signature} still unconfirmed after ${state.count} retries`;
                if (this.alerts) await this.alerts.dispatchCritical(title, details, ['refund', 'reconciliation']);
                else console.error('[Reconciler] ' + details);
            } else {
                console.log(`[Reconciler] Suppressing per-job alert for ${job.id} until throttle window expires`);
            }
            return;
        }

        // Only retry if the retry interval has passed
        if (now - state.lastTried < retryInterval * 1000) return;

        // Attempt to re-submit a refund (best-effort). If job contains nsd_burned and user_wallet use them.
        try {
            console.log(`[Reconciler] Attempting refund retry #${state.count + 1} for job ${job.id}`);
            const amount = job.nsd_burned ? Number(job.nsd_burned) : undefined;
            const tx = await this.solana.triggerRefund(job.user_wallet, amount || 0);

            // Persist new signature if available
            try {
                await this.jobQueue.setRefundSignature(job.id, tx);
            } catch (err) {
                console.warn(`[Reconciler] Failed to persist refund signature in retry for job ${job.id}:`, err);
            }

            // update state
            this.refundRetries.set(job.id, { count: state.count + 1, lastTried: now });
        } catch (err) {
            console.error(`[Reconciler] Refund retry failed for ${job.id}:`, err);
            this.refundRetries.set(job.id, { count: state.count + 1, lastTried: now });
        }
    }
}

export default RefundReconciliationService;
