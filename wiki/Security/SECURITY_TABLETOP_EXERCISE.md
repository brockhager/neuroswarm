# Security Tabletop Exercise: Fee Split Bypass Attack
## Critical Economic Exploit Response Playbook

> **Purpose**: This document provides a detailed, time-sequenced playbook for detecting, verifying, mitigating, and recovering from a critical economic exploit. This tabletop exercise prepares the Security and Operations teams for a live crisis scenario during the mainnet launch.

---

## Exercise Overview

**Scenario:** Fee Split Bypass Attack  
**Attack Type:** Critical Economic Exploit  
**Threat Level:** CRITICAL (P0)  
**Estimated Impact:** $100K+ potential loss if not contained within 1 hour  
**Exercise Duration:** 4-8 hours (simulated real-time response)

**Attack Vector:**
A malicious validator discovers a vulnerability in the NSD Solana Program's `complete_request` instruction that allows them to bypass the intended 70/20/10 fee split, claiming 100% of burned NSD fees instead of the allocated 70%.

**Vulnerability Details:**
```rust
// VULNERABLE CODE (hypothetical)
pub fn complete_request(ctx: Context<CompleteRequest>, job_id: String) -> Result<()> {
    let request = &mut ctx.accounts.request;
    let validator_fee = request.nsd_burned; // BUG: Should be request.nsd_burned * 0.70
    
    // Transfer full amount to validator (EXPLOIT!)
    token::transfer(
        CpiContext::new(/*...*/),
        validator_fee // Should be 70%, but transfers 100%
    )?;
    
    Ok(())
}
```

**Exploitation Timeline:**
- **T+0**: Malicious validator discovers vulnerability
- **T+2h**: Validator begins systematic exploitation
- **T+4h**: Monitoring system detects anomaly
- **T+4h 15m**: Security team confirms exploit
- **T+4h 30m**: Emergency pause activated
- **T+8h**: Patch deployed, network resumed

---

## Phase 1: Detection (T+0 to T+15 min)

### 1.1 Anomaly Detection

**Monitoring Dashboard Alert:**
```
ALERT: Fee Distribution Anomaly Detected
Time: 2026-01-03 04:23:47 UTC (T+4h 23m post-genesis)
Severity: CRITICAL

Anomaly Details:
- Validator: validator_malicious_abc123
- Jobs completed: 47 in last hour
- Expected validator fee (70%): 3,290 NSD
- Actual validator fee claimed: 4,700 NSD (100%)
- Treasury fee expected (20%): 940 NSD
- Treasury fee received: 0 NSD
- Permanent burn expected (10%): 470 NSD
- Permanent burn executed: 0 NSD

Discrepancy: +1,410 NSD excess claim (42.9% over expected)
```

**Detection Methods:**
1. **Automated Monitoring**: Prometheus alerts trigger on fee split ratio deviation >5%
2. **Manual Review**: Security team daily audit of top 10 validators by fees claimed
3. **Community Report**: User notices treasury balance not increasing as expected

---

### 1.2 Initial Response Checklist

**Immediate Actions (0-5 min):**
- [ ] Alert received by on-call security engineer
- [ ] Acknowledge alert in PagerDuty
- [ ] Screenshot monitoring dashboard (preserve evidence)
- [ ] Pull raw transaction logs for suspicious validator
- [ ] Initiate emergency team assembly

**Team Assembly (5-15 min):**
- [ ] **Incident Commander**: Technical Lead (primary decision maker)
- [ ] **Security Engineer**: Vulnerability analyst
- [ ] **Smart Contract Dev**: NSD Program expert
- [ ] **DevOps**: Infrastructure and deployment
- [ ] **Communications**: Community manager (standby)

**Communication Channels:**
- **Primary**: Signal group "NeuroSwarm Emergency Response"
- **Backup**: Discord private channel #emergency-response
- **Conference**: Zoom emergency room (always-on link)

---

## Phase 2: Verification (T+15 to T+30 min)

### 2.1 Confirm Exploit vs Legitimate Behavior

**Verification Checklist:**

**Step 1: Transaction Analysis**
```bash
# Pull all transactions from suspicious validator
solana transaction-history validator_malicious_abc123 \
  --url mainnet-beta \
  --limit 100 > validator_tx_history.json

# Analyze fee distribution for each completed request
cat validator_tx_history.json | jq '.[] | select(.meta.err == null) | {
  signature: .transaction.signatures[0],
  fee_claimed: .meta.postTokenBalances[0].uiTokenAmount.uiAmount,
  expected_fee: (.meta.logMessages | select(contains("NSD_BURNED")) | tonumber * 0.70)
}'
```

