# NeuroSwarm Tokenomics

## Overview

NeuroSwarm implements a **Dual-Token Architecture** designed to provide stable service pricing while creating a robust economic model for network security, governance, and long-term value creation.

---

## Token Naming Convention

To ensure clarity and consistency across all NeuroSwarm documentation and workflows, the following naming convention is used:

- **NST (NeuroSwarm Token)**  
  Represents the primary utility and governance token within the NeuroSwarm ecosystem.

- **NSD (NeuroSwarm Data)**  
  Represents data credits used for plugin execution, orchestration tasks, and contributor services.

All references in this document use **NST** and **NSD** exclusively.

---

## 1. Dual-Token Architecture (NST and NSD)

### NeuroSwarm Token (NST)

**Role:** Value, Governance, and Network Security (Staking)

**Characteristics:**
- **Scarce**: Fixed supply cap of 21,000,000 NST
- **Volatile**: Market-driven price discovery
- **Primary Store of Value**: Long-term appreciation asset

**Use Cases:**
- **Staking**: Validators stake NST to secure the network and earn rewards
- **Governance**: NST holders vote on treasury allocations, protocol upgrades, and fee structures
- **Investment**: Speculative asset with deflationary supply schedule

---

### NeuroSwarm Data (NSD)

**Role:** Utility, Metering, and Anti-Spam Control

**Characteristics:**
- **Stable**: Pegged to a fixed fiat cost of computation (e.g., 1 NSD = $0.001 USD of compute)
- **Infinite/Elastic Supply**: Minted and burned based on network usage
- **Predictable Pricing**: Developers and users can build applications with stable operating costs

**Use Cases:**
- **Service Metering**: Users burn NSD to access LLM inference, storage, and bandwidth
- **Anti-Spam**: Prevents denial-of-service attacks through required token burn per transaction
- **Fee Collection**: Validators collect NSD fees from users, which are partially converted to NST to create continuous buy pressure

**Key Advantage:** Decouples service utility from main token volatility, ensuring predictable costs regardless of NST market price.

---

## 2. NST Core Specifications (The Bitcoin Model)

NeuroSwarm Token follows a Bitcoin-inspired scarcity and issuance model to ensure long-term value preservation.

| Parameter | Specification |
|:----------|:--------------|
| **Max Supply (Hard Cap)** | 21,000,000 NST |
| **Divisibility** | 8 decimal places (The smallest unit is the 'NSatoshi': 0.00000001 NST) |
| **Issuance Mechanism** | 4-Year Halving Schedule (Decay towards zero inflation) |
| **Consensus** | Proof-of-Stake (PoS) Validator Incentives |

### 4-Year Halving Schedule

Block rewards to validators decrease by 50% every 4 years, similar to Bitcoin's halving mechanism:

- **Years 0-4**: Higher initial rewards to bootstrap network security
- **Years 4-8**: Rewards halved
- **Years 8-12**: Rewards halved again
- **Continued halving** until the 14,700,000 NST validator allocation is fully distributed

This creates predictable, deflationary issuance that incentivizes early participation while ensuring long-term scarcity.

---

## 3. Supply Allocation (21,000,000 NST Total)

The entire 21 million NST supply is allocated across four strategic segments:

| Allocation Segment | Quantity (NST) | Percentage | Purpose |
|:-------------------|:---------------|:-----------|:--------|
| **Issuance/Validator Rewards** | 14,700,000 | 70% | Distributed over time via the 4-year Halving Schedule to secure the network through staking incentives |
| **Ecosystem & Treasury** | 2,100,000 | 10% | Reserved for strategic grants, partnerships, developer incentives, and DAO-controlled funding |
| **Founding Team & Advisors** | 2,100,000 | 10% | Incentivizes long-term commitment from core contributors and technical advisors |
| **Private/Strategic Sales** | 2,100,000 | 10% | Initial funding rounds and liquidity generation for market bootstrapping |
| **Total** | **21,000,000** | **100%** | |

### Allocation Rationale

- **70% to Validators**: Ensures robust network security and decentralization by incentivizing a large, distributed validator set
- **10% Treasury**: Provides sustainable funding for ecosystem growth without reliance on inflationary emissions
- **10% Team**: Aligns founding team with long-term protocol success
- **10% Investors**: Raises initial capital while maintaining founder/validator majority control

---

## 4. Vesting Schedules

To protect market stability and ensure long-term alignment, the 20% of supply allocated to Team and Investors is subject to strict vesting schedules:

### Founding Team & Advisors (2,100,000 NST - 10%)

- **Cliff**: 1-year cliff (no tokens released before year 1)
- **Vesting**: 3-year linear monthly vesting following the cliff
- **Total Lock Period**: 4 years (1-year cliff + 3-year vesting)

**Example:**
- Month 0-12: 0 NST released (cliff period)
- Month 13: First vesting release begins
- Months 13-48: Equal monthly releases of ~58,333 NST per month

### Private/Strategic Sales (2,100,000 NST - 10%)

- **Cliff**: 6-month cliff (no tokens released before month 6)
- **Vesting**: 2-year linear monthly vesting following the cliff
- **Total Lock Period**: 2.5 years (6-month cliff + 2-year vesting)

**Example:**
- Month 0-6: 0 NST released (cliff period)
- Month 7: First vesting release begins
- Months 7-30: Equal monthly releases of ~87,500 NST per month

---

## Key Economic Mechanisms

### Value Capture Flow

1. **Users acquire NSD** (stable utility token) with fiat or NST
2. **Users burn NSD** to access LLM inference, storage, and bandwidth
3. **Validators collect NSD fees** from network usage
4. **Protocol converts NSD to NST** to pay validator staking rewards
5. **Continuous buy pressure** on NST from protocol NSD→NST conversion

### Anti-Spam & Rate Limiting

- Every transaction (LLM query, data submission, etc.) requires burning a small amount of NSD
- Cost remains predictable due to NSD's fiat peg
- Prevents denial-of-service attacks while allowing legitimate metered usage

### Governance

- NST holders vote on:
  - Treasury fund allocations
  - Protocol upgrades and parameter changes
  - Fee structure adjustments
  - Ecosystem grant approvals

---

## Summary

The **NeuroSwarm Dual-Token Model** provides:

✅ **Stable Service Pricing** - NSD's fiat peg ensures predictable costs for developers and users  
✅ **Anti-Spam Protection** - Required token burn prevents abuse while enabling metered access  
✅ **Decoupled Speculation** - NST volatility doesn't disrupt core network utility  
✅ **Value Capture** - Continuous NSD demand flows back to support NST value  
✅ **Bitcoin-Inspired Scarcity** - 21M hard cap with halving schedule creates long-term value preservation  
✅ **Aligned Incentives** - Vesting schedules and validator rewards ensure stakeholder alignment

This architecture enables NeuroSwarm to function as both a **reliable utility network** (via NSD) and a **valuable governance asset** (via NST), solving the volatility problem that plagues single-token utility networks.
