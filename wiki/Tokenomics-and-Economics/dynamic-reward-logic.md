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
The reward is calculated dynamically based on the block height:
```javascript
// ns-node/src/services/chain.js
export function calculateBlockReward(height) {
    const cycle = Math.floor(height / 14700000);
    if (cycle >= 64) return 0n;
    return INITIAL_REWARD >> BigInt(cycle); // Bitwise right shift for halving
}
```

---

## 2. NSD Fee Allocation (Utility)

NSD is used to pay for transaction fees and network services. Unlike NST, NSD fees are **not minted** but collected from transactions included in the block.

### Allocation Rules
Fees collected in a block are split between the block producer (Validator) and the network's shared pool.

*   **90%**: Awarded to the **Winning Validator** (VP-Node).
*   **10%**: Allocated to the **NS Shared Pool** (`ns-rewards-pool`).

### Implementation
Fee distribution occurs during block application:

```javascript
// ns-node/src/services/chain.js (applyBlock)

// 1. Calculate Total Fees
let totalNsdFees = 0n;
for (const tx of block.txs) {
    totalNsdFees += BigInt(tx.fee || 0);
}

// 2. Calculate Split
const validatorShare = (totalNsdFees * 9n) / 10n;
const poolShare = totalNsdFees - validatorShare;

// 3. Credit Accounts
// - Validator Account: +NST Reward + 90% NSD Fees
// - Shared Pool Account: +10% NSD Fees
```

## 3. Persistence

Account balances are persisted in the SQLite state database.

*   **Table**: `accounts`
*   **Fields**:
    *   `address`: Account identifier (e.g., Validator Public Key or `ns-rewards-pool`)
    *   `nst_balance`: Liquid NST holdings
    *   `nsd_balance`: Liquid NSD holdings
    *   `staked_nst`: Amount of NST staked for consensus
