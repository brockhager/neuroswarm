import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { register } from 'prom-client';
import { JobQueueService } from './services/job-queue';
import { ValidatorSelectionService, Validator } from './services/validator-selection';
import registry from './services/validator-registry';
import ValidatorStateSync from './services/validator-state-sync';
import { SolanaService } from './services/solana';
import TimeoutMonitor from './services/router-timeout-monitor';
import RefundReconciliationService from './services/refund-reconciliation';
import { anchorAudit } from './services/audit-anchoring';
import AlertingService from './services/alerting';
import crypto from 'crypto';
import { LedgerDB } from './services/ledger-db';
import { authenticate } from './middleware/auth';
import { logger } from './utils/logger';
import { metrics } from './services/metrics';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Middleware for Correlation ID
app.use((req, res, next) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    (req as any).correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
});

// Initialize Services
const jobQueue = new JobQueueService();
const validatorSelection = new ValidatorSelectionService();
const solanaService = new SolanaService();
// Start the router timeout monitor (background worker)
const timeoutMonitor = new TimeoutMonitor(jobQueue);
timeoutMonitor.start();

// Initialize alerting (mock by default) and start refund reconciliation worker
const alerting = new AlertingService();
const refundReconciler = new RefundReconciliationService(jobQueue, solanaService, alerting);
refundReconciler.start();

// Initial API-local set of validators (seed). ValidatorStateSync will keep this registry up-to-date.
const initialValidators: Validator[] = [
    {
        id: 'validator_001',
        endpoint: 'https://validator-1.neuroswarm.io',
        wallet_address: 'Hn7c...',
        stake: 8500,
        reputation: 98,
        latency_ms: 12,
        capacity_used: 2,
        max_capacity: 10,
        last_active: new Date()
    },
    {
        id: 'validator_002',
        endpoint: 'https://validator-2.neuroswarm.io',
        wallet_address: '7m9n...',
        stake: 7200,
        reputation: 95,
        latency_ms: 18,
        capacity_used: 5,
        max_capacity: 8,
        last_active: new Date()
    },
    {
        id: 'validator_003',
        endpoint: 'https://validator-3.neuroswarm.io',
        wallet_address: '3k2j...',
        stake: 6800,
        reputation: 92,
        latency_ms: 22,
        capacity_used: 1,
        max_capacity: 5,
        last_active: new Date()
    }
];

// Seed the registry and start the validator state sync service which keeps registry current
registry.setAll(initialValidators);
const stateSync = new ValidatorStateSync();
stateSync.start();

// --- Endpoints ---

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', version: '1.0.0' });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).send('Could not collect metrics');
    }
});

