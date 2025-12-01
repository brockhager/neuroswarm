# Validator Client V0.2.0 Technical Specification
## Node Software for Decentralized LLM Inference

> **Purpose**: This document defines the Validator Client—the software that validators run to participate in NeuroSwarm's decentralized LLM network by executing inference requests and earning NSD fees.

---

## Overview

**Version:** 0.2.0  
**Language:** TypeScript/Node.js  
**Runtime:** Node.js 18+  
**Key Integrations:**
- NS-LLM backend (C++ inference engine)
- NSD Solana Program (fee claiming)
- Router API (request assignment)
- NST Staking Contract (registration)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Validator Client V0.2.0                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Request    │  │    Model     │  │     Fee      │      │
│  │   Listener   │  │   Manager    │  │   Claimer    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────┬───────┴──────────────────┘              │
│                    │                                         │
│         ┌──────────▼──────────┐                             │
│         │   Core Orchestrator  │                             │
│         └──────────┬──────────┘                             │
│                    │                                         │
│  ┌─────────────────┴─────────────────┐                      │
│  │                                   │                      │
│  ▼                                   ▼                      │
│ ┌──────────────┐           ┌──────────────┐               │
│ │   NS-LLM     │           │   Solana     │               │
│ │   Backend    │           │   Client     │               │
│ └──────────────┘           └──────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 Request Listener

**Purpose:** Monitor Router API for assigned LLM requests

**Responsibilities:**
1. **Poll Router API** for new requests assigned to this validator
2. **Authenticate** request signatures
3. **Validate** request parameters (model, max_tokens, etc.)
4. **Queue** requests internally based on priority
5. **Report** availability status to Router

**Implementation:**
```typescript
class RequestListener {
  private routerUrl: string;
  private validatorId: string;
  private pollInterval: number = 1000; // 1 second
  
  async start() {
    setInterval(async () => {
      const requests = await this.fetchAssignedRequests();
      for (const request of requests) {
        if (await this.validateRequest(request)) {
          await this.orchestrator.queueRequest(request);
        }
      }
    }, this.pollInterval);
  }
  
  async fetchAssignedRequests(): Promise<Request[]> {
    const response = await fetch(`${this.routerUrl}/api/validator/requests`, {
      headers: {
        'Authorization': `Bearer ${this.validatorJWT}`,
        'X-Validator-ID': this.validatorId
      }
    });
    return response.json();
  }
  
  async validateRequest(request: Request): Promise<boolean> {
    // Check model is supported
    if (!this.modelManager.hasModel(request.model)) {
      return false;
    }
    
    // Verify NSD burn transaction
    const burnTx = await this.solanaClient.getTransaction(request.burn_tx_signature);
    if (!burnTx || burnTx.meta?.err) {
      return false;
    }
    
    // Check max_tokens is within limits
    if (request.max_tokens > MAX_TOKENS_LIMIT) {
      return false;
    }
    
    return true;
  }
}
```

---

### 2.2 Model Manager

**Purpose:** Load, cache, and manage LLM models efficiently

**Responsibilities:**
1. **Load** models from disk on startup
2. **Cache** frequently used models in memory
3. **Unload** models when memory pressure is high
4. **Report** available models to Router
5. **Monitor** model performance metrics

**Model Loading Strategy:**
```typescript
class ModelManager {
  private models: Map<string, ModelInstance> = new Map();
  private modelPaths: Map<string, string> = new Map();
  private memoryLimit: number = 16_000_000_000; // 16GB
  
  async loadModel(modelName: string): Promise<ModelInstance> {
    // Check if already loaded
    if (this.models.has(modelName)) {
      this.models.get(modelName)!.lastUsed = Date.now();
      return this.models.get(modelName)!;
    }
    
    // Check memory availability
    const modelSize = await this.getModelSize(modelName);
    const currentMemory = this.getTotalMemoryUsage();
    
    if (currentMemory + modelSize > this.memoryLimit) {
      await this.evictLRUModel();
    }
    
    // Load model via NS-LLM backend
    const modelPath = this.modelPaths.get(modelName);
    const model = await this.nsLLMBackend.loadModel(modelPath);
    
    this.models.set(modelName, {
      instance: model,
      loadedAt: Date.now(),
      lastUsed: Date.now(),
      size: modelSize
    });
    
    return model;
  }
  
  async evictLRUModel() {
    // Find least recently used model
    let lruModel: string | null = null;
    let oldestTime = Date.now();
    
    for (const [name, instance] of this.models.entries()) {
      if (instance.lastUsed < oldestTime) {
        oldestTime = instance.lastUsed;
        lruModel = name;
      }
    }
    
    if (lruModel) {
      await this.unloadModel(lruModel);
    }
  }
  
  getSupportedModels(): string[] {
    return Array.from(this.modelPaths.keys());
  }
}
```

