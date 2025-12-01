# LLM Integration Layer: Request Architecture
## Decentralized LLM Request Flow and NSD Utility

> **Purpose**: This document defines the core mechanism of NeuroSwarm's dual-token economy in practice—how users consume NSD to access LLM services through a decentralized request routing system.

---

## Architecture Overview

### Dual-Token Interaction Model

```
User Wallet (NST + NSD)
    ↓ (burn NSD for request)
Router API (Request Validator)
    ↓ (route to available node)
LLM Provider Node Pool
    ↓ (execute and respond)
User (receives result)
    ↓ (validator earns fee)
Validator (NSD fee → NST conversion)
```

**Key Principle**: NSD is the **fuel** for computation. NST is the **security** and **governance** layer.

---

## 1. User Request Flow (Step-by-Step)

### Step 1: User Initiates LLM Request

**Endpoint:** `POST /api/llm/generate`

**Request Payload:**
```json
{
  "model": "llama-2-7b-q4",
  "prompt": "Explain blockchain consensus",
  "max_tokens": 500,
  "temperature": 0.7,
  "user_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "nsd_payment": 50
}
```

**Client-Side Validation:**
1. Check user NSD balance ≥ `estimated_cost`
2. Calculate `estimated_cost` = `(max_tokens * cost_per_token) + base_fee`
3. Pre-authorize NSD burn transaction
4. Sign request with user's private key

---

### Step 2: Router API Validates Request

**Router Responsibilities:**
1. **Authenticate User**: Verify signature and address ownership
2. **Check NSD Balance**: Query NSD contract for user balance
3. **Validate Request**: 
   - Model exists and is available
   - `max_tokens` within allowed limits (1-2048)
   - `nsd_payment` ≥ `minimum_cost`
4. **Burn NSD**: Execute burn transaction on NSD contract
5. **Issue Request ID**: Generate unique UUID for tracking

**NSD Burn Transaction:**
```solidity
// Pseudo-code for NSD burn
function burnForRequest(
    address user,
    uint256 amount,
    bytes32 requestId
) external returns (bool) {
    require(balanceOf(user) >= amount, "Insufficient NSD");
    _burn(user, amount);
    emit NSDBurned(user, amount, requestId, block.timestamp);
    return true;
}
```

**Response to User:**
```json
{
  "request_id": "req_a1b2c3d4",
  "status": "queued",
  "nsd_burned": 50,
  "estimated_wait_seconds": 5,
  "assigned_node": "node_validator_42"
}
```

---

### Step 3: Request Routing & Node Selection

**Node Selection Algorithm:**

```javascript
function selectLLMNode(request) {
  // 1. Filter available nodes for this model
  const availableNodes = nodes.filter(n => 
    n.models.includes(request.model) &&
    n.status === 'online' &&
    n.currentLoad < n.maxCapacity
  );
  
  // 2. Calculate priority scores
  const scoredNodes = availableNodes.map(node => ({
    node,
    score: calculatePriorityScore(node, request)
  }));
  
  // 3. Sort by score (highest first)
  scoredNodes.sort((a, b) => b.score - a.score);
  
  // 4. Select top node
  return scoredNodes[0].node;
}

function calculatePriorityScore(node, request) {
  return (
    node.stake * 0.4 +           // 40% weight: validator stake
    node.reputation * 0.3 +       // 30% weight: historical performance
    (100 - node.currentLoad) * 0.2 + // 20% weight: available capacity
    node.responseTime * -0.1      // 10% weight: speed (negative = faster is better)
  );
}
```

**Priority Factors:**
1. **Validator Stake (40%)**: Higher NST stake = higher priority
2. **Reputation Score (30%)**: Based on past successful completions
3. **Available Capacity (20%)**: Prefer nodes with lower current load
4. **Response Time (10%)**: Faster nodes get slight preference

---

### Step 4: LLM Node Executes Request

**Node Execution Flow:**

