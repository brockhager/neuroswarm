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

### [NST Allocation and Vesting](./NST_ALLOCATION_AND_VESTING.md)
**Complete breakdown of the 21 million NST supply distribution**

Details how the total NST supply is allocated across validators, ecosystem treasury, founding team, and strategic investors, along with the vesting schedules designed to protect market stability.

**Key Topics:**
- 70% to validator rewards (14.7M NST)
- 30% to ecosystem, team, and investors (6.3M NST)
- Team vesting: 1-year cliff + 3-year linear
- Investor vesting: 6-month cliff + 2-year linear

---

### [PoS Issuance Schedule](./POS_ISSUANCE_SCHEDULE.md)
**Technical specification of the Proof-of-Stake consensus and block rewards**

Provides the complete issuance schedule with mathematical calculations, consensus parameters for Byzantine Fault Tolerance (BFT), and the halving cycle timeline spanning 28+ years.

**Key Topics:**
- BFT consensus parameters (6-second finality, 150 validator cap)
- Initial block reward: 0.349313 NST per block
- Complete halving schedule table
- Economic security model and attack cost analysis

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
