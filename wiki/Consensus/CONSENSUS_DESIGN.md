# NeuroSwarm Consensus Design

## Token Naming Convention Update

To ensure clarity and consistency across all NeuroSwarm documentation and workflows, the following naming convention has been adopted:

- **NST (NeuroSwarm Token)**  
  Formerly NSM (NeuroSwarm Main Token).  
  Represents the primary utility and governance token within the NeuroSwarm ecosystem.

- **NSD (NeuroSwarm Data)**  
  Formerly NSC (NeuroSwarm Credit).  
  Represents data credits used for plugin execution, orchestration tasks, and contributor services.

All references in this document and future documentation will use **NST** and **NSD** exclusively.

---

## Overview

NeuroSwarm implements a hybrid consensus mechanism that combines Proof-of-Stake (PoS) validation with reputation-based scoring to ensure network security, fair resource distribution, and quality assurance.

## Consensus Components

### 1. Validator Selection (NST Staking)

- **Staking Requirement**: Validators must stake a minimum amount of NST to participate in block production
- **Weight Calculation**: Validator voting power is proportional to their staked NST
- **Rewards**: Validators earn NST rewards from:
  - Block production
  - Fee collection (NSD fees converted to NST)
  - Transaction validation

### 2. Data Credit System (NSD)

- **Anti-Spam Mechanism**: Every network operation requires burning NSD
- **Predictable Costs**: NSD maintains a stable fiat-pegged value for reliable service pricing
- **Fee Distribution**:
  - Users burn NSD for operations (LLM inference, storage, bandwidth)
  - Validators collect NSD fees
  - Protocol converts portion of NSD to NST for validator rewards

### 3. Reputation Scoring

- **Quality Metrics**: Track validator performance, uptime, and response accuracy
- **Penalty System**: Slashing for malicious behavior or consistent poor performance
- **Reward Multipliers**: High-reputation validators earn boosted rewards

## Economic Flow

```
User acquires NSD → Burns NSD for service → Validator collects fees → 
Protocol converts NSD→NST → Validator receives NST rewards
```

This dual-token design ensures:
- **Stable operational costs** (via NSD)
- **Network security** (via NST staking)
- **Continuous value capture** (NSD→NST conversion creates buy pressure)

---

## Implementation Status

This is a foundational design document. Implementation details for the consensus mechanism will be added as the protocol evolves.

For tokenomics details, see [`TOKENOMICS.md`](file:///c:/JS/ns/neuroswarm/wiki/Tokenomics/TOKENOMICS.md).
