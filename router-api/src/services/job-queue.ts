import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface Job {
    id: string;
    user_wallet: string;
    prompt: string;
    model: string;
    max_tokens: number;
    nsd_burned: string; // BigInt as string
    burn_tx_signature?: string;
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
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Error handling for idle clients
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }

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