**Expected Output (Legitimate):**
```json
{
  "signature": "5j8k...",
  "fee_claimed": 38.5,
  "expected_fee": 38.5
}
```

**Actual Output (Exploit Confirmed):**
```json
{
  "signature": "5j8k...",
  "fee_claimed": 55.0,  // 100% instead of 70%
  "expected_fee": 38.5
}
```

---

**Step 2: Smart Contract Code Review**
```bash
# Decompile deployed program to verify source
solana program dump NSD_PROGRAM_ID nsd_program.so
# Compare with audited source code checksum
sha256sum nsd_program.so
# Expected: 7f4a3c2b... (matches audited code)
# Actual: 7f4a3c2b... (MATCH - exploit is in logic, not backdoor)
```

**Step 3: Reproduce Exploit (Testnet)**
```bash
# Deploy same program version to testnet
solana program deploy nsd_program.so --url testnet

# Attempt to exploit fee split
./scripts/test-exploit-fee-split.sh

# Expected: Exploit reproduced, confirms vulnerability
```

---

### 2.2 Impact Assessment

**Damage Calculation:**
```sql
-- Query total excess fees claimed by malicious validator
SELECT 
  validator_id,
  COUNT(*) as jobs_exploited,
  SUM(fee_claimed) as total_claimed,
  SUM(fee_claimed * 0.70) as expected_claim,
  SUM(fee_claimed - (fee_claimed * 0.70)) as excess_stolen
FROM completed_requests
WHERE validator_id = 'validator_malicious_abc123'
  AND created_at > '2026-01-03 00:00:00';

-- Result:
-- jobs_exploited: 47
-- total_claimed: 4,700 NSD
-- expected_claim: 3,290 NSD
-- excess_stolen: 1,410 NSD (~$1.41 @ $0.001/NSD peg)
```

**Projected Loss if Not Stopped:**
- Current rate: 47 jobs/hour × 30 NSD avg excess = 1,410 NSD/hour
- 24-hour projection: 33,840 NSD (~$33.84)
- 7-day projection: 236,880 NSD (~$236.88)
- **If exploit becomes public**: All validators exploit → 100% treasury loss

**Severity Classification:** CRITICAL (P0)
- Treasury completely drained within 7 days
- Permanent burn mechanism broken (no deflationary pressure)
- Economic model fundamentally compromised

---

## Phase 3: Emergency Response (T+30 to T+60 min)

### 3.1 Emergency Pause Decision

**GO/NO-GO Decision Tree:**

```
Is exploit confirmed? (YES/NO)
├─ YES: Proceed to Pause Authorization
└─ NO: Continue monitoring, escalate to P1

Is financial impact >$100 projected in 24h? (YES/NO)
├─ YES: Proceed to Pause Authorization
└─ NO: Attempt targeted validator suspension first

Can exploit be patched within 4 hours? (YES/NO)
├─ YES: Proceed to Pause Authorization
└─ NO: Extend to 8-hour window, communicate delay

Are ≥3 of 5 Foundation board members available? (YES/NO)
├─ YES: Initiate pause vote
└─ NO: CEO emergency override (requires 4/5 ratification within 24h)
```

**Pause Authorization:**
```
EMERGENCY PAUSE VOTE (3-of-5 multisig required)

Vote tallies:
✅ Technical Lead: GO (critical economic threat)
✅ Security Lead: GO (verified exploit)
✅ CEO: GO (protect user funds)
⏳ Board Member 1: [Awaiting response]
⏳ Board Member 2: [Awaiting response]

Result: 3/5 APPROVED - Emergency Pause Authorized
Time: T+35 min (2026-01-03 04:58:00 UTC)
```

---

### 3.2 Execute Emergency Pause

