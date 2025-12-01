# Decentralized Router API Specification
## Core Orchestration Service for NeuroSwarm LLM Network

> **Purpose**: The Router API is the central coordination service that manages validator registration, processes user requests, executes the validator selection algorithm, and orchestrates the complete job lifecycle including fee distribution and failure handling.

---

## Overview

**Service Type:** High-availability REST API  
**Language:** TypeScript/Node.js  
**Database:** PostgreSQL (validator registry, job state)  
**Cache:** Redis (health metrics, reputation scores)  
**Message Queue:** Redis (request queue, retry queue)

**Key Responsibilities:**
1. User request ingestion and NSD burn validation
2. Validator pool management (max 150 validators)
3. Intelligent request routing via priority algorithm
4. Job lifecycle management (timeout, retry, completion)
5. Fee distribution orchestration
6. Reputation tracking and slashing

---

## 1. Core Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Decentralized Router API                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             A. Endpoint Layer                         │   │
│  │  (User-Facing & Validator-Facing HTTP Routes)        │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │         B. Job Orchestration Layer                    │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐ ┌─────────────┐ │   │
│  │  │   Request    │  │   Timeout    │ │     Fee     │ │   │
│  │  │    Queue     │  │   Tracker    │ │ Distributor │ │   │
│  │  └──────────────┘  └──────────────┘ └─────────────┘ │   │
│  └────────────────┬─────────────────────────────────────┘   │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐   │
│  │        C. Validator Management Layer                  │   │
│  │                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐ ┌─────────────┐ │   │
│  │  │  Reputation  │  │    Health    │ │  Selection  │ │   │
│  │  │   Database   │  │    Cache     │ │  Algorithm  │ │   │
│  │  └──────────────┘  └──────────────┘ └─────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  External Dependencies:                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   NSD        │  │  PostgreSQL  │  │    Redis     │      │
│  │  Contract    │  │   Database   │  │    Cache     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. API Endpoint Specification

### A. User-Facing Endpoints (Gateway Interface)

#### 2.1 Submit LLM Request

**Endpoint:** `POST /api/v1/request/submit`  
**Purpose:** Initiate a new LLM inference job

**Request:**
```json
{
  "user_wallet": "Hn7cVqz9K3fXd2pQx...",
  "prompt": "Explain quantum entanglement",
  "model_id": "llama-2-7b-q4",
  "max_tokens": 500,
  "temperature": 0.7,
  "nsd_fee_amount": 55000000,  // micro-NSD (55 NSD)
  "burn_tx_signature": "3k2j9f7h...",  // NSD burn transaction
  "signature": "user_signature_base64"
}
```

**Response 202 Accepted:**
```json
{
  "job_id": "job_a1b2c3d4",
  "status": "queued",
  "nsd_burned": 55000000,
  "estimated_wait_seconds": 5,
  "assigned_validator": null,  // Assigned after routing
  "created_at": 1701390000
}
```

**Error Responses:**
- `400 Bad Request`: Invalid parameters or insufficient NSD
- `404 Not Found`: Model not supported
- `503 Service Unavailable`: No validators available

**Implementation:**
```typescript
async function submitRequest(req: Request, res: Response) {
  // 1. Validate signature
  const isValid = await validateUserSignature(
    req.body.signature,
    req.body.user_wallet
  );
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 2. Verify NSD burn transaction
  const burnTx = await solanaClient.getTransaction(req.body.burn_tx_signature);
  if (!burnTx || burnTx.meta?.err) {
    return res.status(400).json({ error: 'Invalid burn transaction' });
  }
  
  // 3. Create job record
  const job = await db.jobs.create({
    id: generateJobId(),
    user_wallet: req.body.user_wallet,
    prompt: req.body.prompt,
    model_id: req.body.model_id,
    max_tokens: req.body.max_tokens,
    temperature: req.body.temperature,
    nsd_burned: req.body.nsd_fee_amount,
    burn_tx_signature: req.body.burn_tx_signature,
    status: 'queued',
    created_at: Date.now(),
    timeout_at: Date.now() + 60000  // 60 second timeout
  });
  
  // 4. Push to request queue
  await redis.rpush('request_queue', JSON.stringify(job));
  
  // 5. Trigger routing (async)
  processQueue();
  
  return res.status(202).json({
    job_id: job.id,
    status: 'queued',
    nsd_burned: job.nsd_burned,
    estimated_wait_seconds: 5
  });
}
```

---

#### 2.2 Check Job Status

