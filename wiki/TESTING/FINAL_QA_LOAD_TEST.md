# Final QA and Load Testing Plan
## Mandatory Pre-Launch Acceptance Criteria (Weeks 3-4)

> **Critical**: This document defines the non-negotiable performance and stability metrics required for the Go/No-Go decision on December 23, 2025. All tests must pass successfully before January 3, 2026 mainnet launch.

---

## Overview

**Test Window:** December 16-22, 2025 (Week 4 of Sprint)  
**Test Environment:** Staging network (mainnet-equivalent configuration)  
**Test Duration:** 72-hour sustained stability test + targeted load tests  
**Go/No-Go Decision:** December 23, 2025

**Test Scope:**
- Router API integration
- Validator Client V0.2.0 stability
- NSD/NST Solana program correctness
- Economic attack resilience
- Failover and recovery mechanisms

---

## 1. Network Stability and Consensus Acceptance Criteria

**Objective:** Ensure the core Proof-of-Stake chain remains stable and adheres to the 8.5-second block time under various conditions.

### Test Matrix

| Test ID | Test Case | Target Metric | Required Result | Priority |
|:--------|:----------|:--------------|:----------------|:---------|
| **STB-001** | Block Time Determinism | 8.5 seconds | Average block time ≤ 9.0s over 72 hours | P0 |
| **STB-002** | Transaction Finality | 1 block | 100% of transactions finalized within first block | P0 |
| **STB-003** | Network Uptime | 99.9% | Consensus layer maintains 99.9% uptime during 72h test | P0 |
| **STB-004** | Time Sync Resilience | N/A | Chain does not halt/fork with ±2s clock drift on 10% validators | P1 |

### STB-001: Block Time Determinism

**Test Procedure:**
```bash
# Run 72-hour block time measurement
./scripts/measure_block_time.sh --duration=72h --network=staging

# Expected output:
# Total blocks: 30,506
# Average block time: 8.47s
# Min: 8.1s, Max: 9.0s, Std Dev: 0.3s
# PASS: Average ≤ 9.0s
```

**Success Criteria:**
- ✅ Average block time: 8.0s - 9.0s
- ✅ Standard deviation: < 0.5s
- ✅ No blocks > 12s (timeout threshold)
- ✅ 99.5% of blocks within 8.0-9.0s range

**Monitoring:**
```sql
-- Query block times from indexer
SELECT 
  AVG(block_time_seconds) as avg_block_time,
  STDDEV(block_time_seconds) as std_dev,
  MIN(block_time_seconds) as min_time,
  MAX(block_time_seconds) as max_time,
  COUNT(*) as total_blocks
FROM blocks
WHERE created_at > NOW() - INTERVAL '72 hours';

-- Expected: avg_block_time ≤ 9.0
```

---

### STB-002: Transaction Finality

**Test Procedure:**
```typescript
// Submit 10,000 test transactions
for (let i = 0; i < 10000; i++) {
  const tx = await submitTestTransaction();
  
  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(tx.signature);
  
  // Verify finalized in first block
  assert(confirmation.value.confirmationStatus === 'finalized');
  assert(confirmation.value.slot === tx.slot); // Same slot = first block
}

// Expected: 100% finalized in first block
```

**Success Criteria:**
- ✅ 100% of transactions finalized in first block
- ✅ Zero transaction timeouts
- ✅ Zero rollbacks or reorganizations

---

### STB-003: Network Uptime

**Test Procedure:**
```bash
# Monitor consensus layer uptime via health endpoint
while true; do
  response=$(curl -s http://consensus-node:8080/health)
  if [ $? -ne 0 ] || [ "$(echo $response | jq -r '.status')" != "healthy" ]; then
    echo "$(date): DOWNTIME DETECTED"
    # Log downtime event
  fi
  sleep 5
done

# Run for 72 hours, calculate uptime percentage
# Uptime = (Total Time - Downtime) / Total Time
# Required: Uptime ≥ 99.9%
```

**Success Criteria:**
- ✅ Maximum allowed downtime: 4.32 minutes over 72 hours
- ✅ No single outage > 2 minutes
- ✅ Mean Time Between Failures (MTBF): > 24 hours