**Pause Procedure:**
```bash
# Step 1: Initiate pause from emergency multisig
solana program invoke NSD_PROGRAM_ID \
  --instruction emergency_pause \
  --signer emergency_key_1.json \
  --signer emergency_key_2.json \
  --signer emergency_key_3.json \
  --url mainnet-beta

# Expected output:
# Transaction signature: 7m9n...
# Status: Confirmed
# NSD Program: PAUSED

# Step 2: Verify pause status
solana account NSD_MINT_ACCOUNT --url mainnet-beta | grep "paused"
# Expected: paused: true

# Step 3: Stop Router API (all instances)
kubectl scale deployment router-api --replicas=0

# Step 4: Notify all validators (automated webhook)
curl -X POST https://router.neuroswarm.io/api/emergency/broadcast \
  -d '{"message":"Network paused for emergency maintenance. ETA: 4 hours."}'
```

**Pause Effects:**
- ✅ All new LLM requests rejected
- ✅ No new fee distributions possible
- ✅ Validator block rewards continue (consensus active)
- ✅ Users can still withdraw/unstake (safety measure)
- ❌ Router API offline
- ❌ All in-flight requests fail (refunds processed post-resume)

---

### 3.3 Immediate Communication

**T+35 min: Public Announcement**

**Twitter/X Post:**
```
🚨 NETWORK MAINTENANCE 🚨

NeuroSwarm mainnet is temporarily paused for emergency maintenance.

✅ User funds are SAFE
✅ No funds at risk
⏱️ Estimated downtime: 4 hours
📊 Status: https://status.neuroswarm.io

We will provide updates every 30 minutes.

#NeuroSwarm #Transparency
```

**Discord Announcement:**
```
@everyone 

🛑 EMERGENCY MAINTENANCE IN PROGRESS

The NeuroSwarm network has been paused to address a critical issue.

**IMPORTANT:**
✅ Your funds are completely safe
✅ No user action required
✅ Staked NST is secure
✅ All wallets remain accessible

**Timeline:**
- Pause initiated: 04:58 UTC
- Estimated fix: 4 hours
- Next update: 05:30 UTC (30 min)

**Status Dashboard:** https://status.neuroswarm.io

Our team is working to resolve this ASAP. Thank you for your patience.

- NeuroSwarm Team
```

**Status Page Update:**
```
https://status.neuroswarm.io

🔴 MAJOR OUTAGE
Network Status: PAUSED
Started: 2026-01-03 04:58 UTC
Affected Services: LLM Requests, Router API
Unaffected: Block production, Staking, Wallets

Issue: Critical smart contract maintenance
ETA: 4 hours (09:00 UTC)
Last Update: 05:00 UTC

Updates will be posted every 30 minutes.
```

---

## Phase 4: Patch Development (T+1h to T+4h)

### 4.1 Vulnerability Fix

**Root Cause Analysis:**
```rust
// VULNERABLE CODE:
pub fn complete_request(ctx: Context<CompleteRequest>, job_id: String) -> Result<()> {
    let request = &mut ctx.accounts.request;
    let validator_fee = request.nsd_burned; // ❌ BUG: Missing 0.70 multiplier
    
    token::transfer(/*...*/, validator_fee)?; // Transfers 100%
    Ok(())
}
```

**PATCHED CODE:**
```rust
// FIXED VERSION:
pub fn complete_request(ctx: Context<CompleteRequest>, job_id: String) -> Result<()> {
    let request = &mut ctx.accounts.request;
    
    // Calculate 70/20/10 split
    let total_burned = request.nsd_burned;
    let validator_fee = total_burned.checked_mul(70).unwrap().checked_div(100).unwrap();
    let treasury_fee = total_burned.checked_mul(20).unwrap().checked_div(100).unwrap();
    let permanent_burn = total_burned.checked_sub(validator_fee).unwrap().checked_sub(treasury_fee).unwrap();
    
    // Verify split adds up to 100%
    require!(
        validator_fee + treasury_fee + permanent_burn == total_burned,
        ErrorCode::FeeSplitMismatch
    );
    
    // Transfer correct amounts
    token::transfer(/*...*/, validator_fee)?; // 70%
    token::transfer(/*...*/, treasury_fee)?;  // 20%
    token::burn(/*...*/, permanent_burn)?;    // 10%
    
    Ok(())
}
```

---

### 4.2 Patch Testing (Testnet)