**Endpoint:** `GET /api/v1/request/status/:job_id`  
**Purpose:** Poll job status and retrieve result

**Response 200 OK (Completed):**
```json
{
  "job_id": "job_a1b2c3d4",
  "status": "completed",
  "result": "Quantum entanglement is a phenomenon...",
  "tokens_used": 487,
  "validator": "validator_xyz",
  "response_time_ms": 12450,
  "completed_at": 1701390012
}
```

**Response 200 OK (Processing):**
```json
{
  "job_id": "job_a1b2c3d4",
  "status": "processing",
  "assigned_validator": "validator_xyz",
  "started_at": 1701390005
}
```

**Response 200 OK (Failed/Refunded):**
```json
{
  "job_id": "job_a1b2c3d4",
  "status": "refunded",
  "error": "Validator timeout",
  "refund_amount": 52250000,  // 95% of 55 NSD
  "refund_tx_signature": "7m9n2k4..."
}
```

---

### B. Validator-Facing Endpoints

#### 2.3 Register Validator

**Endpoint:** `POST /api/v1/validator/register`  
**Purpose:** Initial registration and model declaration

**Request:**
```json
{
  "validator_pubkey": "9sKJk2Lx4pFn...",
  "available_models": ["gpt2-q4", "llama-2-7b-q4"],
  "max_capacity": 5,  // Concurrent jobs
  "endpoint": "https://validator.example.com",
  "nst_stake_tx": "5j8k7n9...",  // NST stake proof
  "signature": "validator_signature_base64"
}
```

**Response 201 Created:**
```json
{
  "validator_id": "val_abc123",
  "status": "registered",
  "reputation": 100,  // Starting score
  "registered_at": 1701390000
}
```

**Implementation:**
```typescript
async function registerValidator(req: Request, res: Response) {
  // 1. Verify stake transaction
  const stakeTx = await verifyNSTStake(
    req.body.validator_pubkey,
    req.body.nst_stake_tx
  );
  if (!stakeTx || stakeTx.amount < MIN_VALIDATOR_STAKE) {
    return res.status(400).json({ error: 'Insufficient stake' });
  }
  
  // 2. Create validator record
  const validator = await db.validators.create({
    id: generateValidatorId(),
    pubkey: req.body.validator_pubkey,
    models: req.body.available_models,
    max_capacity: req.body.max_capacity,
    endpoint: req.body.endpoint,
    stake_amount: stakeTx.amount,
    reputation: 100,
    total_jobs: 0,
    successful_jobs: 0,
    is_active: true,
    registered_at: Date.now()
  });
  
  // 3. Initialize health cache
  await redis.hset(`validator:${validator.id}:health`, {
    latency_ms: 0,
    cpu_load: 0,
    current_load: 0,
    last_seen: Date.now()
  });
  
  return res.status(201).json({
    validator_id: validator.id,
    status: 'registered',
    reputation: validator.reputation
  });
}
```

---

#### 2.4 Listen for Jobs (Long-Poll)

**Endpoint:** `POST /api/v1/validator/listen`  
**Purpose:** Long-poll request for job assignment

**Request:**
```json
{
  "validator_id": "val_abc123",
  "timeout_seconds": 30
}
```

**Response 200 OK (Job Assigned):**
```json
{
  "job_id": "job_a1b2c3d4",
  "user_wallet": "Hn7cVqz9K3fXd2pQx...",
  "prompt": "Explain quantum entanglement",
  "model_id": "llama-2-7b-q4",
  "max_tokens": 500,
  "temperature": 0.7,
  "assigned_at": 1701390005
}
```

**Response 204 No Content (Timeout):**
```
(No job available within timeout window)
```

**Implementation:**
```typescript
async function validatorListen(req: Request, res: Response) {
  const { validator_id, timeout_seconds } = req.body;
  const startTime = Date.now();
  const maxWait = timeout_seconds * 1000;
  
  // Poll with exponential backoff
  while (Date.now() - startTime < maxWait) {
    // Check if this validator has an assigned job
    const assignedJob = await redis.get(`assigned:${validator_id}`);
    
    if (assignedJob) {
      const job = JSON.parse(assignedJob);
      
      // Update job status to 'processing'
      await db.jobs.update(job.id, { 
        status: 'processing',
        assigned_validator: validator_id,
        started_at: Date.now()
      });
      
      // Remove from assigned cache
      await redis.del(`assigned:${validator_id}`);
      
      return res.status(200).json(job);
    }
    
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms
    const backoff = Math.min(100 * Math.pow(2, Date.now() - startTime / 1000), 1000);
    await sleep(backoff);
  }
  
  // Timeout - no job available
  return res.status(204).send();
}
```