**Downtime Calculation:**
```
72 hours = 259,200 seconds
99.9% uptime = 259,200 * 0.999 = 258,940.8 seconds
Max downtime = 259,200 - 258,940.8 = 259.2 seconds = 4.32 minutes
```

---

### STB-004: Time Sync Resilience

**Test Procedure:**
```bash
# Introduce ±2 second clock drift on 10% of validators
TOTAL_VALIDATORS=100
DRIFT_COUNT=10  # 10%

for i in $(seq 1 $DRIFT_COUNT); do
  validator=$(shuf -n 1 validators.txt)
  
  # Randomly drift +2s or -2s
  drift=$((RANDOM % 2 == 0 ? 2 : -2))
  
  ssh $validator "sudo date -s '+${drift} seconds'"
  echo "Applied ${drift}s drift to $validator"
done

# Monitor for chain halt or fork
./scripts/monitor_chain_health.sh --duration=1h

# Expected: No halt, no fork detected
```

**Success Criteria:**
- ✅ Chain continues producing blocks
- ✅ No chain forks detected
- ✅ Drifted validators auto-sync within 5 minutes
- ✅ No consensus failures logged

---

## 2. Router and LLM Inference Load Testing

**Objective:** Verify the Decentralized Router API and Validator Clients can handle high transaction volume and concurrent LLM requests without failure.

### Test Matrix

| Test ID | Test Case | Target Metric | Required Result | Priority |
|:--------|:----------|:--------------|:----------------|:---------|
| **LDT-001** | Peak Load Stress | 1,000 RPS | Sustained for 1 hour, error rate ≤ 5% | P0 |
| **LDT-002** | Inference Latency | P95 Latency | P95 end-to-end latency ≤ 500ms | P0 |
| **LDT-003** | NSD Split Integrity | 100% | 100% of fees adhere to 70/20/10 split | P0 |
| **LDT-004** | Fee Claim Throughput | 1,000 tx/min | Validators claim fees without RPC congestion | P1 |

### LDT-001: Peak Load Stress Test

**Test Procedure:**
```bash
# Use Apache Bench for load generation
ab -n 3600000 \  # 1M requests/hour at 1000 RPS
   -c 1000 \     # 1000 concurrent requests
   -t 3600 \     # 1 hour duration
   -p request.json \
   -T 'application/json' \
  -H 'Authorization: Bearer [REDACTED_TEST_TOKEN]' \
   https://router.neuroswarm.io/api/v1/request/submit

# Monitor error rate
# Target: Error rate ≤ 5% (50,000 errors / 1M requests)
```

**Request Payload:**
```json
{
  "user_wallet": "test_wallet_${RANDOM}",
  "prompt": "Explain ${RANDOM_TOPIC}",
  "model_id": "llama-2-7b-q4",
  "max_tokens": 500,
  "temperature": 0.7,
  "nsd_fee_amount": 55000000,
  "burn_tx_signature": "mock_tx_${RANDOM}",
  "signature": "mock_signature"
}
```

**Success Criteria:**
- ✅ Total requests: 3,600,000 (1,000 RPS × 3,600s)
- ✅ Successful requests: ≥ 3,420,000 (95%)
- ✅ Failed requests: ≤ 180,000 (5%)
- ✅ No cascading failures
- ✅ Router API uptime: 100%
- ✅ Database connection pool stable

**Monitoring Queries:**
```sql
-- Real-time error rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) as total_count,
  (COUNT(*) FILTER (WHERE status = 'failed')::float / COUNT(*)) * 100 as error_rate
FROM jobs
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Expected: error_rate ≤ 5.0
```

---

### LDT-002: Inference Latency (P95)

