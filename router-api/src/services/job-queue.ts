import { Pool } from 'pg';
import { Counter } from 'prom-client';
import { v4 as uuidv4 } from 'uuid';

export interface Job {
    id: string;
    user_wallet: string;
    prompt: string;
    model: string;
    max_tokens: number;
    nsd_burned: string; // BigInt as string
    burn_tx_signature?: string;
    refund_tx_signature?: string;
    refund_retry_count?: number;
    refund_last_attempt_at?: Date | null;
    refund_alert_count?: number;
    refund_last_alert_at?: Date | null;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'refunded';
    assigned_validator?: string;
    validator_endpoint?: string;
    result?: string;
    error_message?: string;
    retry_count?: number;
    timeout_at?: Date;
    created_at: Date;
}

export class JobQueueService {
    private pool: Pool;

    constructor() {
        // Initialize PG Pool (connection details from env vars)
        // Defensive: trim any accidental whitespace in DATABASE_URL which has
        // appeared in the wild (e.g., trailing space in DB name) and log a
        // masked version for debugging.
        const rawConn = process.env.DATABASE_URL || '';
        const connectionString = rawConn.trim();

        const maskConn = (s = '') => {
            // hide password if present: postgres://user:pass@host:port/db
            try {
                return s.replace(/:(?:[^:@]+)@/, ':***@');
            } catch (e) {
                return s;
            }
        };

        if (rawConn !== connectionString) {
            console.warn('DATABASE_URL contained leading/trailing whitespace — trimmed for safety');
        }

        console.info('Using DATABASE_URL:', maskConn(connectionString));

        this.pool = new Pool({
            connectionString: connectionString || undefined,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Error handling for idle clients
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });

        // Try to perform a quick startup check so we produce clearer diagnostics
        // when the DB doesn't exist (error code 3D000) vs network/auth errors.
        (async () => {
            try {
                const client = await this.pool.connect();
                try {
                    await client.query('SELECT 1');
                    console.info('Postgres connectivity OK (router-api)');
                } finally {
                    client.release();
                }
            } catch (err: any) {
                // 3D000 = invalid_catalog_name (database does not exist)
                if (err && err.code === '3D000') {
                    console.error(`FATAL: Postgres database not found (${err?.message || 'unknown DB'})`);
                    console.error(`Hint: verify the database defined in DATABASE_URL exists (no trailing spaces). Example: 'neuroswarm_router_db_test'`);
                    console.error('If you rely on the local dev helpers, ensure Docker is running and that the postgres container has created the database.');
                    // exit so the operator sees the condition clearly instead of a flood of retries
                    process.exit(1);
                }

                console.error('Postgres connectivity check failed for router-api:', err);
            }
        })();
    }

    // Metrics
    static refundRetriesTotal = new Counter({
        name: 'router_refund_retries_total',
        help: 'Total number of refund retry attempts',
        labelNames: ['jobId']
    });

    static refundAlertsTotal = new Counter({
        name: 'router_refund_alerts_total',
        help: 'Total number of refund alerts sent',
        labelNames: ['jobId']
    });

    /**
     * Creates a new job in the queue.
     */
    async createJob(
        userWallet: string,
        prompt: string,
        model: string,
        maxTokens: number,
        nsdBurned: string,
        burnTxSignature: string
    ): Promise<Job> {
        const id = uuidv4();
        const query = `
      INSERT INTO jobs 
      (id, user_wallet, prompt, model, max_tokens, nsd_burned, burn_tx_signature, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued')
      RETURNING *;
    `;
        const values = [id, userWallet, prompt, model, maxTokens, nsdBurned, burnTxSignature];

        try {
            const res = await this.pool.query(query, values);
            return res.rows[0];
        } catch (err) {
            console.error('Error creating job:', err);
            throw new Error('Failed to persist job');
        }
    }

