# NeuroSwarm Tokenomics Overview

This document serves as a high-level guide to the NeuroSwarm economic model, which utilizes a dual-token architecture to balance long-term value scarcity with stable utility pricing.

## 1. Dual-Token Architecture

NeuroSwarm uses two distinct tokens to decouple the network's security/value proposition from the predictable cost of its computational services.

| Token | Role | Nature | Primary Use |
| :--- | :--- | :--- | :--- |
| **NST (NeuroSwarm Token)** | **Value, Security, Governance** | Scarce, Volatile, BTC-inspired Hard Cap | Staking (Securing PoS network), Governance Voting, Store of Value. |
| **NSD (NeuroSwarm Data)** | **Utility, Metering, Anti-Spam** | Stable, Elastic Supply (Minted/Burned) | Required payment for LLM inference, API access, and transaction fees. |

**Value Flow:** Users acquire and burn NSD to use the network. Validators collect NSD fees. The steady demand for NSD creates sustained demand for the primary NST token, which is the underlying asset needed to validate and secure the platform.

## 2. NST Core Specifications (The Proof-of-Stake Scarcity Model)

The NeuroSwarm Token (NST) is designed for maximum scarcity, leveraging the proven economic mechanics of a fixed supply and scheduled issuance.

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Max Supply (Hard Cap)** | **21,000,000 NST** | Establishes digital scarcity, mirroring Bitcoin's supply cap. |
| **Divisibility** | 8 decimal places | The smallest unit is the 'NSatoshi.' |
| **Consensus Mechanism** | Proof-of-Stake (PoS) | Secures the network efficiently without requiring massive hardware/energy consumption. |
| **Issuance Mechanism** | 4-Year Halving Schedule | The reward released to validators is cut in half every four years. |