**Test Procedure:**
```typescript
// Measure end-to-end latency for 10,000 requests
const latencies: number[] = [];

for (let i = 0; i < 10000; i++) {
  const start = Date.now();
  
  // Submit request
  const { job_id } = await submitRequest(testPrompt);
  
  // Poll for completion
  let result;
  while (!result) {
    result = await checkStatus(job_id);
    if (result.status === 'completed') break;
    await sleep(100);
  }
  
  const end = Date.now();
  latencies.push(end - start);
}

// Calculate P95
latencies.sort((a, b) => a - b);
const p95_index = Math.floor(latencies.length * 0.95);
const p95_latency = latencies[p95_index];

console.log(`P95 Latency: ${p95_latency}ms`);
// Expected: p95_latency ≤ 500ms
```

**Success Criteria:**
- ✅ P50 latency: ≤ 200ms
- ✅ P95 latency: ≤ 500ms
- ✅ P99 latency: ≤ 1000ms
- ✅ No requests > 5000ms (timeout)

**Latency Breakdown Target:**
```
Total P95 Latency: 500ms
├─ Router validation: 50ms
├─ Validator selection: 20ms
├─ NSD burn verification: 100ms
├─ Request routing: 30ms
├─ LLM inference: 250ms
└─ Response delivery: 50ms
```

---

### LDT-003: NSD Split Integrity

**Test Procedure:**
```sql
-- Verify fee split on 10,000 random completed requests
SELECT 
  r.job_id,
  r.nsd_burned,
  r.validator_fee,
  r.treasury_fee,
  r.permanent_burn,
  -- Verify 70/20/10 split
  ABS((r.validator_fee::float / r.nsd_burned) - 0.70) < 0.001 as validator_correct,
  ABS((r.treasury_fee::float / r.nsd_burned) - 0.20) < 0.001 as treasury_correct,
  ABS((r.permanent_burn::float / r.nsd_burned) - 0.10) < 0.001 as burn_correct
FROM request_accounts r
TABLESAMPLE SYSTEM (10)  -- Random 10% sample
LIMIT 10000;

-- Expected: 100% of rows have all three *_correct = true
```

**Success Criteria:**
- ✅ 100% of requests adhere to 70/20/10 split (within 0.1% tolerance)
- ✅ No rounding errors that accumulate
- ✅ Fee sum equals burned amount: `validator_fee + treasury_fee + permanent_burn = nsd_burned`

**Validation Formula:**
```typescript
function validateFees(nsd_burned: number): boolean {
  const validator_fee = Math.floor(nsd_burned * 0.70);
  const treasury_fee = Math.floor(nsd_burned * 0.20);
  const permanent_burn = nsd_burned - validator_fee - treasury_fee; // Remainder
  
  // Verify split percentages (with 0.1% tolerance)
  const validator_pct = validator_fee / nsd_burned;
  const treasury_pct = treasury_fee / nsd_burned;
  const burn_pct = permanent_burn / nsd_burned;
  
  return (
    Math.abs(validator_pct - 0.70) < 0.001 &&
    Math.abs(treasury_pct - 0.20) < 0.001 &&
    Math.abs(burn_pct - 0.10) < 0.001 &&
    (validator_fee + treasury_fee + permanent_burn) === nsd_burned
  );
}
```

---

### LDT-004: Fee Claim Throughput

**Test Procedure:**
```bash
# Simulate 1,000 validators claiming fees simultaneously
for i in {1..1000}; do
  (
    # Each validator claims fee for completed request
    solana program invoke \
      --program-id $NSD_PROGRAM_ID \
      --instruction complete_request \
      --signer validator_${i}.json \
      --args job_id_${i}
  ) &
done

wait

# Measure throughput
# Target: All 1,000 claims complete within 60 seconds (1,000 tx/min)
```

**Success Criteria:**
- ✅ All 1,000 transactions confirmed within 60 seconds
- ✅ Zero transaction failures
- ✅ Solana RPC endpoint responsive (latency < 500ms)
- ✅ No rate limiting errors

**RPC Monitoring:**
```bash
# Monitor RPC request rate
curl -X POST https://api.mainnet-beta.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getRecentPerformanceSamples","params":[10]}' \
  | jq '.result[] | {slot, numTransactions, numSlots, samplePeriodSecs}'

# Expected: Sustained TPS > 1,000
```

---

