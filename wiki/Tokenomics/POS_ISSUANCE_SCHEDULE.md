# Proof-of-Stake (PoS) Consensus and Issuance Schedule

This details the mechanics and calculations for the NST issuance schedule and the BFT-style PoS consensus designed for high-speed LLM service delivery.

## 1. Consensus Parameters

We utilize a **Byzantine Fault Tolerance (BFT)**-style consensus for fast finality and security.

| Parameter | Specification | Purpose |
| :--- | :--- | :--- |
| **Target Block Finality Time** | **6 Seconds** | Ensures minimal latency for real-time LLM API interactions. |
| **Validator Pool Cap** | 150 Validators (Governance adjustable) | Optimizes network communication speed for BFT consensus. |
| **Minimum Self-Stake** | 5,000 NST | Ensures validators are financially incentivized to maintain security. |
| **Slashing Risk** | Applies to Delegators and Validators | Enforces network integrity (e.g., 50% penalty for double-signing). |

## 2. NST Issuance Rate Calculation

The rate is calculated to distribute 7,350,000 NST (half of the total issuance pool) in the first 4-year cycle.

### A. Total Blocks Per Cycle Calculation

Based on the 6-second block time:

* Seconds per Year: $31,557,600$
* Blocks per Year: $31,557,600 / 6 = 5,259,600$ blocks
* **Total Blocks in 4-Year Cycle:** $5,259,600 \times 4 = 21,038,400 \text{ blocks}$

### B. Initial Block Reward (IBR)

The IBR is the NST amount minted and distributed to validators for every 6-second block during the first 4 years.

$$\text{IBR} = \frac{7,350,000 \text{ NST}}{21,038,400 \text{ blocks}} \approx 0.349313 \text{ NST per block}$$

## 3. The Final PoS Issuance Schedule

| Cycle Duration | Block Time (Avg.) | Cycle Block Count | Cycle Reward (NST) | Block Reward (NST) | Cumulative Issuance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cycle 1 (Years 1-4)** | **6 seconds** | 21,038,400 | 7,350,000 | **0.349313** | 7,350,000 |
| **Cycle 2 (Years 5-8)** | 6 seconds | 21,038,400 | 3,675,000 | 0.174656 | 11,025,000 |
| **Cycle 3 (Years 9-12)** | 6 seconds | 21,038,400 | 1,837,500 | 0.087328 | 12,862,500 |
| **Cycle 4 (Years 13-16)** | 6 seconds | 21,038,400 | 918,750 | 0.043664 | 13,781,250 |
| **Cycle 5 (Years 17-20)** | 6 seconds | 21,038,400 | 459,375 | 0.021832 | 14,240,625 |
| **Cycle 6 (Years 21-24)** | 6 seconds | 21,038,400 | 229,688 | 0.010916 | 14,470,313 |
| **Cycle 7 (Years 25-28)** | 6 seconds | 21,038,400 | 114,844 | 0.005458 | 14,585,157 |
| **Cycle 8+ (Years 29+)** | 6 seconds | Ongoing | 114,843 (remaining) | Diminishing | **14,700,000** |
| **Total Distributed** | $\ldots$ | $\ldots$ | $\mathbf{14,700,000}$ | $\ldots$ | $\mathbf{14,700,000}$ |

**Notes:**
- The halving continues until the full 14,700,000 NST validator allocation is distributed
- After approximately 28-32 years, the block reward becomes negligible
- Validators continue to earn from NSD transaction fees after issuance completion
- This creates a deflationary economy that rewards early participants while ensuring long-term sustainability

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
