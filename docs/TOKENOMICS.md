# NeuroSwarm — Tokenomics (NST)

Version: 0.1
Date: 2025-11-11

This document summarizes the NeuroSwarm Token (NST): supply, premine, distribution, utility, reward model, and auditability. NST is the protocol token that powers staking, governance, and incentives in the NeuroSwarm Personal AI Economy.

## Token overview

- Token name: NeuroSwarm Token
- Symbol: NST
- Supply model: Fixed supply
- Total supply: 21,000,000 NST (21 million)
- Premine: All 21,000,000 NST premined at genesis

## Why premined?

- Immediate governance readiness: a premine enables token distribution to early participants, bootstraps governance, and funds initial rewards and development without requiring initial mining infrastructure.
- Fair launch intent: premined tokens will be allocated transparently (see Distribution) and distributed according to a published schedule and governance approvals.
- Practicality: supports a rapid testnet/mainnet launch, staking, and validator selection from day one.

## Supply & Distribution (initial allocation)

A single fixed supply of 21,000,000 NST is allocated across categories at genesis. The following is a recommended initial allocation (governance-adjustable):

- Community rewards & ecosystem incentives: 40% (8,400,000 NST)
- Validator incentives & reward pool: 30% (6,300,000 NST)
- Governance staking reserve: 15% (3,150,000 NST)
- Development & foundation fund: 10% (2,100,000 NST)
- Partnerships & ecosystem growth: 5% (1,050,000 NST)

Total: 100% (21,000,000 NST)

Notes on distribution
- Allocations are recorded at genesis and visible on-chain (or in the genesis manifest) for full transparency.
- Governance may reallocate reserves via on-chain proposals (subject to vote/quorum rules).

## How NST enters circulation

Tokens are released into active circulation via explicit protocol mechanisms rather than mining:

- Rewards for consensus participation: validators and proposers earn NST from the validator incentives pool when contributions are verified and accepted (Proof-of-Useful-Work).
- Staking yields: a small portion of epoch rewards is allocated as yield to stakers who participate in governance and validation.
- Service provision & fees: nodes offering paid services (chat endpoints, compute rentals) may be paid in NST.
- Community incentives: ecosystem grants, bug bounties, and partner programs distribute NST from the community pool.

All reward distributions are recorded on-chain when paid (tx + metadata + references to the inclusion manifest).

## Token utility

- Staking: Users stake NST to gain voting rights and validator eligibility. Staked NST acts as collateral and is subject to lockup and slashing rules.
- Governance: NST holders (or stakers) vote on protocol parameters, upgrades, dataset inclusion, and other proposals; voting weight uses a token/reputation model.
- Incentives: NST pays validators, proposers, auditors, and service providers for useful and verifiable contributions.
- Reputation: Honest participation (accepted proposals, correct attestations) grows reputation which complements token-weighted influence.

## Consensus & Rewards model

- Proof-of-Useful-Work (PoUW): NST rewards are granted for validated, useful contributions: accepted knowledge proposals, verified compute cycles, and reliable service provision.
- Reward calculus: rewards scale with measured utility (benchmarks or user signal) and consensus confidence (C). Proposer and validator rewards come from the validator incentives and community pools.
- Dynamic validator set: the committee size for each proposal scales with network metrics (e.g., total active nodes, submission volume) — similar in spirit to Bitcoin’s difficulty adjustment, ensuring fairness and security as the network grows.

Simplified reward formula (illustrative)

```
# epoch pool R_epoch
proposer_reward = R_epoch * alpha * utility_p * C
validator_pool = R_epoch * beta
for validator v in committee:
  v_reward = (validator_pool / N) + (v.vote == final ? bonus_align : 0)
```
- utility_p: normalized utility of the proposal
- C: final consensus confidence (0..1)
- alpha, beta: governance-set parameters

## Staking, slashing, and yield

- Minimum stake required to be eligible as a validator is set by governance (example: S_min = 10 NST).
- Staked tokens are subject to lockup and unstaking delays to prevent flash-staking attacks.
- Proven malicious behavior (forgery, collusion, deliberate misreports) can result in slashing of staked NST and reputation loss.
- Stakers receive a portion of epoch rewards as yield for participating in governance/validation.

## Auditability & transparency

- All token movements (genesis allocation, staking, unstaking, reward payments, slashing events) are recorded on-chain with references to the relevant proposal or epoch manifest.
- Reward distributions include a published calculation manifest (off-chain CID) that auditors can fetch to verify allocation logic.
- Indexers and an auditor CLI are recommended to reconstruct token flows and validate reward correctness against on-chain events.

## Comparison to Bitcoin

- Fixed supply: NST matches Bitcoin’s scarcity model with a fixed cap of 21 million tokens.
- Scarcity-driven model: the fixed supply supports scarcity as a value proposition.
- Premine difference: unlike Bitcoin’s mining issuance, NST is fully premined at genesis to enable immediate governance, distribution, and protocol activity. This trade-off prioritizes rapid network bootstrapping and governance readiness.

## Governance and supply adjustments

- Although supply is fixed, governance can decide allocations from existing reserves (e.g., reassign community pool tokens) through on-chain proposals, subject to quorum and voting rules.
- Any changes to token economics (e.g., unlocking additional reserves) must be transparent, voted on, and recorded on-chain.

## Table: Supply summary

| Item | Value |
|---|---:|
| Token name | NeuroSwarm Token (NST) |
| Total supply | 21,000,000 NST |
| Premine at genesis | 21,000,000 NST |
| Community rewards | 40% (8,400,000 NST) |
| Validator incentives | 30% (6,300,000 NST) |
| Governance staking reserve | 15% (3,150,000 NST) |
| Development fund | 10% (2,100,000 NST) |
| Partnerships & growth | 5% (1,050,000 NST) |

## Notes & next steps

- Percentages and parameter values above are suggestions for initial launch and must be finalized by governance before mainnet.
- Recommended follow-ups:
  - Publish an explicit genesis allocation manifest with on-chain references.
  - Create a distribution schedule and vesting rules for development & partnership allocations.
  - Implement on-chain reward calculation contracts and an off-chain auditor to verify distributions.

---

If you want, I can now:
- Add `contracts/TOKENOMICS.sol` (reference ABI) or a simple Solidity stub for the token and distribution contracts,
- Create an on-chain genesis manifest file (JSON) and place it in `deploy/` for review,
- Add a short section in `docs/getting-started.md` describing how to view NST balances and staking in a local testnet.

Which would you like next?