---

#### 2.5 Report Health

**Endpoint:** `POST /api/v1/validator/report/health`  
**Purpose:** Real-time reporting of validator metrics

**Request:**
```json
{
  "validator_id": "val_abc123",
  "latency_ms": 45,
  "cpu_load": 35.5,
  "vram_usage": 8192,  // MB
  "current_load": 2,  // Active jobs
  "success_rate": 98.5,
  "timestamp": 1701390000
}
```

**Response 200 OK:**
```json
{
  "status": "updated",
  "reputation": 95,
  "priority_score": 87.3
}
```

**Implementation:**
```typescript
async function reportHealth(req: Request, res: Response) {
  const { validator_id, latency_ms, cpu_load, current_load, success_rate } = req.body;
  
  // 1. Update health cache
  await redis.hset(`validator:${validator_id}:health`, {
    latency_ms,
    cpu_load,
    current_load,
    success_rate,
    last_seen: Date.now()
  });
  
  // 2. Calculate current priority score
  const validator = await db.validators.findOne({ id: validator_id });
  const priorityScore = calculatePriorityScore(validator, {
    latency_ms,
    current_load
  });
  
  return res.status(200).json({
    status: 'updated',
    reputation: validator.reputation,
    priority_score: priorityScore
  });
}
```

---

#### 2.6 Complete Job

**Endpoint:** `POST /api/v1/request/complete`  
**Purpose:** Report successful job execution

**Request:**
```json
{
  "job_id": "job_a1b2c3d4",
  "validator_id": "val_abc123",
  "result_data": "Quantum entanglement is...",
  "tokens_used": 487,
  "proof_hash": "sha256_hash_of_execution",
  "signature": "validator_signature_base64"
}
```

**Response 200 OK:**
```json
{
  "status": "completed",
  "fee_distributed": true,
  "validator_fee_nsd": 38500000,  // 70% of 55 NSD
  "fee_tx_signature": "8k3m7n2..."
}
```

**Implementation:**
```typescript
async function completeJob(req: Request, res: Response) {
  const { job_id, validator_id, result_data, tokens_used } = req.body;
  
  // 1. Verify job assignment
  const job = await db.jobs.findOne({ id: job_id });
  if (job.assigned_validator !== validator_id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // 2. Update job status
  await db.jobs.update(job_id, {
    status: 'completed',
    result: result_data,
    tokens_used,
    completed_at: Date.now()
  });
  
  // 3. Call NSD contract to distribute fees
  const feeTx = await callCompleteRequestInstruction(job_id, validator_id);
  
  // 4. Update validator stats
  await db.validators.update(validator_id, {
    total_jobs: db.raw('total_jobs + 1'),
    successful_jobs: db.raw('successful_jobs + 1')
  });
  
  // 5. Update reputation (success +1)
  await updateReputation(validator_id, 'success');
  
  return res.status(200).json({
    status: 'completed',
    fee_distributed: true,
    validator_fee_nsd: job.nsd_burned * 0.7,
    fee_tx_signature: feeTx.signature
  });
}
```

---

#### 2.7 Report Failure

**Endpoint:** `POST /api/v1/request/fail`  
**Purpose:** Report job failure (triggers retry/refund)

**Request:**
```json
{
  "job_id": "job_a1b2c3d4",
  "validator_id": "val_abc123",
  "error_code": "TIMEOUT",
  "error_message": "Model inference timeout",
  "signature": "validator_signature_base64"
}
```

**Response 200 OK:**
```json
{
  "status": "retry_queued",  // or "refunded" if max retries
  "retry_attempt": 1,
  "reputation_penalty": -10
}
```

---

## 3. Core Logic: Validator Selection Algorithm

### Priority Score Calculation

**Formula:**
```
Priority Score = (0.4 × Stake) + (0.3 × Reputation) + (0.2 × Capacity) + (0.1 × Speed⁻¹)
```