```javascript
// LLM Node receives routed request
async function processLLMRequest(request) {
  try {
    // 1. Load model into memory (if not cached)
    const model = await loadModel(request.model);
    
    // 2. Execute inference
    const result = await model.generate({
      prompt: request.prompt,
      maxTokens: request.max_tokens,
      temperature: request.temperature
    });
    
    // 3. Calculate actual cost
    const actualTokens = result.tokens_generated;
    const actualCost = actualTokens * COST_PER_TOKEN + BASE_FEE;
    
    // 4. Report completion to router
    return {
      request_id: request.id,
      status: 'success',
      result: result.text,
      tokens_used: actualTokens,
      nsd_consumed: actualCost,
      node_id: NODE_ID
    };
  } catch (error) {
    // 5. Report failure
    return {
      request_id: request.id,
      status: 'failed',
      error: error.message,
      nsd_consumed: 0 // No cost on failure
    };
  }
}
```

---

### Step 5: Response Delivery & Fee Distribution

**Success Case:**

```javascript
// Router receives successful response
async function handleSuccess(response) {
  // 1. Calculate fee split
  const totalBurned = response.nsd_consumed;
  const validatorFee = totalBurned * FEE_SPLIT_VALIDATOR; // 70%
  const treasuryFee = totalBurned * FEE_SPLIT_TREASURY;   // 20%
  const burnAmount = totalBurned * FEE_SPLIT_BURN;        // 10%
  
  // 2. Mint validator fee in NSD
  await nsdContract.mint(response.node_validator_address, validatorFee);
  
  // 3. Mint treasury fee in NSD
  await nsdContract.mint(TREASURY_ADDRESS, treasuryFee);
  
  // 4. Permanent burn (already burned in Step 2)
  // burnAmount stays burned, reducing circulating supply
  
  // 5. Update validator reputation
  await updateReputation(response.node_id, 'success');
  
  // 6. Return result to user
  return {
    request_id: response.request_id,
    status: 'completed',
    result: response.result,
    tokens_used: response.tokens_used,
    nsd_consumed: totalBurned,
    validator_earned: validatorFee
  };
}
```

**Failure Case:**

```javascript
// Router detects failure (timeout or error)
async function handleFailure(request, error) {
  // 1. Calculate refund (95% of burned amount)
  const refund = request.nsd_burned * 0.95;
  const penaltyFee = request.nsd_burned * 0.05; // Node penalty
  
  // 2. Mint refund back to user
  await nsdContract.mint(request.user_address, refund);
  
  // 3. Slash node reputation
  await updateReputation(request.node_id, 'failure');
  
  // 4. Return error response
  return {
    request_id: request.id,
    status: 'failed',
    error: error.message,
    nsd_refunded: refund,
    nsd_penalty: penaltyFee
  };
}
```

---

## 2. NSD Burn & Fee Split Model

### Fee Structure

| Component | Percentage | Destination | Purpose |
|:----------|:-----------|:------------|:--------|
| **Validator Fee** | 70% | Node operator (minted) | Compensate compute provider |
| **Treasury Fee** | 20% | DAO treasury (minted) | Fund ecosystem development |
| **Permanent Burn** | 10% | Burned (deflationary) | Reduce NSD supply over time |

**Example Calculation:**
```
User burns: 100 NSD
├─ Validator receives: 70 NSD (minted)
├─ Treasury receives: 20 NSD (minted)
└─ Permanently burned: 10 NSD (supply reduction)

Net effect: 90 NSD minted, 100 NSD burned = -10 NSD circulating supply
```

### Dynamic Pricing Model

**Cost Per Token (CPT):**
```javascript
const BASE_FEE = 5; // NSD per request (flat)
const COST_PER_TOKEN = 0.1; // NSD per output token

function calculateCost(request) {
  const estimatedTokens = request.max_tokens || 500;
  const modelMultiplier = MODEL_COSTS[request.model] || 1.0;
  
  return (BASE_FEE + (estimatedTokens * COST_PER_TOKEN)) * modelMultiplier;
}
```

**Model Cost Multipliers:**
- **GPT-2 (Q4)**: 0.5x (cheap, fast)
- **Llama-2-7B (Q4)**: 1.0x (default)
- **Llama-2-13B (Q4)**: 2.0x (larger model)
- **Llama-2-70B (Q4)**: 5.0x (premium)

---

## 3. Validator Selection & Incentives

