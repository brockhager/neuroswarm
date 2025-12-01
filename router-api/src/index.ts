import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { JobQueueService } from './services/job-queue';
import { ValidatorSelectionService, Validator } from './services/validator-selection';
import registry from './services/validator-registry';
import ValidatorStateSync from './services/validator-state-sync';
import { SolanaService } from './services/solana';
import TimeoutMonitor from './services/router-timeout-monitor';
import RefundReconciliationService from './services/refund-reconciliation';
import AlertingService from './services/alerting';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
        console.error('Error processing request:', error);
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
        console.error('Error completing request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`NeuroSwarm Router API running on port ${port}`);
});
