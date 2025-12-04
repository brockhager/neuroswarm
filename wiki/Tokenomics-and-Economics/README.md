# NeuroSwarm Tokenomics Documentation

Welcome to the NeuroSwarm tokenomics documentation. This section provides comprehensive details on NeuroSwarm's dual-token economic model, supply allocation, consensus mechanism, and issuance schedule.

## Core Documents

### [Tokenomics Overview](./TOKENOMICS_OVERVIEW.md)
**High-level introduction to NeuroSwarm's economic model**

Covers the dual-token architecture (NST for governance/security and NSD for utility/metering), core NST specifications based on Bitcoin's scarcity model, and the fundamental economic principles driving the network.

**Key Topics:**
- Dual-token architecture and value flow
- NST hard cap and divisibility
- Proof-of-Stake consensus overview
- 4-year halving schedule introduction

---

### [NST Allocation and Vesting](../Staking/NST_ALLOCATION_AND_VESTING.md)
**Complete breakdown of the 21 million NST supply distribution**

Details how the total NST supply is allocated across validators, ecosystem treasury, founding team, and strategic investors, along with the vesting schedules designed to protect market stability.

**Key Topics:**
- 70% to validator rewards (14.7M NST)
- 30% to ecosystem, team, and investors (6.3M NST)
- Team vesting: 1-year cliff + 3-year linear
- Investor vesting: 6-month cliff + 2-year linear

---

### [PoS Issuance Schedule](../Staking/POS_ISSUANCE_SCHEDULE.md)
**Technical specification of the Proof-of-Stake consensus and block rewards**

Provides the complete issuance schedule with mathematical calculations, consensus parameters for Byzantine Fault Tolerance (BFT), and the halving cycle timeline spanning 28+ years.

**Key Topics:**
- BFT consensus parameters (8.5-second finality, 150 validator cap)
- Initial block reward: **0.5 NST per block** (clean specification)
- Complete halving schedule table (~3.96-year cycles)
- Economic security model and attack cost analysis

---

### [Validator Economics](../Staking/VALIDATOR_ECONOMICS.md)
**APY modeling and profitability analysis for validators**

Comprehensive economic modeling for validators including reward calculations, APY projections across halving cycles, delegation economics, and break-even analysis.

**Key Topics:**
- Cycle 1 APY: 247.5% (solo validator with 5,000 NST stake)
- Long-term APY projections across all halving cycles
- Delegation models and commission structures
- Revenue source transition (block rewards → transaction fees)
- Profitability and ROI calculations

---

### [Launch Milestones](./LAUNCH_MILESTONES.md)
**Official governance record for Genesis and halving schedule**

Documents the fixed Genesis date (Q2 2026 target) and complete halving schedule through 2058+. This is the authoritative source for launch timing and immutable consensus parameters.

**Key Topics:**
- Genesis parameters (Q2 2026, 0.5 NST IBR, 8.5s finality)
- Four major halving events (2030, 2034, 2038, 2042)
- Economic transition timeline (block rewards → fees)
- Launch readiness checklist
- Governance commitments

---

### [Complete Tokenomics Specification](./TOKENOMICS.md)
**Comprehensive, all-in-one tokenomics document**

A detailed reference combining all aspects of NeuroSwarm's economic design, including supply allocation, vesting schedules, economic mechanisms, and governance structure.

---

## Related Documentation

### [Consensus Design](../Consensus/CONSENSUS_DESIGN.md)
PoS consensus mechanisms, validator selection, and reputation scoring systems.

### [Naming Convention Changelog](./NAMING_CONVENTION_CHANGELOG.md)
Migration guide for the NSM→NST and NSC→NSD naming convention update.

### [Dual-Token Model Overview](./Dual-Token%20Model%20for%20NeuroSwarm.md)
Original conceptual document explaining the rationale for the dual-token approach.

---

## Quick Reference

| Token | Purpose | Supply | Mechanism |
|:------|:--------|:-------|:----------|
| **NST** | Governance, Staking, Value | 21M Hard Cap | 4-Year Halving |
| **NSD** | Utility, Metering, Fees | Elastic (Mint/Burn) | Fiat-Pegged |

**Economic Flow:** Users burn NSD → Validators collect fees → Protocol converts NSD→NST → Continuous demand for NST

---

## Navigation

- [← Back to Wiki Home](../HOME.md)
- [System Overview →](../System-Overview/README.md)
- [Governance Documentation →](../Governance/)