// Submit Request
app.post('/api/v1/request/submit', async (req: Request, res: Response) => {
    try {
        const { user_wallet, prompt, model, max_tokens, nsd_burned, burn_tx_signature } = req.body;

        // 1. Basic Validation
        if (!user_wallet || !prompt || !model || !max_tokens || !nsd_burned) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 2. Verify Payment (Burn)
        const isPaymentValid = await solanaService.verifyBurnTransaction(burn_tx_signature, nsd_burned);
        if (!isPaymentValid) {
            return res.status(402).json({ error: 'Invalid payment signature' });
        }

        // 3. Persist Job (Queued)
        const job = await jobQueue.createJob(
            user_wallet,
            prompt,
            model,
            max_tokens,
            nsd_burned,
            burn_tx_signature
        );

        // 4. Select Best Validator (from registry)
        const selectedValidator = validatorSelection.selectBestValidator(registry.getAll());

        if (selectedValidator) {
            // 5. Assign Job
            await jobQueue.assignValidator(job.id, selectedValidator.id, selectedValidator.endpoint);

            return res.status(200).json({
                status: 'assigned',
                job_id: job.id,
                validator: {
                    id: selectedValidator.id,
                    endpoint: selectedValidator.endpoint
                }
            });
        } else {
            // No validator available immediately
            return res.status(202).json({
                status: 'queued',
                job_id: job.id,
                message: 'Request queued. No validators currently available.'
            });
        }

    } catch (error) {
        logger.error('Error processing request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Complete Request (Called by Validator)
app.post('/api/v1/request/complete', async (req: Request, res: Response) => {
    try {
        const { jobId, validatorId, inferenceResult, success, feeAmount, userWallet } = req.body;

        // 1. Validate Job Exists & is Assigned to this Validator
        const job = await jobQueue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // In prod: check if job.assigned_validator === validatorId

        // 2. Trigger Fee Distribution on Solana
        // We find the validator's wallet address from our registry (mocked here)
        // Look up validator from the live registry maintained by ValidatorStateSync
        const validator = registry.getById(validatorId);
        const validatorWallet = validator ? validator.wallet_address : 'VALIDATOR_WALLET_PLACEHOLDER';

        const txSignature = await solanaService.triggerFeeDistribution(
            userWallet,
            validatorWallet,
            feeAmount
        );

        // 3. Update Job Status
        await jobQueue.updateJobStatus(jobId, 'completed', inferenceResult);

        // 4. Update Reputation (Async)
        // Reward: +1 score for successful completion
        if (validator) {
            await solanaService.updateValidatorReputation(validatorWallet, validator.reputation + 1);
        }

        return res.status(200).json({
            status: 'completed',
            tx_signature: txSignature
        });

    } catch (error) {
        logger.error('Error completing request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Governance anchoring endpoint
app.post('/api/v1/governance/anchor', async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        if (!payload || !payload.event_type) return res.status(400).json({ error: 'Invalid audit payload: event_type required' });

        const result = await anchorAudit(payload as any);
        return res.status(200).json({ status: 'anchored', audit_hash: result.audit_hash, ipfs_cid: result.ipfs_cid, transaction_signature: result.transaction_signature, governance_notified: result.governance_notified });
    } catch (err) {
        logger.error('Governance anchor failed:', err);
        return res.status(500).json({ error: 'Failed to anchor audit event' });
    }
});

// Initialize Ledger
const ledgerDB = new LedgerDB();

// --- CN-02: Ledger Write Endpoint (Secured) ---
app.post('/api/v1/ledger/write', authenticate('internal_service'), async (req: Request, res: Response) => {
    const correlationId = (req as any).correlationId;
    const reqLogger = logger.child({ correlationId, endpoint: '/api/v1/ledger/write' });
    metrics.ledgerWritesTotal.inc(); // Increment metric

    try {
        const payload = req.body;
        // Basic validation
        if (!payload || !payload.event_type) {
            reqLogger.warn('Invalid payload: event_type required');
            return res.status(400).json({ error: 'Invalid payload: event_type required' });
        }

        // 1. Calculate Deterministic Hash
        const contentHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

        reqLogger.info(`Received audit event: ${payload.event_type}`, { contentHash });

        // 2. Persist to Ledger (Status: RECORDED)
        const entry = await ledgerDB.insert({
            type: 'audit',
            timestamp: new Date().toISOString(),
            payload: payload,
            hash: contentHash,
            anchored: false
        });

        reqLogger.info(`Audit record persisted`, { id: entry.id });

        // 3. Return Success Immediate (Async Anchoring follows)
        res.status(201).json({
            status: 'recorded',
            id: entry.id,
            hash: contentHash,
            message: 'Audit record persisted. Anchoring in progress.'
        });

        // 4. Async Anchoring (Fire and Forget)
        (async () => {
            const traceId = uuidv4();
            const asyncLogger = logger.child({ correlationId, traceId, context: 'AsyncAnchor', entryId: entry.id });

            asyncLogger.info(`Triggering async anchor process`);
            try {
                // anchorAudit logs via console currently, we'll update it next
                const result = await anchorAudit(payload);
                await ledgerDB.updateAnchorStatus(entry.id!, result.ipfs_cid, result.transaction_signature);
                asyncLogger.info(`Anchor complete`, { cid: result.ipfs_cid, tx: result.transaction_signature });
            } catch (err) {
                asyncLogger.error(`Async anchor failed`, err);
            }
        })();

    } catch (err) {
        reqLogger.error('Ledger write failed', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    logger.info(`NeuroSwarm Router API running on port ${port}`, {
        port,
        ledgerInitialized: true,
        secureEndpoints: ['POST /api/v1/ledger/write']
    });
});