    /**
     * Assigns a validator to a job and updates status to 'processing'.
     */
    async assignValidator(jobId: string, validatorId: string, endpoint: string): Promise<void> {
        const query = `
      UPDATE jobs 
      SET assigned_validator = $2, validator_endpoint = $3, status = 'processing', started_at = NOW(), timeout_at = NOW() + INTERVAL '60 seconds'
      WHERE id = $1;
    `;
        try {
            await this.pool.query(query, [jobId, validatorId, endpoint]);
        } catch (err) {
            console.error(`Error assigning validator for job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Updates job status (e.g., completed, failed).
     */
    async updateJobStatus(
        jobId: string,
        status: 'completed' | 'failed' | 'refunded',
        result?: string,
        errorMessage?: string
    ): Promise<void> {
        let query = `UPDATE jobs SET status = $2, completed_at = NOW()`;
        const values: any[] = [jobId, status];

        if (result) {
            query += `, result = $3`;
            values.push(result);
        }
        if (errorMessage) {
            query += `, error_message = $${values.length + 1}`;
            values.push(errorMessage);
        }

        query += ` WHERE id = $1`;

        try {
            await this.pool.query(query, values);
        } catch (err) {
            console.error(`Error updating job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Retrieves a job by ID.
     */
    async getJob(jobId: string): Promise<Job | null> {
        const query = `SELECT * FROM jobs WHERE id = $1`;
        try {
            const res = await this.pool.query(query, [jobId]);
            if (res.rows.length > 0) {
                return res.rows[0];
            }
            return null;
        } catch (err) {
            console.error(`Error fetching job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Finds jobs that have timed out (processing > 60s).
     */
    async getTimedOutJobs(): Promise<Job[]> {
        const query = `
      SELECT * FROM jobs 
      WHERE status = 'processing' AND timeout_at < NOW();
    `;
        try {
            const res = await this.pool.query(query);
            return res.rows;
        } catch (err) {
            console.error('Error fetching timed out jobs:', err);
            throw err;
        }
    }

    /**
     * Handle a job failure produced by a validator timeout or explicit failure.
     * This will increment retry_count and either re-queue the job or mark it as refunded
     * depending on the configured retry policy.
     */
    async handleFailure(jobId: string, maxRetries = 3): Promise<Job | null> {
        try {
            // Fetch current job state
            const cur = await this.pool.query(`SELECT * FROM jobs WHERE id=$1 FOR UPDATE`, [jobId]);
            if (cur.rows.length === 0) return null;
            const job = cur.rows[0];

            const currentRetries = job.retry_count || 0;

            if (currentRetries < maxRetries) {
                const nextRetries = currentRetries + 1;
                // Exponential backoff in seconds (60, 120, 240...)
                const delaySeconds = 60 * Math.pow(2, currentRetries);
                const q = `UPDATE jobs SET retry_count = $2, status = 'queued', assigned_validator = NULL, validator_endpoint = NULL, started_at = NULL, timeout_at = NOW() + ($3 || '60 seconds')::interval WHERE id = $1 RETURNING *`;
                const vals = [jobId, nextRetries, `${delaySeconds} seconds`];
                const res = await this.pool.query(q, vals);
                return res.rows[0];
            } else {
                // Exceeded retries -> mark refunded and keep metadata
                const q = `UPDATE jobs SET status = 'refunded', completed_at = NOW() WHERE id = $1 RETURNING *`;
                const res = await this.pool.query(q, [jobId]);
                return res.rows[0];
            }
        } catch (err) {
            console.error(`Error handling failure for job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Persist the refund transaction signature for a job that has been refunded.
     */
    async setRefundSignature(jobId: string, signature: string): Promise<void> {
        try {
            const q = `UPDATE jobs SET refund_tx_signature = $1 WHERE id = $2 AND status = 'refunded'`;
            await this.pool.query(q, [signature, jobId]);
        } catch (err) {
            console.error(`Error persisting refund signature for job ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Increment the refund retry counter for a job and set last attempt timestamp.
     * Returns the updated job row.
     */
    async incrementRefundRetry(jobId: string): Promise<Job | null> {
        try {
            const q = `UPDATE jobs SET refund_retry_count = COALESCE(refund_retry_count, 0) + 1, refund_last_attempt_at = NOW() WHERE id = $1 RETURNING *`;
            const res = await this.pool.query(q, [jobId]);
            if (res.rows.length) {
                try { JobQueueService.refundRetriesTotal.inc({ jobId }, 1); } catch (e) { /* noop */ }
                return res.rows[0];
            }
            return null;
        } catch (err) {
            console.error(`Error incrementing refund retry for ${jobId}:`, err);
            throw err;
        }
    }

    /**
     * Return the most recent refund alert timestamp across jobs (used for aggregated throttling)
     */
    async getMostRecentRefundAlertTimestamp(): Promise<Date | null> {
        try {
            const q = `SELECT MAX(refund_last_alert_at) AS ts FROM jobs WHERE refund_last_alert_at IS NOT NULL`;
            const res = await this.pool.query(q);
            if (res.rows.length && res.rows[0].ts) return res.rows[0].ts;
            return null;
        } catch (err) {
            console.error('Error fetching most recent refund alert timestamp:', err);
            throw err;
        }
    }

    /**
     * Mark the given jobs as having been alerted about refunds (increments per-job alert count and sets timestamp)
     */
    async markJobsAlerted(jobIds: string[]): Promise<void> {
        try {
            const q = `UPDATE jobs SET refund_alert_count = COALESCE(refund_alert_count, 0) + 1, refund_last_alert_at = NOW() WHERE id = ANY($1::uuid[])`;
            await this.pool.query(q, [jobIds]);
            // update metrics
            try {
                for (const id of jobIds) {
                    JobQueueService.refundAlertsTotal.inc({ jobId: id.toString() }, 1);
                }
            } catch (err) {
                // metrics should not break the flow
                console.warn('Failed to increment refund alert metric', err);
            }
        } catch (err) {
            console.error('Error marking jobs as alerted:', err);
            throw err;
        }
    }

    /**
     * Return jobs with status='refunded' but missing a refund_tx_signature (unsigned refunds)
     */
    async getUnsignedRefundJobs(): Promise<Job[]> {
        try {
            const q = `SELECT * FROM jobs WHERE status='refunded' AND (refund_tx_signature IS NULL OR refund_tx_signature = '')`;
            const res = await this.pool.query(q);
            return res.rows;
        } catch (err) {
            console.error('Error fetching unsigned refunded jobs:', err);
            throw err;
        }
    }

    /**
     * Return jobs by status
     */
    async getJobsByStatus(status: 'queued' | 'processing' | 'completed' | 'failed' | 'refunded'): Promise<Job[]> {
        try {
            const q = `SELECT * FROM jobs WHERE status = $1`;
            const res = await this.pool.query(q, [status]);
            return res.rows;
        } catch (err) {
            console.error(`Error fetching jobs by status ${status}:`, err);
            throw err;
        }
    }
}