## 3. Failover and Economic Attack Resilience

**Objective:** Test the network's ability to recover from failures and resist malicious economic attempts.

### Test Matrix

| Test ID | Test Case | Target Metric | Required Result | Priority |
|:--------|:----------|:--------------|:----------------|:---------|
| **FLR-001** | Validator Failure (Hard Kill) | 5% | Routing continues without interruption | P0 |
| **FLR-002** | Timeout & Retry Logic | 100% | All timeouts trigger retry correctly | P0 |
| **FLR-003** | Final Refund Validation | 95% | 100% of final failures trigger 95% refund | P0 |
| **FLR-004** | Reputation Slashing Test | -10 points | All failures apply -10 reputation penalty | P1 |

### FLR-001: Validator Failure (Hard Kill)

**Test Procedure:**
```bash
# Start with 100 active validators
TOTAL_VALIDATORS=100
KILL_COUNT=5  # 5%

# Submit 1,000 concurrent requests
for i in {1..1000}; do
  curl -X POST https://router.neuroswarm.io/api/v1/request/submit \
    -d @request_${i}.json &
done

# Wait 5 seconds for routing
sleep 5

# Randomly kill 5 validators (hard kill -9)
for i in $(seq 1 $KILL_COUNT); do
  validator=$(shuf -n 1 active_validators.txt)
  ssh $validator "sudo pkill -9 validator-client"
  echo "KILLED: $validator"
done

# Monitor request completion
# Expected: All 1,000 requests complete (retry to other validators)
```

**Success Criteria:**
- ✅ 100% of requests complete (no dropped requests)
- ✅ Failed requests automatically retry to backup validators
- ✅ Retry latency: < 5 seconds
- ✅ Router detects offline validators within 30 seconds

**Monitoring:**
```javascript
// Track validator failures
const failedValidators = [];
const retriedRequests = [];

setInterval(async () => {
  const health = await fetch('http://router/api/validator/health');
  const validators = await health.json();
  
  validators.forEach(v => {
    if (v.status === 'offline' && !failedValidators.includes(v.id)) {
      failedValidators.push(v.id);
      console.log(`Validator ${v.id} detected offline`);
    }
  });
}, 5000);

// Expected: 5 validators detected offline within 30s
```

---

### FLR-002: Timeout & Retry Logic

**Test Procedure:**
```typescript
// Simulate 100 requests that timeout (validator doesn't respond)
const timeoutRequests = [];

for (let i = 0; i < 100; i++) {
  const job_id = await submitRequest({
    ...testRequest,
    // Route to a validator we'll manually pause
    force_validator: 'validator_timeout_test'
  });
  
  timeoutRequests.push(job_id);
}

// Pause the validator to force timeout
await pauseValidator('validator_timeout_test');

// Wait 65 seconds (60s timeout + 5s buffer)
await sleep(65000);

// Verify all requests were retried
for (const job_id of timeoutRequests) {
  const job = await db.jobs.findOne({ id: job_id });
  
  assert(job.retry_count >= 1, `Job ${job_id} was not retried`);
  assert(job.status === 'queued' || job.status === 'processing',
    `Job ${job_id} not re-queued after timeout`);
}

// Expected: 100% of jobs have retry_count ≥ 1
```

**Success Criteria:**
- ✅ 100% of timeout requests trigger retry within 5 seconds
- ✅ Retry count incremented correctly
- ✅ Original validator marked as failed
- ✅ New validator selected with second-highest priority score

---

### FLR-003: Final Refund Validation