**Supported Models (Initial):**
- `gpt2-q4` - GPT-2 124M (Q4 quantization)
- `llama-2-7b-q4` - Llama 2 7B (Q4 quantization)
- `llama-2-13b-q4` - Llama 2 13B (Q4 quantization, GPU recommended)

---

### 2.3 Core Orchestrator

**Purpose:** Coordinate all components and execute inference

**Responsibilities:**
1. **Receive** requests from Request Listener
2. **Load** appropriate model via Model Manager
3. **Execute** inference via NS-LLM backend
4. **Monitor** execution timeout (60s max)
5. **Report** results to Router API
6. **Handle** errors and retries

**Execution Flow:**
```typescript
class CoreOrchestrator {
  async processRequest(request: Request): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 1. Update status to 'processing'
      await this.reportStatus(request.id, 'processing');
      
      // 2. Load model
      const model = await this.modelManager.loadModel(request.model);
      
      // 3. Execute inference with timeout
      const result = await Promise.race([
        this.executeInference(model, request),
        this.timeout(60000) // 60 second timeout
      ]);
      
      // 4. Calculate actual cost
      const actualCost = this.calculateCost(result.tokens, request.model);
      
      // 5. Report success to Router
      await this.reportSuccess(request.id, result, actualCost);
      
      // 6. Claim fee from NSD contract
      await this.feeClaimer.claimFee(request.id);
      
      // 7. Update metrics
      this.metrics.recordSuccess(Date.now() - startTime, result.tokens);
      
    } catch (error) {
      // Report failure to Router (triggers refund)
      await this.reportFailure(request.id, error.message);
      this.metrics.recordFailure(error);
    }
  }
  
  async executeInference(model: ModelInstance, request: Request): Promise<InferenceResult> {
    return await this.nsLLMBackend.generate({
      model: model.instance,
      prompt: request.prompt,
      maxTokens: request.max_tokens,
      temperature: request.temperature || 0.7,
      topP: request.top_p || 0.9,
      stopSequences: request.stop_sequences || []
    });
  }
  
  timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), ms)
    );
  }
}
```

---

### 2.4 Fee Claimer

**Purpose:** Claim NSD fees from completed requests

**Responsibilities:**
1. **Monitor** completed requests eligible for fee claim
2. **Build** Solana transactions for `complete_request` instruction
3. **Submit** transactions to claim validator fees (70%)
4. **Retry** failed claims with exponential backoff
5. **Track** total fees earned

**Implementation:**
```typescript
class FeeClaimer {
  private solanaClient: Connection;
  private wallet: Keypair;
  private nsdProgramId: PublicKey;
  
  async claimFee(requestId: string): Promise<void> {
    try {
      // 1. Build complete_request instruction
      const instruction = await this.buildCompleteRequestIx(requestId);
      
      // 2. Create transaction
      const transaction = new Transaction().add(instruction);
      
      // 3. Get recent blockhash
      transaction.recentBlockhash = (
        await this.solanaClient.getRecentBlockhash()
      ).blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      // 4. Sign and send
      transaction.sign(this.wallet);
      const signature = await this.solanaClient.sendRawTransaction(
        transaction.serialize()
      );
      
      // 5. Wait for confirmation
      await this.solanaClient.confirmTransaction(signature);
      
      console.log(`Fee claimed for request ${requestId}: ${signature}`);
      
    } catch (error) {
      console.error(`Fee claim failed for ${requestId}:`, error);
      // Retry with exponential backoff
      await this.retryClaimFee(requestId);
    }
  }
  
  async buildCompleteRequestIx(requestId: string): Promise<TransactionInstruction> {
    // Get request PDA
    const [requestPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('request'), Buffer.from(requestId)],
      this.nsdProgramId
    );
    
    // Get validator token account
    const validatorTokenAccount = await getAssociatedTokenAddress(
      NSD_MINT,
      this.wallet.publicKey
    );
    
    // Build instruction
    return program.methods
      .completeRequest(requestId)
      .accounts({
        request: requestPDA,
        validator: this.wallet.publicKey,
        validatorTokenAccount,
        // ... other accounts
      })
      .instruction();
  }
}
```

---

### 2.5 Health Monitor

