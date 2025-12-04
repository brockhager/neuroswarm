# Dynamic Reward Logic (NST & NSD)

This document outlines the implemented dynamic reward logic for the NeuroSwarm network, utilizing a dual-token model: **NeuroSwarm Token (NST)** for governance/security and **NeuroSwarm Dollar (NSD)** for utility/fees.

## 1. NST Block Rewards (Security & Governance)

NST is minted per block to incentivize validators (VP-Nodes) to secure the network. The issuance follows a deflationary schedule similar to Bitcoin but adapted for NeuroSwarm's block time.

### Constants
*   **Initial Block Reward (IBR)**: 0.5 NST
*   **Block Time**: ~8.5 seconds
*   **Halving Interval**: 14,700,000 blocks (approx. 4 years)
*   **Max Supply**: 21,000,000 NST
*   **Atomic Unit**: 1 NST = 10^8 atomic units

### Halving Schedule
The block reward halves every `14,700,000` blocks.

| Cycle | Block Range | Reward (NST) |
| :--- | :--- | :--- |
| **1** | 0 - 14,699,999 | **0.5** |
| **2** | 14,700,000 - 29,399,999 | **0.25** |
| **3** | 29,400,000 - 44,099,999 | **0.125** |
| **4** | 44,100,000 - 58,799,999 | **0.0625** |
| ... | ... | ... |
| **64+** | > 940,800,000 | **0** |

### Implementation
The reward is calculated dynamically based on the block height. See `ns-node/src/services/chain.js` for the exact implementation.

---

## 2. NSD Fee Allocation (Utility)

NSD is used to pay for transaction fees and network services. Unlike NST, NSD fees are **not minted** but collected from transactions included in the block.

### Allocation Rules
Fees collected in a block are split between the block producer (Validator) and the network's shared pool.

*   **90%**: Awarded to the **Winning Validator** (VP-Node).
*   **10%**: Allocated to the **NS Shared Pool** (`ns-rewards-pool`).

### Implementation
Fee distribution occurs during block application.

---

## 3. Persistence

Account balances are persisted in the SQLite state database. The `accounts` table tracks `nst_balance`, `nsd_balance`, and `staked_nst`.
