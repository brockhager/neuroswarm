# NeuroSwarm Launch Milestones

This document serves as the official governance record for NeuroSwarm's network launch and halving schedule.

## Genesis Parameters

| Parameter | Value | Status |
|:----------|:------|:-------|
| **Genesis Date** | Q2 2026 (Target) | Planning |
| **Network Type** | Mainnet | Launch Ready |
| **Initial Block Reward** | 0.5 NST | Locked |
| **Block Finality Time** | 8.5 seconds | Locked |
| **Halving Cycle** | ~3.96 years (~1,446 days) | Locked |

## Halving Schedule

The following schedule is calculated from a **Genesis Date of Q2 2026** and uses the locked ~3.96-year halving cycle.

### Cycle 1: Bootstrap Phase (Q2 2026 - Q2 2030)

| Milestone | Date | Block Reward | Total Distributed |
|:----------|:-----|:-------------|:------------------|
| **Genesis Block** | **Q2 2026** | **0.5 NST** | 0 NST |
| End of Cycle 1 | Q2 2030 | 0.5 NST | 7,350,000 NST |

**Duration:** ~3.96 years (~1,446 days)  
**Cycle Reward:** 7,350,000 NST (50% of total validator allocation)  
**Network Focus:** Bootstrap security, validator onboarding, ecosystem growth

---

### Cycle 2: Growth Phase (Q2 2030 - Q1 2034)

| Milestone | Date | Block Reward | Total Distributed |
|:----------|:-----|:-------------|:------------------|
| **First Halving** | **Q2 2030** | **0.25 NST** | 7,350,000 NST |
| End of Cycle 2 | Q1 2034 | 0.25 NST | 11,025,000 NST |

**Duration:** ~3.96 years  
**Cycle Reward:** 3,675,000 NST (25% of total validator allocation)  
**Network Focus:** Scaling infrastructure, expanding validator set, enterprise adoption

---

### Cycle 3: Maturity Phase (Q1 2034 - Q1 2038)

| Milestone | Date | Block Reward | Total Distributed |
|:----------|:-----|:-------------|:------------------|
| **Second Halving** | **Q1 2034** | **0.125 NST** | 11,025,000 NST |
| End of Cycle 3 | Q1 2038 | 0.125 NST | 12,862,500 NST |

**Duration:** ~3.96 years  
**Cycle Reward:** 1,837,500 NST (12.5% of total validator allocation)  
**Network Focus:** Fee-driven economy transition, global adoption, sustainability

---

### Cycle 4: Sustainability Phase (Q1 2038 - Q1 2042)

| Milestone | Date | Block Reward | Total Distributed |
|:----------|:-----|:-------------|:------------------|
| **Third Halving** | **Q1 2038** | **0.0625 NST** | 12,862,500 NST |
| End of Cycle 4 | Q1 2042 | 0.0625 NST | 13,781,250 NST |

**Duration:** ~3.96 years  
**Cycle Reward:** 918,750 NST (6.25% of total validator allocation)  
**Network Focus:** Transaction fees as primary revenue, long-term stability

---

### Cycles 5-8: Long-Term Sustainability (Q1 2042 - Q1 2058+)

| Halving Event | Date | Block Reward | Cumulative Distribution |
|:--------------|:-----|:-------------|:------------------------|
| **Fourth Halving** | Q1 2042 | 0.03125 NST | 13,781,250 NST |
| **Fifth Halving** | Q1 2046 | 0.015625 NST | 14,240,625 NST |
| **Sixth Halving** | Q1 2050 | 0.0078125 NST | 14,470,313 NST |
| **Seventh Halving** | Q1 2054 | 0.00390625 NST | 14,585,157 NST |
| **Final Distribution** | Q1 2058+ | Diminishing | **14,700,000 NST** |

**Network Focus:** Fully fee-driven economy, negligible block rewards, sustainable validator operations

---

## Economic Transition Timeline

### Phase 1: Block Reward Dominance (2026-2034)
- **Primary Revenue:** Block rewards (247.5% → 123.8% APY)
- **Secondary Revenue:** Growing transaction fees
- **Validator Strategy:** Maximize stake to capture early rewards

### Phase 2: Hybrid Economy (2034-2042)
- **Balanced Revenue:** Block rewards + transaction fees
- **APY Range:** 61.9% → 30.9%
- **Validator Strategy:** Optimize both stake and service quality

### Phase 3: Fee-Driven Sustainability (2042+)
- **Primary Revenue:** Transaction fees (NSD→NST conversion)
- **Residual Revenue:** Diminishing block rewards (<15.5% APY)
- **Validator Strategy:** Focus on network growth and fee optimization

---

## Governance Commitment

This halving schedule is **immutable** and enforced by the NeuroSwarm consensus protocol. Key guarantees:

✅ **Fixed Supply:** Maximum 14,700,000 NST validator rewards, ever  
✅ **Predictable Issuance:** Clean 0.5 NST → 0.25 NST → 0.125 NST halving progression  
✅ **Long-Term Sustainability:** ~32-year transition to fee-driven economy  
✅ **No Emergency Changes:** Halving schedule cannot be altered by governance  

---

## Launch Readiness Checklist

### Pre-Genesis Requirements

- [ ] **Testnet Completion:** 6+ months stable operation
- [ ] **Validator Onboarding:** Minimum 50 validators registered
- [ ] **Security Audit:** External security audit completed
- [ ] **Documentation:** Complete deployment and validator guides
- [ ] **Community:** Active community with clear governance processes

### Genesis Block Requirements

- [x] **Block Reward:** 0.5 NST (locked)
- [x] **Block Time:** 8.5 seconds (locked)
- [x] **Validator Cap:** 150 validators (governance adjustable)
- [x] **Minimum Stake:** 5,000 NST (locked)
- [ ] **Genesis Allocation:** Initial token distribution defined

### Post-Genesis Milestones

- [ ] **30 Days:** Network stability validated
- [ ] **90 Days:** First governance proposal cycle
- [ ] **180 Days:** Ecosystem growth metrics review
- [ ] **1 Year:** First annual report and roadmap update

---

## Historical Note

**Specification Finalized:** November 30, 2025  
**Clean IBR Adopted:** 0.5 NST per block for developer simplicity  
**Cycle Duration:** ~3.96 years based on 8.5s block finality and 14.7M block target  

This document supersedes all previous tokenomics specifications and serves as the definitive source for NeuroSwarm's issuance schedule.

---

For detailed economics, see:
- [PoS Issuance Schedule](./POS_ISSUANCE_SCHEDULE.md) - Technical calculations
- [Validator Economics](./VALIDATOR_ECONOMICS.md) - APY modeling and profitability
- [NST Allocation & Vesting](./NST_ALLOCATION_AND_VESTING.md) - Supply breakdown