**Test Procedure:**
```typescript
// Simulate requests that fail 3 times (max retries)
for (let i = 0; i < 100; i++) {
  const job_id = await submitRequest(testRequest);
  
  // Force 3 consecutive failures
  for (let retry = 0; retry < 3; retry++) {
    // Wait for validator assignment
    await waitForStatus(job_id, 'processing');
    
    // Kill assigned validator
    const job = await db.jobs.findOne({ id: job_id });
    await killValidator(job.assigned_validator);
    
    // Wait for timeout and retry
    await sleep(65000);
  }
  
  // After 3rd failure, verify refund
  await sleep(10000); // Wait for refund processing
  
  const finalJob = await db.jobs.findOne({ id: job_id });
  const refundTx = await solana.getTransaction(finalJob.refund_tx_signature);
  
  // Verify 95% refund
  const expectedRefund = Math.floor(finalJob.nsd_burned * 0.95);
  assert(finalJob.refund_amount === expectedRefund,
    `Refund amount incorrect: ${finalJob.refund_amount} vs ${expectedRefund}`);
  
  assert(refundTx && !refundTx.meta?.err,
    `Refund transaction failed for job ${job_id}`);
}

// Expected: 100% of jobs refunded correctly
```

**Success Criteria:**
- ✅ 100% of jobs with 3 failed retries trigger refund
- ✅ Refund amount = 95% of burned NSD (within 1% tolerance)
- ✅ Refund transaction confirmed on-chain
- ✅ User balance updated correctly
- ✅ Job status = 'refunded'

**Refund Validation:**
```sql
-- Verify refunds for all failed jobs
SELECT 
  job_id,
  nsd_burned,
  refund_amount,
  refund_tx_signature,
  -- Verify 95% refund
  ABS((refund_amount::float / nsd_burned) - 0.95) < 0.01 as refund_correct,
  -- Verify transaction exists
  refund_tx_signature IS NOT NULL as tx_exists
FROM jobs
WHERE status = 'refunded' AND retry_count = 3
LIMIT 100;

-- Expected: 100% have refund_correct = true AND tx_exists = true
```

---

### FLR-004: Reputation Slashing Test

**Test Procedure:**
```typescript
// Cause 50 intentional failures across 10 validators
const validatorFailures = new Map<string, number>();

for (let i = 0; i < 50; i++) {
  const validator_id = `validator_${i % 10}`; // Distribute across 10 validators
  
  // Submit request assigned to this validator
  const job_id = await submitRequest({
    ...testRequest,
    force_validator: validator_id
  });
  
  // Wait for processing
  await waitForStatus(job_id, 'processing');
  
  // Cause failure (validator reports error)
  await validatorClient[validator_id].reportFailure(job_id);
  
  // Track expected slashing
  validatorFailures.set(validator_id, (validatorFailures.get(validator_id) || 0) + 1);
}

// Wait for reputation updates
await sleep(10000);

// Verify reputation slashing
for (const [validator_id, failure_count] of validatorFailures.entries()) {
  const validator = await db.validators.findOne({ id: validator_id });
  
  const expectedReputation = 100 - (failure_count * 10); // -10 per failure
  
  assert(validator.reputation === expectedReputation,
    `Validator ${validator_id} reputation incorrect: ${validator.reputation} vs ${expectedReputation}`);
}

// Expected: All 10 validators have correct reputation penalties
```

**Success Criteria:**
- ✅ Each failure applies exactly -10 reputation points
- ✅ Reputation updates immediately after failure
- ✅ Reputation never goes below 0
- ✅ Slashed validators deprioritized in selection algorithm

**Reputation Tracking:**
```sql
-- Verify reputation slashing
SELECT 
  validator_id,
  reputation,
  total_jobs,
  successful_jobs,
  (total_jobs - successful_jobs) as failed_jobs,
  -- Expected reputation based on failures
  (100 - ((total_jobs - successful_jobs) * 10)) as expected_reputation,
  -- Verify match
  reputation = (100 - ((total_jobs - successful_jobs) * 10)) as reputation_correct
FROM validators
WHERE id IN ('validator_0', 'validator_1', ..., 'validator_9');

-- Expected: 100% have reputation_correct = true
```

---

## 4. Acceptance Sign-Off Criteria

### Go/No-Go Decision Matrix (December 23, 2025)

**MANDATORY (All Must Pass):**

