import { JobQueueService } from './job-queue';
import { SolanaService } from './solana';
import fs from 'fs';
import path from 'path';

const MONITOR_INTERVAL_SECONDS = Number(process.env.ROUTER_MONITOR_INTERVAL || 30);
const MAX_RETRIES = Number(process.env.ROUTER_MAX_RETRIES || 3);

const solanaService = new SolanaService();

export class TimeoutMonitor {
    private jobQueueService: JobQueueService;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor(jobQueueService: JobQueueService) {
        this.jobQueueService = jobQueueService;
        console.log(`[Monitor] Timeout Monitor initialized. Scanning every ${MONITOR_INTERVAL_SECONDS} seconds.`);
    }

    public start() {
        if (this.monitorInterval) {
            console.warn('[Monitor] Timeout Monitor already running');
            return;
        }

        // Run immediately, then periodically
        this.checkTimeouts().catch(err => console.error('[Monitor] initial check failed', err));
        this.monitorInterval = setInterval(() => this.checkTimeouts().catch(err => console.error('[Monitor] periodic check failed', err)), MONITOR_INTERVAL_SECONDS * 1000);
    }

    public stop() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            console.log('[Monitor] Timeout Monitor stopped');
        }
    }

    private async checkTimeouts() {
        try {
            const timedOut = await this.jobQueueService.getTimedOutJobs();
            if (!timedOut || timedOut.length === 0) return;

            console.warn(`[Monitor] Found ${timedOut.length} timed-out job(s)`);

            for (const job of timedOut) {
                console.log(`[Monitor] Handling timeout for job ${job.id} (retries=${job.retry_count || 0})`);

                const updated = await this.jobQueueService.handleFailure(job.id, MAX_RETRIES);

                if (updated && updated.status === 'refunded') {
                    // Execute refund flow -- mock / safe callpoint
                    await this.executeRefund(updated);
                } else if (updated) {
                    console.log(`[Monitor] Job ${job.id} re-queued (retry_count=${updated.retry_count})`);
                }
            }

        } catch (err) {
            console.error('[Monitor] Failed to check timeouts:', err);
        }
    }

    private async executeRefund(job: any) {
        try {
            console.log(`[Monitor] Executing refund for job ${job.id} to ${job.user_wallet} for ${job.nsd_burned} nsd`);

            // Ensure logs directory exists
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

            // Attempt actual refund via SolanaService
            const txSig = await solanaService.triggerRefund(job.user_wallet, Number(job.nsd_burned));

            // Persist refund signature in DB (durable single source of truth)
            try {
                await this.jobQueueService.setRefundSignature(job.id, txSig);
            } catch (err) {
                console.warn(`[Monitor] Failed to persist refund signature for job ${job.id}:`, err);
            }

            // Write an audit entry for the refund (durable JSONL)
            const auditEntry = {
                timestamp: new Date().toISOString(),
                action: 'refund_executed',
                jobId: job.id,
                userWallet: job.user_wallet,
                amount: job.nsd_burned,
                txSignature: txSig,
                status: txSig && String(txSig).startsWith('mock_refund_error') ? 'failed' : 'success'
            };

            const outPath = path.join(logsDir, 'refunds.jsonl');
            fs.appendFileSync(outPath, JSON.stringify(auditEntry) + '\n', { encoding: 'utf8' });

            console.log(`[Monitor] Refund recorded for job ${job.id} tx=${txSig}`);
        } catch (err) {
            console.error(`[Monitor] Failed to execute refund for ${job.id}:`, err);
            // TODO: escalate (alerting / durable audit)
        }
    }
}

export default TimeoutMonitor;