### Validator Registration

**Requirements:**
1. **Minimum Stake**: 5,000 NST staked
2. **Hardware Specs**: 
   - 16GB+ RAM
   - 50GB+ storage
   - GPU recommended (CUDA/Metal)
3. **Uptime SLA**: >95% monthly uptime
4. **Model Support**: At least 1 model loaded

**Registration Process:**
```solidity
function registerValidator(
    uint256 stake,
    string[] calldata supportedModels,
    string calldata endpoint
) external {
    require(stake >= MIN_STAKE, "Insufficient stake");
    require(nstContract.transferFrom(msg.sender, address(this), stake), "Stake transfer failed");
    
    validators[msg.sender] = Validator({
        stake: stake,
        models: supportedModels,
        endpoint: endpoint,
        reputation: 100, // Start at neutral
        totalRequests: 0,
        successfulRequests: 0,
        registered: block.timestamp
    });
    
    emit ValidatorRegistered(msg.sender, stake, supportedModels);
}
```

### Reputation System

**Score Calculation:**
```javascript
function calculateReputation(validator) {
  const successRate = validator.successfulRequests / validator.totalRequests;
  const uptimeScore = validator.uptimePercentage;
  const avgResponseTime = validator.avgResponseTimeMs;
  
  return (
    successRate * 50 +           // 50 points max
    (uptimeScore / 100) * 30 +   // 30 points max
    (1000 / avgResponseTime) * 20 // 20 points max (faster = better)
  ); // Total: 0-100 score
}
```

**Reputation Effects:**
- **90-100**: +20% fee earnings boost
- **70-89**: No bonus
- **50-69**: -10% fee earnings penalty
- **<50**: Temporary suspension from routing

---

## 4. Request Priority & Queue Management

### Priority Queue Algorithm

**Queue Position Factors:**
1. **NSD Amount Burned**: Higher payment = higher priority
2. **User Reputation**: Trusted users get slight boost
3. **Request Urgency**: Optional `priority` flag (+50% cost)
4. **Timestamp**: FIFO for same-priority requests

**Queue Implementation:**
```javascript
class PriorityQueue {
  insert(request) {
    const priority = this.calculatePriority(request);
    this.queue.push({ request, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
  }
  
  calculatePriority(request) {
    const basePriority = request.nsd_burned;
    const userBonus = request.user_reputation * 0.1;
    const urgencyBonus = request.priority_flag ? basePriority * 0.5 : 0;
    const ageBonus = (Date.now() - request.timestamp) / 1000; // 1 point per second waited
    
    return basePriority + userBonus + urgencyBonus + ageBonus;
  }
  
  dequeue() {
    return this.queue.shift()?.request;
  }
}
```

---

## 5. Failure Handling & Refunds

### Failure Types

| Failure Type | Refund % | Penalty | Description |
|:-------------|:---------|:--------|:------------|
| **Timeout** | 95% | Reputation -5 | Node didn't respond in 60s |
| **Error** | 95% | Reputation -3 | Node returned error |
| **Invalid Output** | 90% | Reputation -10 | Output failed validation |
| **Node Offline** | 100% | Reputation -15 | Node unreachable |
| **User Cancel** | 50% | None | User canceled before completion |

### Automatic Retry Logic

```javascript
async function executeWithRetry(request, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const node = selectLLMNode(request);
      const result = await routeToNode(node, request);
      
      if (result.status === 'success') {
        return result;
      }
      
      // Failure - mark node and try next
      await markNodeFailure(node.id, request.id);
      
      if (attempt === maxRetries) {
        // All retries failed - issue refund
        return await handleFailure(request, 'Max retries exceeded');
      }
      
      // Wait before retry (exponential backoff)
      await sleep(1000 * Math.pow(2, attempt - 1));
      
    } catch (error) {
      if (attempt === maxRetries) {
        return await handleFailure(request, error);
      }
    }
  }
}
```

---

## 6. Economic Impact & Supply Dynamics

### NSD Supply Mechanics