**Purpose:** Track validator health and report to Router

**Metrics Tracked:**
- **Uptime** percentage (target: >95%)
- **Success rate** (completed / total requests)
- **Average response time** (target: <30s)
- **Memory usage** (current / available)
- **Model availability** (loaded models)
- **Queue depth** (pending requests)

**Health Report:**
```typescript
interface HealthReport {
  validatorId: string;
  timestamp: number;
  uptime: number; // seconds
  uptimePercentage: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number; // milliseconds
  currentMemoryUsage: number; // bytes
  availableMemory: number; // bytes
  loadedModels: string[];
  queueDepth: number;
  reputation: number; // 0-100
}

class HealthMonitor {
  async generateReport(): Promise<HealthReport> {
    return {
      validatorId: this.config.validatorId,
      timestamp: Date.now(),
      uptime: process.uptime(),
      uptimePercentage: this.calculateUptimePercentage(),
      totalRequests: this.metrics.total,
      successfulRequests: this.metrics.successful,
      failedRequests: this.metrics.failed,
      averageResponseTime: this.metrics.avgResponseTime,
      currentMemoryUsage: process.memoryUsage().heapUsed,
      availableMemory: os.totalmem(),
      loadedModels: this.modelManager.getLoadedModels(),
      queueDepth: this.orchestrator.getQueueDepth(),
      reputation: await this.fetchReputationScore()
    };
  }
  
  async reportToRouter() {
    const report = await this.generateReport();
    await fetch(`${this.routerUrl}/api/validator/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
  }
}
```

---

## 3. Configuration

### 3.1 Environment Variables

```bash
# Validator Identity
VALIDATOR_ID=validator_abc123
VALIDATOR_WALLET_PATH=/path/to/wallet.json
NST_STAKE_AMOUNT=5000  # Minimum stake

# Router API
ROUTER_API_URL=https://router.neuroswarm.io
ROUTER_API_KEY=secret_key_here

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NSD_PROGRAM_ID=NSD11111111111111111111111111111111111111
NST_PROGRAM_ID=NST11111111111111111111111111111111111111

# NS-LLM Backend
NS_LLM_URL=http://localhost:5555
NS_LLM_MODEL_DIR=/path/to/models

# Resource Limits
MAX_MEMORY_GB=16
MAX_CONCURRENT_REQUESTS=5
REQUEST_TIMEOUT_SECONDS=60

# Monitoring
HEALTH_REPORT_INTERVAL=30  # seconds
LOG_LEVEL=info
```

---

### 3.2 Model Configuration

**File:** `models.json`
```json
{
  "models": [
    {
      "name": "gpt2-q4",
      "path": "/models/gpt2-124m-q4.gguf",
      "size_mb": 85,
      "cost_multiplier": 0.5,
      "gpu_required": false
    },
    {
      "name": "llama-2-7b-q4",
      "path": "/models/llama-2-7b-chat-q4_0.gguf",
      "size_mb": 3800,
      "cost_multiplier": 1.0,
      "gpu_required": false
    },
    {
      "name": "llama-2-13b-q4",
      "path": "/models/llama-2-13b-chat-q4_0.gguf",
      "size_mb": 7200,
      "cost_multiplier": 2.0,
      "gpu_required": true
    }
  ]
}
```

---

## 4. API Interactions

### 4.1 Router API Endpoints (Client → Router)

**1. Register Validator**
```http
POST /api/validator/register
Authorization: Bearer <validator_jwt>

{
  "validator_id": "validator_abc123",
  "wallet_address": "Hn7c...",
  "supported_models": ["gpt2-q4", "llama-2-7b-q4"],
  "endpoint": "https://validator.example.com",
  "nst_stake_tx": "5j8k..."  // Stake transaction signature
}

Response 200:
{
  "status": "registered",
  "validator_id": "validator_abc123",
  "reputation": 100
}
```

**2. Fetch Assigned Requests**
```http
GET /api/validator/requests?validator_id=validator_abc123
Authorization: Bearer <validator_jwt>

Response 200:
[
  {
    "request_id": "req_uuid",
    "user": "0x742d...",
    "model": "llama-2-7b-q4",
    "prompt": "Explain quantum computing",
    "max_tokens": 500,
    "temperature": 0.7,
    "nsd_burned": 55,
    "burn_tx_signature": "3k2j...",
    "created_at": 1701390000
  }
]
```

**3. Report Completion**
```http
POST /api/validator/complete
Authorization: Bearer <validator_jwt>

