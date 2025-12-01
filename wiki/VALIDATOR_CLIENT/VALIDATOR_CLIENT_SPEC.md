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

## 6. Consumer Hardware Adaptation and Performance Guardrails

> **Critical for Public Validators (PVs)**: This section defines mandatory protections for validators running on consumer hardware (laptops, home internet) to prevent reputation slashing due to thermal throttling and network jitter.

### 6.1 Dynamic Model Manager Scaling

**Purpose:** Automatically detect and adapt to hardware performance degradation

**Problem:**
- Consumer GPUs (e.g., RTX 3060, M1 MacBook) experience thermal throttling under sustained load
- CPU performance degrades over time due to inadequate cooling
- Running multiple concurrent requests can trigger crashes or extreme latency spikes

**Solution:** Dynamic capacity adjustment based on real-time performance monitoring

**Implementation:**
```typescript
class ConsumerHardwareAdapter {
  private performanceMonitor: PerformanceMonitor;
  private maxCapacity: number = 5; // Default
  private currentCapacity: number = 5;
  
  async monitorAndAdapt() {
    setInterval(async () => {
      const metrics = await this.performanceMonitor.getMetrics();
      
      // Detect thermal throttling
      if (this.isThermalThrottling(metrics)) {
        console.warn('Thermal throttling detected - reducing capacity to 1');
        this.currentCapacity = 1; // Force sequential processing
        await this.reportCapacityChange(1);
      }
      
      // Detect CPU performance degradation
      else if (this.isCPUDegraded(metrics)) {
        console.warn('CPU performance degraded - reducing capacity');
        this.currentCapacity = Math.max(1, Math.floor(this.maxCapacity / 2));
        await this.reportCapacityChange(this.currentCapacity);
      }
      
      // Recovery: gradually increase capacity when metrics improve
      else if (this.canIncreaseCapacity(metrics)) {
        this.currentCapacity = Math.min(this.maxCapacity, this.currentCapacity + 1);
        await this.reportCapacityChange(this.currentCapacity);
      }
      
    }, 10000); // Check every 10 seconds
  }
  
  isThermalThrottling(metrics: SystemMetrics): boolean {
    // Check GPU temperature and utilization
    if (metrics.gpuTempCelsius > 85 && metrics.gpuUtilization > 95) {
      return true;
    }
    
    // Check CPU temperature
    if (metrics.cpuTempCelsius > 90) {
      return true;
    }
    
    // Check for sudden performance drops
    if (metrics.tokensPerSecond < (this.baselinePerformance * 0.5)) {
      return true;
    }
    
    return false;
  }
  
  isCPUDegraded(metrics: SystemMetrics): boolean {
    // Sustained high CPU usage with low throughput indicates degradation
    return metrics.cpuUtilization > 90 && 
           metrics.tokensPerSecond < (this.baselinePerformance * 0.7);
  }
  
  canIncreaseCapacity(metrics: SystemMetrics): boolean {
    // Safe to increase capacity if:
    // - Temperature is low
    // - Performance is good
    // - Current load is manageable
    return metrics.gpuTempCelsius < 75 &&
           metrics.cpuTempCelsius < 75 &&
           metrics.tokensPerSecond > (this.baselinePerformance * 0.9) &&
           metrics.currentLoad < this.currentCapacity;
  }
  
  async reportCapacityChange(newCapacity: number) {
    // Report to Router API immediately
    await fetch(`${ROUTER_URL}/api/validator/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        validator_id: VALIDATOR_ID,
        max_capacity: newCapacity,
        reason: 'thermal_adaptation'
      })
    });
  }
}
```

**Capacity Reduction Triggers:**
- GPU temperature > 85°C with >95% utilization
- CPU temperature > 90°C
- Token generation rate < 50% of baseline
- Sustained CPU >90% with low throughput

**Benefits:**
- **Prevents crashes**: Sequential processing (capacity=1) is stable even under thermal stress
- **Maintains reputation**: Slower but reliable is better than timeouts
- **Auto-recovery**: Capacity increases when hardware cools down

---

### 6.2 Graceful Inference Timeout Handling

**Purpose:** Proactively report failures before network timeout to minimize reputation penalties

**Problem:**
- Network timeout is 60 seconds
- Consumer hardware may take 45-55 seconds for complex prompts
- Hitting the 60s timeout triggers full reputation slash (-10 points)
- No opportunity to retry on a faster validator

**Solution:** Client-side 45-second timeout with graceful failure reporting

**Implementation:**
```typescript
class GracefulTimeoutHandler {
  private readonly CLIENT_TIMEOUT = 45000; // 45 seconds
  private readonly NETWORK_TIMEOUT = 60000; // 60 seconds
  
  async executeWithGracefulTimeout(request: Request): Promise<Result> {
    const startTime = Date.now();
    
    try {
      // Execute inference with client-side timeout
      const result = await Promise.race([
        this.executeInference(request),
        this.clientTimeout(this.CLIENT_TIMEOUT)
      ]);
      
      return result;
      
    } catch (error) {
      const elapsed = Date.now() - startTime;
      
      // If client timeout (45s), report failure immediately
      if (elapsed >= this.CLIENT_TIMEOUT) {
        await this.reportGracefulFailure(request.id, {
          error_code: 'CLIENT_TIMEOUT',
          error_message: 'Inference exceeded 45s - gracefully failing to allow retry',
          elapsed_ms: elapsed
        });
        
        // Return error (Router will retry with another validator)
        throw new Error('Client timeout - reported for retry');
      }
      
      // Other errors
      throw error;
    }
  }
  
