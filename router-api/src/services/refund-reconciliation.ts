import { JobQueueService } from './job-queue';
import { SolanaService } from './solana';
import { AlertingService } from './alerting';
import { anchorAudit } from './audit-anchoring';

const RECONCILE_INTERVAL = Number(process.env.REFUND_RECONCILE_INTERVAL || 120);

export class RefundReconciliationService {
    private timer: NodeJS.Timeout | null = null;
    // no in-memory retry/alert state — persisted in DB columns
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
                // Create an audit event for governance anchoring: unsigned refunds are high-risk
                try {
                    const event = {
                        event_type: 'unsigned_refunds',
                        timestamp: new Date().toISOString(),
                        triggering_job_ids: unsigned.map((j: any) => j.id),
                        details: `Detected ${unsigned.length} refunded job(s) without refund_tx_signature`,
                        metadata: { host: process.env.HOSTNAME || null }
                    };

                    const anchorRes = await anchorAudit(event);
                    // Attach anchor info into the details so alerts and logs can reference the anchored hash
                    if (anchorRes && anchorRes.audit_hash) {
                        console.log('[Reconciler] Governance audit anchored with hash:', anchorRes.audit_hash);
                    }
                } catch (err) {
                    console.warn('[Reconciler] Failed to anchor governance audit:', err);
                }

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

        const throttleSeconds = Number(process.env.REFUND_ALERT_THROTTLE_SECONDS || 3600);

        // Determine last alert time globally from jobs table
        try {
            const lastTimestamp = await this.jobQueue.getMostRecentRefundAlertTimestamp();
            if (lastTimestamp) {
                const last = lastTimestamp.getTime();
                const now = Date.now();
                if (now - last < throttleSeconds * 1000) {
                    console.log(`[Reconciler] Skipping alert (throttled) for unsigned refunds (global throttle)`);
                    return;
                }
            }
        } catch (err) {
            console.warn('[Reconciler] Failed to read last alert timestamp from DB - proceeding with alert', err);
        }

        // persist per-job alert metadata (increment counters / set timestamp)
        try {
            await this.jobQueue.markJobsAlerted(jobs.map(j => j.id));
        } catch (err) {
            console.warn('[Reconciler] Failed to persist job alert metadata', err);
        }

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

        // Load the latest job state from the DB to determine retry counters
        let jobState: any;
        try {
            jobState = await this.jobQueue.getJob(job.id);
        } catch (err) {
            console.error('[Reconciler] Failed to fetch job state for retry handling', err);
            return;
        }

        const currentRetries = jobState?.refund_retry_count || 0;
        const lastTriedMs = jobState?.refund_last_attempt_at ? new Date(jobState.refund_last_attempt_at).getTime() : 0;
        const nowMs = Date.now();

        // If we've already exhausted retries -> per-job alert (throttled by refund_last_alert_at)
        if (currentRetries >= maxRetries) {
            const lastAlert = jobState?.refund_last_alert_at ? new Date(jobState.refund_last_alert_at).getTime() : 0;
            const throttleSeconds = Number(process.env.REFUND_ALERT_THROTTLE_SECONDS || 3600);
            if (nowMs - lastAlert >= throttleSeconds * 1000) {
                try {
                    await this.jobQueue.markJobsAlerted([job.id]);
                } catch (err) {
                    console.warn('[Reconciler] Failed to persist per-job alert metadata', err);
                }

                const title = `Refund not confirmed for job ${job.id}`;
                const details = `Refund tx ${job.refund_tx_signature} still unconfirmed after ${currentRetries} retries`;
                if (this.alerts) await this.alerts.dispatchCritical(title, details, ['refund', 'reconciliation']);
                else console.error('[Reconciler] ' + details);
            } else {
                console.log(`[Reconciler] Suppressing per-job alert for ${job.id} until throttle window expires`);
            }
            return;
        }

        // Only retry if the retry interval has passed
        if (nowMs - lastTriedMs < retryInterval * 1000) return;

        // Increment DB-backed retry counter and attempt refund
        try {
            const updated = await this.jobQueue.incrementRefundRetry(job.id);
            const nextAttemptNumber = updated && updated.refund_retry_count ? updated.refund_retry_count : currentRetries + 1;
            console.log(`[Reconciler] Attempting refund retry #${nextAttemptNumber} for job ${job.id}`);

            const amount = job.nsd_burned ? Number(job.nsd_burned) : 0;
            const tx = await this.solana.triggerRefund(job.user_wallet, amount || 0);

            // Persist new signature if available
            try {
                await this.jobQueue.setRefundSignature(job.id, tx);
            } catch (err) {
                console.warn(`[Reconciler] Failed to persist refund signature in retry for job ${job.id}:`, err);
            }

        } catch (err) {
            console.error(`[Reconciler] Refund retry failed for ${job.id}:`, err);
        }
    }
}

export default RefundReconciliationService;