**Implementation:**
```typescript
function calculatePriorityScore(
  validator: Validator,
  health: HealthMetrics
): number {
  // Normalize stake (0-100 scale based on max stake)
  const stakeScore = Math.min((validator.stake_amount / MAX_STAKE) * 100, 100);
  
  // Reputation is already 0-100
  const reputationScore = validator.reputation;
  
  // Capacity: percentage of available slots
  const capacityScore = ((validator.max_capacity - health.current_load) / validator.max_capacity) * 100;
  
  // Speed: inverse of latency (normalize to 0-100)
  const speedScore = Math.max(0, 100 - (health.latency_ms / 10));
  
  // Weighted sum
  return (
    stakeScore * 0.4 +
    reputationScore * 0.3 +
    capacityScore * 0.2 +
    speedScore * 0.1
  );
}
```

### Validator Selection Process

```typescript
async function selectBestValidator(modelId: string): Promise<Validator | null> {
  // 1. Get all active validators supporting this model
  const validators = await db.validators.find({
    is_active: true,
    models: { contains: modelId }
  });
  
  if (validators.length === 0) {
    return null;
  }
  
  // 2. Score each validator
  const scoredValidators = await Promise.all(
    validators.map(async (validator) => {
      const health = await redis.hgetall(`validator:${validator.id}:health`);
      
      // Check if validator is online (last_seen < 60s ago)
      if (Date.now() - health.last_seen > 60000) {
        return null; // Offline
      }
      
      // Check if validator has capacity
      if (health.current_load >= validator.max_capacity) {
        return null; // At capacity
      }
      
      const score = calculatePriorityScore(validator, health);
      
      return { validator, score };
    })
  );
  
  // 3. Filter out nulls and sort by score
  const available = scoredValidators
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  
  if (available.length === 0) {
    return null;
  }
  
  // 4. Return top scorer
  return available[0].validator;
}
```

---

## 4. Failure Detection and Retry Logic

### Timeout Tracker

**Background Process:**
```typescript
// Run every 5 seconds
setInterval(async () => {
  const timedOutJobs = await db.jobs.find({
    status: 'processing',
    timeout_at: { lt: Date.now() }
  });
  
  for (const job of timedOutJobs) {
    await handleJobTimeout(job);
  }
}, 5000);

async function handleJobTimeout(job: Job) {
  console.log(`Job ${job.id} timed out (validator: ${job.assigned_validator})`);
  
  // 1. Slash validator reputation
  await updateReputation(job.assigned_validator, 'timeout', -10);
  
  // 2. Check retry count
  if (job.retry_count >= 3) {
    // Max retries exceeded - issue refund
    await refundJob(job);
  } else {
    // Retry with next best validator
    await retryJob(job);
  }
}
```

### Retry Logic

```typescript
async function retryJob(job: Job) {
  // 1. Update job status
  await db.jobs.update(job.id, {
    status: 'queued',
    retry_count: job.retry_count + 1,
    assigned_validator: null,
    timeout_at: null
  });
  
  // 2. Re-queue with higher priority
  await redis.lpush('retry_queue', JSON.stringify(job)); // Front of queue
  
  // 3. Trigger routing
  processRetryQueue();
}
```

### Refund Logic

```typescript
async function refundJob(job: Job) {
  console.log(`Refunding job ${job.id} after ${job.retry_count} failed attempts`);
  
  // 1. Call NSD contract refund_request instruction
  const refundAmount = Math.floor(job.nsd_burned * 0.95); // 95% refund
  const refundTx = await callRefundRequestInstruction(job.id, job.user_wallet, refundAmount);
  
  // 2. Update job status
  await db.jobs.update(job.id, {
    status: 'refunded',
    refund_amount: refundAmount,
    refund_tx_signature: refundTx.signature,
    failed_at: Date.now()
  });
  
  // 3. Notify user (optional webhook)
  await notifyUser(job.user_wallet, {
    job_id: job.id,
    status: 'refunded',
    refund_amount: refundAmount
  });
}
```

---

## 5. Fee Distribution Orchestration

### Complete Request Flow

```typescript
async function callCompleteRequestInstruction(
  jobId: string,
  validatorId: string
): Promise<Transaction> {
  const job = await db.jobs.findOne({ id: jobId });
  const validator = await db.validators. findOne({ id: validatorId });
  
  // Build Solana instruction
  const instruction = await nsdProgram.methods
    .completeRequest(jobId)
    .accounts({
      request: getRequestPDA(jobId),
      validator: new PublicKey(validator.pubkey),
      validatorTokenAccount: getValidatorTokenAccount(validator.pubkey),
      treasuryTokenAccount: TREASURY_TOKEN_ACCOUNT,
      nsdMint: NSD_MINT,
      mintAuthority: MINT_AUTHORITY_PDA,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .instruction();
  
  // Create and send transaction
  const tx = new Transaction().add(instruction);
  tx.recentBlockhash = (await solanaClient.getRecentBlockhash()).blockhash;
  tx.feePayer = ROUTER_WALLET.publicKey;
  tx.sign(ROUTER_WALLET);
  
  const signature = await solanaClient.sendRawTransaction(tx.serialize());
  await solanaClient.confirmTransaction(signature);
  
  console.log(`Fee distributed for job ${jobId}: ${signature}`);
  
  return { signature };
}
```