**Elastic Supply Formula:**
```javascript
function updateNSDSupply() {
  const totalBurned = getTotalBurnedThisEpoch();
  const totalMinted = getTotalMintedThisEpoch();
  
  const netChange = totalMinted - totalBurned;
  
  if (netChange < 0) {
    // Deflationary period - supply decreases
    circulatingSupply += netChange;
  } else {
    // Inflationary period - supply increases
    circulatingSupply += netChange;
  }
  
  // Target: ~1% net deflation per year
  const targetDeflation = circulatingSupply * 0.01 / 365;
  adjustFeeStructure(netChange, targetDeflation);
}
```

**Fee Adjustment Mechanism:**
- If NSD supply growing too fast → increase burn percentage
- If NSD supply shrinking too fast → decrease burn percentage
- Target: Maintain ~$0.001 per NSD peg via supply/demand balance

### Example Scenario

**Scenario:** 1000 requests/day, avg 500 tokens each

```
Daily NSD Flow:
├─ Burned: 1000 requests × 55 NSD avg = 55,000 NSD
├─ Minted to Validators: 55,000 × 0.70 = 38,500 NSD
├─ Minted to Treasury: 55,000 × 0.20 = 11,000 NSD
└─ Net Burn: 55,000 - 49,500 = 5,500 NSD/day

Yearly Impact:
└─ Net Deflation: 5,500 × 365 = 2,007,500 NSD/year
```

---

## 7. Security Considerations

### Attack Vectors & Mitigations

**1. Validator Manipulation:**
- **Attack**: Validator claims success but delivers poor results
- **Mitigation**: Client-side validation + reputation slashing + random audits

**2. User Spam:**
- **Attack**: User floods system with cheap requests
- **Mitigation**: Minimum burn amount (5 NSD) + rate limiting (10 req/min)

**3. Front-Running:**
- **Attack**: Validator sees high-value request and tries to claim it
- **Mitigation**: Commit-reveal scheme for node selection

**4. Refund Exploitation:**
- **Attack**: User intentionally triggers failures to farm refunds
- **Mitigation**: Decreasing refund % for repeat failures (95% → 90% → 85%)

---

## 8. API Specifications

### REST Endpoints

**1. Submit Request**
```http
POST /api/llm/generate
Authorization: Bearer <user_signature>
Content-Type: application/json

{
  "model": "llama-2-7b-q4",
  "prompt": "string",
  "max_tokens": 500,
  "temperature": 0.7,
  "nsd_payment": 50
}

Response 202 Accepted:
{
  "request_id": "req_uuid",
  "status": "queued",
  "nsd_burned": 50,
  "estimated_wait": 5
}
```

**2. Check Status**
```http
GET /api/llm/status/{request_id}

Response 200 OK:
{
  "request_id": "req_uuid",
  "status": "completed", // queued | processing | completed | failed
  "result": "string",
  "tokens_used": 487,
  "nsd_consumed": 53.7
}
```

**3. Stream Response (WebSocket)**
```javascript
const ws = new WebSocket('wss://api.neuroswarm.io/llm/stream');
ws.send(JSON.stringify({
  action: 'subscribe',
  request_id: 'req_uuid'
}));

ws.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  console.log(chunk.token); // Streaming tokens
};
```

---

## Implementation Checklist

### Phase 2.1: NSD Smart Contract
- [ ] Implement elastic mint/burn functions
- [ ] Add fee distribution logic (70/20/10 split)
- [ ] Implement oracle integration for fiat peg
- [ ] Add emergency pause mechanism
- [ ] Write comprehensive unit tests

### Phase 2.2: Router API
- [ ] Build request validation and authentication
- [ ] Implement node selection algorithm
- [ ] Create priority queue system
- [ ] Add retry logic with exponential backoff
- [ ] Build monitoring dashboard

### Phase 2.3: LLM Node Integration
- [ ] Update NS-LLM with request handler
- [ ] Implement model loading and caching
- [ ] Add response validation
- [ ] Create validator registration UI
- [ ] Build reputation tracking system

---

**Last Updated:** November 30, 2025  
**Owner:** Agent 4 (Full Stack Dev) + LLM Integration Team  
**Status:** Architecture Defined - Ready for Implementation

**Next Step:** Design NSD Smart Contract implementation details (Solana program architecture).