**Test Suite:**
```bash
# Deploy patched program to testnet
solana program deploy nsd_program_patched.so --url testnet

# Run comprehensive test suite
pnpm run test:fee-split

# Test cases:
✅ Normal request (55 NSD): 38.5 validator, 11 treasury, 5.5 burn
✅ Edge case (1 NSD): 0.7 validator, 0.2 treasury, 0.1 burn
✅ Large request (10000 NSD): 7000 validator, 2000 treasury, 1000 burn
✅ Exploit attempt: REJECTED with ErrorCode::FeeSplitMismatch
✅ Treasury balance increases correctly
✅ Permanent burn counter increments

All tests passed: 47/47 ✅
```

---

### 4.3 Security Re-Audit (Expedited)

**Audit Checklist:**
- [ ] Code review by 3 independent engineers
- [ ] Static analysis (Anchor verify)
- [ ] Fuzzing test (1000 random inputs)
- [ ] Formal verification of fee split math
- [ ] Comparison with audited source (diff)

**Audit Result:**
```
SECURITY AUDIT: PASSED ✅

Reviewed by:
- Senior Smart Contract Engineer (NeuroSwarm)
- External Auditor (Audit Firm)
- Community Security Researcher

Findings: 0 critical, 0 high, 0 medium, 0 low

Recommendation: SAFE TO DEPLOY
Signed: [Digital Signatures]
Time: T+3h 45min
```

---

## Phase 5: Recovery & Deployment (T+4h to T+8h)

### 5.1 Mainnet Deployment

**Pre-Deployment Checklist:**
- [ ] Patch tested on testnet (PASS)
- [ ] Security audit complete (PASS)
- [ ] 3-of-5 multisig approval (APPROVED)
- [ ] Communication templates ready
- [ ] Rollback plan documented
- [ ] All validators notified of resume

**Deployment Procedure:**
```bash
# Step 1: Deploy patched program to mainnet
solana program deploy nsd_program_patched.so \
  --url mainnet-beta \
  --keypair mainnet_deployer.json \
  --with-compute-unit-price 10000

# Output:
# Program Id: NSD_PROGRAM_ID (unchanged)
# Transaction: 4k6j...
# Status: ✅ DEPLOYED

# Step 2: Verify deployment
solana program show NSD_PROGRAM_ID --url mainnet-beta
sha256sum <(solana program dump NSD_PROGRAM_ID)
# Expected: [NEW CHECKSUM] (matches patched code)

# Step 3: Test on mainnet (internal request)
./scripts/test-mainnet-fee-split.sh
# Expected: 70/20/10 split confirmed ✅
```

---

### 5.2 Network Resume

**Resume Procedure:**
```bash
# Step 1: Unpause NSD Program
solana program invoke NSD_PROGRAM_ID \
  --instruction emergency_unpause \
  --signer emergency_key_1.json \
  --signer emergency_key_2.json \
  --signer emergency_key_3.json

# Step 2: Restart Router API (gradual rollout)
kubectl scale deployment router-api --replicas=1
# Wait 5 min, monitor for issues
kubectl scale deployment router-api --replicas=3
# Wait 5 min, monitor for issues
# If stable, scale to full capacity

# Step 3: Process refunds for in-flight requests
./scripts/refund-paused-requests.sh
# Expected: All users receive 100% refund (exceptional circumstance)

# Step 4: Notify validators
curl -X POST https://router.neuroswarm.io/api/emergency/broadcast \
  -d '{"message":"Network resumed. Normal operations restored."}'
```

**Resume Verification:**
- [ ] NSD Program status: ACTIVE
- [ ] Router API: 3/3 instances healthy
- [ ] First post-resume request: Fee split verified (70/20/10)
- [ ] Treasury balance increasing correctly
- [ ] No alerts in monitoring dashboard

---

### 5.3 Public Communication (Resume)

**T+8h: All-Clear Announcement**

**Twitter/X Post:**
```
✅ NETWORK RESUMED ✅

NeuroSwarm mainnet is back online!

🔧 Issue resolved: Smart contract maintenance complete
⏱️ Total downtime: 4 hours 15 minutes
✅ All user funds safe (100% refunds issued)
🔒 Enhanced security measures deployed

Thank you for your patience!

Dashboard: https://stats.neuroswarm.io
Post-mortem: https://blog.neuroswarm.io/post-mortem-001

#NeuroSwarm #BackOnline
```