| Category | Requirement | Status |
|:---------|:------------|:-------|
| **Security Audit** | All P0/P1 findings remediated | ☐ |
| **Block Time** | STB-001: Average ≤ 9.0s over 72h | ☐ |
| **Transaction Finality** | STB-002: 100% finalized in first block | ☐ |
| **Network Uptime** | STB-003: ≥ 99.9% over 72h | ☐ |
| **Load Test** | LDT-001: 1,000 RPS sustained, ≤5% error rate | ☐ |
| **Latency** | LDT-002: P95 ≤ 500ms | ☐ |
| **Fee Split** | LDT-003: 100% integrity | ☐ |
| **Failover** | FLR-001: 5% validator loss handled | ☐ |
| **Retry Logic** | FLR-002: 100% timeout retries | ☐ |
| **Refund Logic** | FLR-003: 100% final refunds | ☐ |

**ADDITIONAL CRITERIA:**

- [ ] Minimum 50 validators registered and staked
- [ ] All validators running V0.2.0 client
- [ ] Router API deployed with 3+ instances (HA)
- [ ] Monitoring dashboards operational
- [ ] Incident response playbook tested
- [ ] Emergency pause mechanism verified

### Go/No-Go Voting

**Required Approvals:**
- [ ] Technical Lead (Security sign-off)
- [ ] QA Lead (All tests passed)
- [ ] Product Owner (Feature completeness)
- [ ] CEO/Founder (Final go-ahead)

**No-Go Triggers (Any One Fails Launch):**
- ❌ Any P0 security vulnerability unresolved
- ❌ Any MANDATORY test failure
- ❌ <30 validators available
- ❌ Network uptime <99%
- ❌ Load test error rate >10%

---

## 5. Test Execution Timeline

### Week 4 Testing Schedule (Dec 16-22)

**Monday Dec 16:**
- [ ] Deploy staging environment
- [ ] Start 72-hour stability test (STB-001, STB-002, STB-003)
- [ ] Begin load test prep

**Tuesday Dec 17:**
- [ ] Execute LDT-001 (Peak Load Stress)
- [ ] Execute LDT-002 (Latency Test)
- [ ] Monitor 72h stability (ongoing)

**Wednesday Dec 18:**
- [ ] Execute LDT-003 (Fee Split Integrity)
- [ ] Execute LDT-004 (Fee Claim Throughput)
- [ ] Execute STB-004 (Time Sync Resilience)

**Thursday Dec 19:**
- [ ] Execute FLR-001 (Validator Failure)
- [ ] Execute FLR-002 (Timeout & Retry)
- [ ] 72h stability test completes (6 AM)

**Friday Dec 20:**
- [ ] Execute FLR-003 (Refund Validation)
- [ ] Execute FLR-004 (Reputation Slashing)
- [ ] Analyze all test results

**Saturday Dec 21:**
- [ ] Remediate any failures
- [ ] Re-run failed tests
- [ ] Generate final QA report

**Sunday Dec 22:**
- [ ] Final verification
- [ ] Prepare Go/No-Go presentation
- [ ] Submit recommendation to leadership

**Monday Dec 23:**
- [ ] **GO/NO-GO DECISION** (9 AM meeting)

---

## 6. Reporting & Documentation

### Test Results Format

**Per-Test Report:**
```markdown
# Test Report: LDT-001 (Peak Load Stress)
**Date:** December 17, 2025
**Duration:** 1 hour
**Tester:** QA Team

## Results
- Total Requests: 3,600,000
- Successful: 3,456,000 (96%)
- Failed: 144,000 (4%)
- **Status:** ✅ PASS (error rate ≤ 5%)

## Metrics
- Peak RPS: 1,050
- Average RPS: 1,000
- P95 Latency: 450ms
- Router Uptime: 100%

## Issues Found
- None

## Recommendations
- Proceed to next test
```

### Final QA Report

**Required Sections:**
1. Executive Summary
2. Test Coverage Matrix
3. Pass/Fail Results for Each Test
4. Performance Benchmarks
5. Issues & Remediations
6. Go/No-Go Recommendation
7. Risk Assessment

---

**Last Updated:** November 30, 2025  
**Owner:** QA Lead + Agent 5 (Scrum Master)  
**Status:** Test Plan Finalized - Ready for Execution

**Next: Phase 4 - Validator Recruitment Campaign** 🚀