**Fee Split Verification:**
```
Job burned: 55,000,000 micro-NSD (55 NSD)
├─ Validator receives: 38,500,000 (70%)
├─ Treasury receives:  11,000,000 (20%)
└─ Permanent burn:      5,500,000 (10%)

Net minted: 49,500,000
Net burned: 55,000,000
Supply change: -5,500,000 (deflationary)
```

---

## 6. Database Schema

### Jobs Table

```sql
CREATE TABLE jobs (
  id VARCHAR(64) PRIMARY KEY,
  user_wallet VARCHAR(64) NOT NULL,
  prompt TEXT NOT NULL,
  model_id VARCHAR(50) NOT NULL,
  max_tokens INTEGER NOT NULL,
  temperature FLOAT NOT NULL,
  nsd_burned BIGINT NOT NULL,
  burn_tx_signature VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- queued, processing, completed, refunded
  assigned_validator VARCHAR(64),
  retry_count INTEGER DEFAULT 0,
  result TEXT,
  tokens_used INTEGER,
  created_at BIGINT NOT NULL,
  started_at BIGINT,
  completed_at BIGINT,
  timeout_at BIGINT,
  refund_amount BIGINT,
  refund_tx_signature VARCHAR(128),
  INDEX idx_status (status),
  INDEX idx_timeout (timeout_at),
  INDEX idx_user (user_wallet)
);
```

### Validators Table

```sql
CREATE TABLE validators (
  id VARCHAR(64) PRIMARY KEY,
  pubkey VARCHAR(64) UNIQUE NOT NULL,
  models JSON NOT NULL,  -- Array of supported model IDs
  max_capacity INTEGER NOT NULL,
  endpoint VARCHAR(256) NOT NULL,
  stake_amount BIGINT NOT NULL,
  reputation INTEGER DEFAULT 100,
  total_jobs BIGINT DEFAULT 0,
  successful_jobs BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  registered_at BIGINT NOT NULL,
  last_seen BIGINT,
  INDEX idx_active (is_active),
  INDEX idx_models (models)
);
```

---

## 7. Monitoring & Observability

### Prometheus Metrics

```typescript
const metrics = {
  jobs_submitted: new Counter('router_jobs_submitted_total'),
  jobs_completed: new Counter('router_jobs_completed_total'),
  jobs_failed: new Counter('router_jobs_failed_total'),
  jobs_refunded: new Counter('router_jobs_refunded_total'),
  routing_latency: new Histogram('router_routing_latency_ms'),
  validator_count: new Gauge('router_validators_active'),
  queue_depth: new Gauge('router_queue_depth'),
  reputation_scores: new Histogram('router_validator_reputation')
};
```

### Health Check Endpoint

```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    uptime_seconds: process.uptime(),
    queue_depth: await redis.llen('request_queue'),
    active_validators: await db.validators.count({ is_active: true }),
    recent_jobs: await db.jobs.count({
      created_at: { gte: Date.now() - 60000 }
    })
  };
  
  res.status(200).json(health);
});
```

---

## Implementation Checklist

- [ ] Implement endpoint layer with Express.js
- [ ] Build request queue with Redis
- [ ] Create timeout tracker background process
- [ ] Develop validator selection algorithm
- [ ] Integrate Solana client for NSD contract calls
- [ ] Build reputation tracking system
- [ ] Implement retry and refund logic
- [ ] Add Prometheus metrics and monitoring
- [ ] Write comprehensive API tests
- [ ] Deploy to staging and run load tests (1000 RPS)
- [ ] Deploy to production with HA setup (3+ instances)

---

**Last Updated:** November 30, 2025  
**Version:** 1.0.0  
**Owner:** Agent 4 + Router API Team  
**Status:** Specification Complete - Ready for Implementation

**Phase 2 Complete! All core components specified:**
- ✅ LLM Integration Architecture
- ✅ NSD Smart Contract
- ✅ Validator Client V0.2.0
- ✅ Decentralized Router API

**Next: Phase 3 - Security Audit & QA (Weeks 3-4)**