**Discord Announcement:**
```
@everyone 

✅ WE'RE BACK ONLINE ✅

The NeuroSwarm network has resumed normal operations.

**Summary:**
- Duration: 4 hours 15 minutes
- Issue: Smart contract fee distribution logic
- Resolution: Patch deployed and verified
- User Impact: Zero (all funds safe, 100% refunds issued)

**What's Next:**
- Detailed post-mortem published within 48h
- Security audit results (public)
- Enhanced monitoring deployed
- Bug bounty increased to $100K

**Current Status:** https://status.neuroswarm.io
All systems operational 🟢

Thank you for your understanding and support!

- NeuroSwarm Team
```

---

## Phase 6: Post-Incident Analysis (T+8h to T+72h)

### 6.1 Incident Timeline (Final)

| Time | Event | Actor | Impact |
|:-----|:------|:------|:-------|
| **T+0** | Genesis block | Network | Launch |
| **T+2h** | Exploit discovered | Malicious validator | None (private knowledge) |
| **T+4h** | Systematic exploitation begins | Malicious validator | 1,410 NSD stolen |
| **T+4h 23m** | Anomaly detected | Monitoring system | Alert triggered |
| **T+4h 30m** | Exploit confirmed | Security team | CRITICAL status |
| **T+4h 35m** | Emergency pause activated | Foundation multisig | Network paused |
| **T+4h 40m** | Public announcement | Communications | Community notified |
| **T+5h** | Vulnerability identified | Smart contract dev | Root cause found |
| **T+7h** | Patch developed & tested | Engineering team | Fix ready |
| **T+7h 45m** | Security re-audit complete | External auditor | SAFE TO DEPLOY |
| **T+8h** | Patch deployed to mainnet | DevOps | Network unpaused |
| **T+8h 15m** | Network resumed | Operations | Normal service restored |

**Total Downtime:** 4 hours 15 minutes  
**Total Loss:** 1,410 NSD (~$1.41 @ $0.001 peg)  
**User Impact:** Zero (100% refunds issued)

---

### 6.2 Root Cause Analysis

**What Went Wrong:**

1. **Code Review Gap**: Fee split logic not thoroughly reviewed during audit
   - **Mitigation**: Add explicit fee split test cases to audit scope

2. **Insufficient Testing**: Edge case (100% fee claim) not tested
   - **Mitigation**: Implement property-based testing with Hypothesis

3. **Delayed Detection**: 4 hours 23 minutes between exploit start and detection
   - **Mitigation**: Real-time fee split ratio alerts (1-minute granularity)

4. **Manual Verification Slow**: 15 minutes to confirm exploit
   - **Mitigation**: Automated exploit detection script

**What Went Right:**

1. ✅ **Monitoring Worked**: Anomaly detected within 23 minutes
2. ✅ **Team Response**: 5-minute assembly time (excellent)
3. ✅ **Emergency Pause**: Executed flawlessly (multisig worked)
4. ✅ **Communication**: Clear, frequent, transparent updates
5. ✅ **Patch Speed**: 3.5 hours from detection to deployment (under 4h target)
6. ✅ **User Protection**: 100% refunds issued, zero user loss

---

### 6.3 Lessons Learned

**Technical:**
- [ ] Add `require!` statements for all critical math operations
- [ ] Implement fee split verification in every `complete_request` call
- [ ] Deploy circuit breakers for abnormal fee distribution patterns
- [ ] Increase test coverage to 100% for financial logic

**Operational:**
- [ ] Reduce detection time from 23 min → 5 min (real-time alerts)
- [ ] Pre-stage emergency response team on launch day
- [ ] Have 2 auditors on standby during first 48 hours
- [ ] Automate refund processing (current: manual, slow)

**Communication:**
- [ ] Pre-write incident communication templates (done)
- [ ] Establish direct line to top crypto media outlets
- [ ] Create animated status dashboard (live updates)
- [ ] Host post-incident AMA within 24 hours

---

### 6.4 Remediation Actions

**Immediate (Within 24h):**
- [ ] Publish detailed post-mortem on blog
- [ ] Compensate affected users (100% refund + 10% bonus)
- [ ] Slash malicious validator (confiscate 5,000 NST stake)
- [ ] Add malicious validator to permanent blacklist

**Short-Term (Within 1 week):**
- [ ] Deploy enhanced monitoring (1-min fee split alerts)
- [ ] Increase bug bounty pool to $100K
- [ ] Conduct security AMA on Discord
- [ ] Publish updated audit report

