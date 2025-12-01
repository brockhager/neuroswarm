import { JobQueueService } from './job-queue';
import { SolanaService } from './solana';

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
            console.log(`[Monitor] Executing mock refund for job ${job.id} to ${job.user_wallet} for ${job.nsd_burned} nsd`);
            // Keep the refund logic mock for now; in future call a proper Solana refund instruction
            // const tx = await solanaService.triggerRefund(job.user_wallet, job.nsd_burned);
            console.log(`[Monitor] Refund simulated for job ${job.id}`);
        } catch (err) {
            console.error(`[Monitor] Failed to execute refund for ${job.id}:`, err);
            // TODO: escalate (alerting / durable audit)
        }
    }
}

export default TimeoutMonitor;