  async reportGracefulFailure(requestId: string, details: FailureDetails) {
    // Report to Router API immediately
    await fetch(`${ROUTER_URL}/api/validator/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: requestId,
        validator_id: VALIDATOR_ID,
        error_code: details.error_code,
        error_message: details.error_message,
        graceful: true, // Flag for reduced penalty
        elapsed_ms: details.elapsed_ms
      })
    });
    
    console.log(`Gracefully failed request ${requestId} at ${details.elapsed_ms}ms to trigger retry`);
  }
  
  clientTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Client timeout')), ms)
    );
  }
}
```

**Timeline Comparison:**

| Scenario | Consumer Hardware | High-End Server |
|:---------|:-----------------|:----------------|
| **Complex prompt** | 50s (timeout) | 10s (success) |
| **Without graceful timeout** | Fails at 60s, -10 reputation, no retry | Success |
| **With graceful timeout** | Fails at 45s, -3 reputation, auto-retry succeeds | Success |

**Reputation Impact:**
- **Graceful failure (45s)**: -3 reputation (reduced penalty for proactive reporting)
- **Network timeout (60s)**: -10 reputation (full penalty for letting network timeout)
- **Savings**: 70% less reputation damage per timeout

**Router API Changes:**
The Router API must recognize the `graceful: true` flag and apply reduced penalties:

```typescript
// Router-side handling
if (failure.graceful === true && failure.elapsed_ms < 50000) {
  // Reduced penalty for graceful failures
  validator.reputation -= 3; // Instead of -10
} else {
  // Full penalty for network timeouts
  validator.reputation -= 10;
}
```

---

### 6.3 VOS (Validator On-Ramp Subsidy) Integration

**Purpose:** Economic offset for consumer hardware performance limitations

**Rationale:**
Consumer hardware validators will have:
- **Higher latency**: 20-50s vs 5-15s for enterprise hardware
- **Lower throughput**: 1-2 concurrent requests vs 5-10 for high-end GPUs
- **Higher failure rate**: 5-10% timeout rate vs <1% for optimized servers

**VOS Compensation:**
The 2x NST block reward bonus for first 20 validators is specifically designed to offset this performance penalty:

```
Consumer hardware validator (with VOS):
- Average response time: 30s (higher latency)
- Concurrent capacity: 1-2 (thermal limited)
- Revenue: 24,750 NST/year (2x bonus)
- APY: 495%

Enterprise validator (no VOS):
- Average response time: 10s (low latency)
- Concurrent capacity: 5-10 (dedicated GPU)
- Revenue: 12,375 NST/year (standard)
- APY: 247.5%
```

**Despite slower service times, consumer validators achieve higher profitability through VOS.**

**Key Messaging:**
> "The VOS is designed to offset the performance penalty inherent to consumer hardware, ensuring high profitability despite slower service times. Run your validator on a laptop—you'll be slower, but you'll earn more."

---

### 6.4 Consumer Hardware Best Practices

**Recommended Setup for Laptops/Home PCs:**

| Component | Minimum | Recommended | Notes |
|:----------|:--------|:------------|:------|
| **CPU** | 4 cores | 8 cores | Modern Intel/AMD or Apple Silicon |
| **RAM** | 8GB | 16GB | For llama-2-7b-q4 |
| **GPU** | Integrated | RTX 3060 / M1 Pro | Optional but helps |
| **Storage** | 100GB SSD | 200GB NVMe | Fast model loading |
| **Internet** | 10 Mbps | 50 Mbps | Home fiber preferred |
| **Capacity** | 1 concurrent | 2 concurrent | Conservative for stability |

**Thermal Management:**
- Use laptop cooling pads
- Ensure adequate ventilation
- Consider undervolting CPU/GPU for lower temps
- Monitor temperatures with tools (HWMonitor, iStat Menus)

**Network Optimization:**
- Wired ethernet preferred over WiFi
- Port forwarding for direct connectivity
- Consider dynamic DNS for home IP changes

**Model Selection:**
- Start with `gpt2-q4` (85MB, CPU-friendly)
- Add `llama-2-7b-q4` once stable (3.8GB)
- Avoid `llama-2-13b-q4` unless you have dedicated GPU

---

### 6.5 Testing & Validation

**Pre-Launch Checklist:**
```bash
# 1. Hardware stress test (30 minutes)
pnpm run stress-test --duration=30m --model=llama-2-7b-q4

# Expected: No thermal throttling, stable token generation rate

# 2. Timeout simulation test
pnpm run test-graceful-timeout

# Expected: Client timeout triggers at 45s, failure reported

# 3. Capacity adaptation test
pnpm run test-dynamic-capacity

# Expected: Capacity reduces to 1 when throttling simulated, recovers when cool

# 4. 24-hour stability test
pnpm run start --test-mode --duration=24h

# Expected: >95% uptime, <5% timeout rate
```

**Success Criteria:**
- ✅ Client timeout triggers before 50s (well before 60s network timeout)
- ✅ Capacity auto-reduces to 1 when thermal throttling detected
- ✅ No crashes during 24-hour stress test
- ✅ Graceful failures result in successful retries (Router assigns to another validator)

---

**Consumer Hardware Validator Statement:**

> **"NeuroSwarm welcomes validators on all hardware."**  
> Whether you're running an enterprise-grade server or a MacBook Pro, our adaptive client software and VOS economic model ensure you can participate profitably. The network benefits from geographic diversity and decentralization—your laptop in Singapore is just as valuable as a data center in Virginia.

---

## 7. Monitoring & Observability

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