**Long-Term (Within 1 month):**
- [ ] Formal verification of all financial logic
- [ ] Decentralized monitoring dashboard (community-run)
- [ ] Governance proposal: Emergency pause threshold
- [ ] Insurance fund for future incidents (1% of treasury)

---

## Emergency Contact List

### Core Response Team

| Role | Name | Phone | Signal | Backup |
|:-----|:-----|:------|:-------|:-------|
| **Incident Commander** | Technical Lead | [REDACTED] | @tech_lead | CEO |
| **Security Engineer** | Security Lead | [REDACTED] | @sec_lead | External Auditor |
| **Smart Contract Dev** | Agent 4 | [REDACTED] | @agent4 | Senior Dev |
| **DevOps** | Platform Engineer | [REDACTED] | @platform | Cloud Architect |
| **Communications** | Community Manager | [REDACTED] | @comm_mgr | Marketing Lead |

### External Escalation

| Entity | Contact | Purpose |
|:-------|:--------|:--------|
| **External Auditor** | [Firm Name] | Expedited re-audit |
| **Legal Counsel** | [Firm Name] | Regulatory compliance |
| **Exchange Partners** | [Exchange 1, 2, 3] | Trading suspension coordination |
| **Media Relations** | [Agency] | Crisis communication |

---

## Decision Framework

### Emergency Pause Criteria

**Automatic Pause (No Vote Required):**
- Smart contract exploit draining >$10K/hour
- >50% of validators offline
- Chain fork detected (conflicting blocks)

**Vote Required (3-of-5):**
- Economic exploit <$10K/hour but confirmed
- Fee manipulation
- Sustained DDoS attack
- Governance attack in progress

**No Pause (Monitor Only):**
- Single validator offline
- User error (not exploit)
- Performance degradation <20%
- Cosmetic bugs

---

## Communication Templates

### Template 1: Emergency Pause Announcement

```
🚨 NETWORK MAINTENANCE 🚨

NeuroSwarm mainnet is temporarily paused for emergency maintenance.

✅ User funds are SAFE
✅ No funds at risk
⏱️ Estimated downtime: [X] hours
📊 Status: https://status.neuroswarm.io

Updates every 30 minutes.

#NeuroSwarm
```

### Template 2: Resume Announcement

```
✅ NETWORK RESUMED ✅

NeuroSwarm is back online!

🔧 Issue resolved: [Brief description]
⏱️ Total downtime: [X] hours [Y] minutes
✅ All user funds safe
🔒 Enhanced security deployed

Post-mortem: [Link]

#NeuroSwarm
```

### Template 3: 30-Minute Update

```
🔄 UPDATE [HH:MM UTC]

Status: [Working on fix / Testing patch / Deploying]
ETA: [X] hours remaining
Progress: [Brief summary]

Next update: [HH:MM UTC]

https://status.neuroswarm.io
```

---

## Exercise Debrief

### Success Criteria

**Response Time:**
- Detection to emergency pause: <1 hour ✅ (35 min)
- Pause to patch deployment: <4 hours ✅ (3h 25min)
- Total downtime: <8 hours ✅ (4h 15min)

**Communication:**
- Public announcement within 5 min of pause ✅
- Updates every 30 minutes ✅
- Post-mortem published within 48h ✅

**Financial:**
- User losses: $0 ✅ (100% refunds)
- Total network loss: <$100 ✅ ($1.41)
- Malicious actor penalized ✅ (stake slashed)

---

### Key Takeaways for Live Launch

1. **Pre-Stage Response Team**: Have all 5 core team members on high alert for first 48 hours post-genesis
2. **Automate Everything**: Detection, alerts, refunds should be fully automated
3. **Communication is King**: Transparent, frequent updates build trust during crisis
4. **Test the Pause**: Dry-run emergency pause on testnet multiple times
5. **Have Audit Firm on Retainer**: Pay for 24/7 availability during launch week

---

**Last Updated:** November 30, 2025  
**Exercise Owner:** Security Lead + Agent 5 (Scrum Master)  
**Next Exercise:** January 1, 2026 (2 days pre-launch)  
**Status:** Playbook Complete - Team Trained

**CRITICAL:** This playbook must be reviewed and rehearsed by the entire response team before January 3, 2026 genesis. A live tabletop exercise is scheduled for January 1, 2026 at 10:00 UTC.

---

**We are prepared. We are resilient. We will protect our users.** 🛡️🚀
