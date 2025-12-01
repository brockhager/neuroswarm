# Proof-of-Stake (PoS) Consensus and Issuance Schedule

This details the mechanics and calculations for the NST issuance schedule and the BFT-style PoS consensus designed for high-speed LLM service delivery.

## 1. Consensus Parameters

We utilize a **Byzantine Fault Tolerance (BFT)**-style consensus for fast finality and security.

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Target Block Finality Time** | **8.5 Seconds** | Optimized for real-time LLM API interactions while maintaining network stability. |
| **Validator Pool Cap** | 150 Validators (Governance adjustable) | Optimizes network communication speed for BFT consensus. |
| **Minimum Self-Stake** | 5,000 NST | Ensures validators are financially incentivized to maintain security. |
| **Slashing Risk** | Applies to Delegators and Validators | Enforces network integrity (e.g., 50% penalty for double-signing). |

## 2. NST Issuance Rate Calculation

The rate is calculated to distribute 7,350,000 NST (half of the total issuance pool) in the first ~3.96-year cycle.

### A. Total Blocks Per Cycle Calculation

Based on the 8.5-second block time:

* Seconds per Year: $31,557,600$
* Blocks per Year: $31,557,600 / 8.5 = 3,712,659$ blocks
* **Total Blocks in First Cycle (~3.96 years):** $3,712,659 \times 3.96 = 14,702,129 \text{ blocks}$

### B. Initial Block Reward (IBR)

The IBR is the NST amount minted and distributed to validators for every 8.5-second block during the first cycle.

$$\text{IBR} = \frac{7,350,000 \text{ NST}}{14,700,000 \text{ blocks}} = 0.5 \text{ NST per block}$$

**Clean Specification:** Exactly **0.5 NST per block** for simplified calculations and developer experience.

## 3. The Final PoS Issuance Schedule

| Cycle Duration | Block Time (Avg.) | Cycle Block Count | Cycle Reward (NST) | Block Reward (NST) | Cumulative Issuance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cycle 1 (Years 1-3.96)** | **8.5 seconds** | 14,700,000 | 7,350,000 | **0.5000** | 7,350,000 |
| **Cycle 2 (Years 3.96-7.92)** | 8.5 seconds | 14,700,000 | 3,675,000 | 0.2500 | 11,025,000 |
| **Cycle 3 (Years 7.92-11.88)** | 8.5 seconds | 14,700,000 | 1,837,500 | 0.1250 | 12,862,500 |
| **Cycle 4 (Years 11.88-15.84)** | 8.5 seconds | 14,700,000 | 918,750 | 0.0625 | 13,781,250 |
| **Cycle 5 (Years 15.84-19.80)** | 8.5 seconds | 14,700,000 | 459,375 | 0.03125 | 14,240,625 |
| **Cycle 6 (Years 19.80-23.76)** | 8.5 seconds | 14,700,000 | 229,688 | 0.015625 | 14,470,313 |
| **Cycle 7 (Years 23.76-27.72)** | 8.5 seconds | 14,700,000 | 114,844 | 0.0078125 | 14,585,157 |
| **Cycle 8+ (Years 27.72+)** | 8.5 seconds | Ongoing | 114,843 (remaining) | Diminishing | **14,700,000** |
| **Total Distributed** | $\ldots$ | $\ldots$ | $\mathbf{14,700,000}$ | $\ldots$ | $\mathbf{14,700,000}$ |

**Notes:**
- The halving continues until the full 14,700,000 NST validator allocation is distributed
- After approximately 27-32 years, the block reward becomes negligible
- Validators continue to earn from NSD transaction fees after issuance completion
- This creates a deflationary economy that rewards early participants while ensuring long-term sustainability
- **Clean 0.5 NST IBR** simplifies smart contract implementation and developer calculations

## 4. Economic Security Model

### Validator Economics

**Revenue Sources:**
1. **Block Rewards** (NST): Minted according to the halving schedule
2. **Transaction Fees** (NSD): Collected from users, converted to NST
3. **MEV/Priority Fees**: Additional revenue from transaction ordering

**Costs:**
- Infrastructure (servers, bandwidth, storage)
- Slashing risk (locked capital)
- Opportunity cost (alternative uses of staked NST)

### Network Security Guarantees

With the 5,000 NST minimum stake and 150 validator cap:
- **Minimum Economic Security:** 750,000 NST at risk (5,000 × 150)
- **At $10/NST:** $7.5M minimum attack cost
- **At $100/NST:** $75M minimum attack cost

This economic security scales naturally with NST price appreciation, making attacks increasingly expensive as the network grows.

---

For detailed consensus implementation, see [`CONSENSUS_DESIGN.md`](file:///c:/JS/ns/neuroswarm/wiki/Consensus/CONSENSUS_DESIGN.md).