{
  "request_id": "req_uuid",
  "status": "success",
  "result": "Quantum computing uses quantum mechanics...",
  "tokens_used": 487,
  "response_time_ms": 12450
}

Response 200:
{
  "status": "recorded",
  "fee_claim_tx": "7m9n..."  // Optional: auto-claimed fee
}
```

**4. Report Failure**
```http
POST /api/validator/fail
Authorization: Bearer <validator_jwt>

{
  "request_id": "req_uuid",
  "error": "Model timeout",
  "error_code": "TIMEOUT"
}

Response 200:
{
  "status": "refunded",
  "refund_tx": "4l6k..."
}
```

**5. Report Health**
```http
POST /api/validator/health
Authorization: Bearer <validator_jwt>

{
  "validator_id": "validator_abc123",
  "uptime_percentage": 99.2,
  "success_rate": 98.5,
  "avg_response_time": 15000,
  "current_load": 2,  // concurrent requests
  "max_capacity": 5,
  "loaded_models": ["gpt2-q4", "llama-2-7b-q4"]
}

Response 200:
{
  "status": "healthy",
  "reputation": 95
}
```

---

## 5. Deployment Guide

### 5.1 System Requirements

**Minimum (gpt2-q4 only):**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- Network: 10 Mbps

**Recommended (llama-2-7b-q4):**
- CPU: 8 cores
- RAM: 16GB
- Storage: 100GB SSD
- Network: 50 Mbps
- GPU: Optional (NVIDIA RTX 3060 or better)

**High Performance (llama-2-13b-q4):**
- CPU: 16 cores
- RAM: 32GB
- Storage: 200GB SSD
- Network: 100 Mbps
- GPU: Required (NVIDIA RTX 4090 or A100)

---

### 5.2 Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/neuroswarm/validator-client.git
cd validator-client

# 2. Install dependencies
pnpm install

# 3. Download models
pnpm run download-models --models=gpt2-q4,llama-2-7b-q4

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# 5. Generate validator wallet (if needed)
solana-keygen new -o ./validator-wallet.json

# 6. Stake NST tokens
pnpm run stake --amount=5000

# 7. Start validator client
pnpm run start

# 8. Monitor status
pnpm run status
```

---

### 5.3 Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# Expose health check port
EXPOSE 3010

# Start validator
CMD ["pnpm", "run", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  validator:
    build: .
    environment:
      - VALIDATOR_ID=${VALIDATOR_ID}
      - ROUTER_API_URL=${ROUTER_API_URL}
      - SOLANA_RPC_URL=${SOLANA_RPC_URL}
    volumes:
      - ./models:/models
      - ./wallet.json:/app/wallet.json
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 16G
          cpus: '8'
```

---

## 6. Monitoring & Observability

### 6.1 Prometheus Metrics

```typescript
// Exported metrics
const metrics = {
  requests_total: new Counter('validator_requests_total'),
  requests_successful: new Counter('validator_requests_successful'),
  requests_failed: new Counter('validator_requests_failed'),
  response_time: new Histogram('validator_response_time_ms'),
  fees_earned_total: new Counter('validator_fees_earned_nsd'),
  reputation_score: new Gauge('validator_reputation_score'),
  queue_depth: new Gauge('validator_queue_depth'),
  model_load_time: new Histogram('validator_model_load_time_ms')
};
```

---

## 7. Security Considerations

### 7.1 Wallet Security
- Store private key in encrypted file
- Use hardware wallet for mainnet (Ledger/Trezor)
- Never expose wallet seed phrase
- Rotate API keys regularly

### 7.2 Model Security
- Verify model checksums before loading
- Sandbox model execution (prevent code injection)
- Rate limit requests per user address
- Monitor for anomalous prompts (potential attacks)

---

## Implementation Checklist

- [ ] Implement Request Listener with polling logic
- [ ] Build Model Manager with LRU caching
- [ ] Create Core Orchestrator with timeout handling
- [ ] Develop Fee Claimer with Solana integration
- [ ] Add Health Monitor with Prometheus metrics
- [ ] Write configuration loader and validator
- [ ] Build Docker image and test deployment
- [ ] Create setup scripts for model download
- [ ] Write comprehensive unit tests
- [ ] Deploy to testnet and run 48h stability test

---

**Last Updated:** November 30, 2025  
**Version:** 0.2.0  
**Owner:** Agent 4 + Validator Client Team  
**Status:** Specification Complete - Ready for Implementation

**Next Step:** Design Decentralized Router API (Phase 2, Activity 2.3).
