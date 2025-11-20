# NeuroSwarm — Economic Model

## Overview

NeuroSwarm is built on a token-backed economic model designed to (1) discourage spam and resource abuse, (2) sustainably fund participants who provide useful work, and (3) align incentives across chat agents, validators, storage providers, and aggregators. The native token (NST) is the unit of value for staking, rewards, and governance. NOTE (policy update): end users do NOT pay per chatbot request; instead, the protocol uses staking as the primary anti-spam and access-control mechanism. The economy emphasizes verifiable contribution, proportional rewards, and penalties for malicious behavior.

## Policy update — user-facing fees

- This document was extended to reflect a policy change: NeuroSwarm does not charge end users a per-chatbot-request fee by default.
- Transaction fees may still exist in optional configurations (operator-configured services, premium features, or third-party gateways), but they are not the default anti-spam mechanism.

## Transaction Costs (Legacy / Optional)

- Historically the design allowed a small per-request fee (e.g., 1 NST baseline) as an anti-spam measure. This approach remains documented for operators who wish to enable optional fee-backed services.
- Under the current policy, end users do not pay per-chatbot request by default. Optional fees can be configured by operators for premium gateways, high-throughput endpoints, or third-party services.
- If enabled, collected fees are pooled and redistributed to participants or used for operational costs (incentivized pinning, archival, etc.). Any activation of per-request fees should be governed and transparent.

Design notes:
- Optional fees are adjustable via governance if the community elects to enable them.
- Differential pricing (e.g., discounts for high-reputation nodes) is an optional extension and should be governed to avoid unfair advantages.

## Reward Distribution

Rewards are distributed to all participating nodes according to role, measurable contribution, stake, and reputation. Reward pools are primarily funded from protocol-controlled sources (see Circulation & Sustainability) rather than relying on per-request fees. Payouts occur in periodic epochs and are recorded on-chain for auditability.

Roles and reward characteristics:

- NS Nodes (Chatbot Agents)
  - Earn rewards for submitting useful knowledge artifacts, adapters, metadata, or proposals that pass validation and are accepted into the Global Brain.
  - Rewards are proportional to the assessed usefulness (score), the size/quality of the contribution (e.g., smaller, precise updates may be valued more), and the submitter's reputation.

- Validator Nodes
  - Receive higher rewards for participating in verification, producing attestations, executing deterministic checks, and maintaining consensus.
  - Validator rewards scale with the number of verified submissions, the quality of attestations (measured by agreement with other honest validators), and the stake committed by the validator.

- IPFS Storage Nodes
  - Paid for hosting, pinning, and serving persisted artifacts (CIDs), ensuring auditability and long-term availability.
  - Rewards can be paid per-pin, per-GB-month, or via periodic payouts based on usage and verified uptime.

- Aggregation Layer (Mergers / Publishers)
  - Entities or services that merge updates (confidence-weighted aggregation), create manifests, and publish final artifacts to the network earn rewards for successful, verifiable aggregation work.
  - Aggregator rewards are proportional to the amount and quality of merged updates and may include a fee for publishing manifests that become canonical.

Distribution mechanics:
- Rewards are proportional to a function of contribution, stake, and reputation. The function should be transparent and on-chain where possible (e.g., reward shares recorded in smart contract events or manifest metadata).
- An epoch-based payout system batches fees and rewards to reduce gas costs and consolidate accounting.
- To prevent Sybil farming, small account limits, reputation-based multipliers, stake thresholds, and minimum participation requirements may be applied.
 - To prevent Sybil farming, small account limits, reputation-based multipliers, stake thresholds, and minimum participation requirements may be applied.

## Staking-based Anti-Spam & Access

- Staking is the primary anti-spam and access-control mechanism in NeuroSwarm. To activate and run a chatbot node (NS Node), a user must stake a minimum amount of NST.
- Stakes act as collateral: misbehavior (spam, equivocating submissions, repeated low-quality proposals) can trigger slashing of staked tokens and reputational penalties.
- Staking parameters:
  - Minimum stake to activate a node (governance-configurable).
  - Stake locks for node activation periods and unbonding delays to prevent churn-based attacks.
  - Stake-weighted eligibility for validator selection and higher governance weight.
- Staking discourages Sybil attacks because each active node requires a meaningful economic commitment.

Benefits of staking vs per-request fees:
- Low friction for end users: no per-message micropayments required, better UX.
- Strong economic disincentive for spam via slashing and stake loss risks.
- Easier to implement reputation and rate-limiting policies tied to locked stake and verified behavior.

## Reputation System

- Reputation is a separate score tied to a node identity (public key) that increases with honest, timely participation and decreases on verified misbehavior.
- Effects of reputation:
  - Higher reputation increases reward multipliers and can relax rate limits.
  - Low-reputation nodes face stricter rate limits, smaller reward shares, and may be temporarily barred from validator selection until they rebuild trust.
  - Reputation resets or recovery mechanisms (slow rebuilding, probation periods) are governed to prevent gaming.
- Reputation should be deterministic where possible (based on verifiable on-chain events and attestations) and auditable by external services.

## Circulation & Sustainability (updated)

- NeuroSwarm's initial supply model assumes a premined allocation of 21,000,000 NST (21M). Portions of the premine are allocated to bootstrap reward pools, ecosystem grants, and protocol maintenance.
- Reward pools used to pay validators, storage nodes, aggregators, and NS nodes are controlled by governance and funded from the premined allocations and any optional on-chain emission.
- Optional inflationary issuance is permitted if governance decides it is needed to maintain long-term sustainability; such issuance must be gradual and explicitly authorized.
- Because end users do not pay per request by default, the protocol relies on premined reserves, governance-controlled reward pools, and optional emissions to sustain payouts during growth phases.

Technical and operational considerations:
- Reward distribution should be transparent and recorded on-chain. External indexers can reconcile contributions and payouts to detect anomalies.
- A fraction of reward pools may be reserved for incentivized pinning, archival, and market-based storage providers to ensure persistence of critical artifacts.

## Workflow Narrative — staking → verification → aggregation → rewards

1. Node activation
  - A user stakes the minimum NST and activates an NS Node (chatbot agent). The stake is locked for an activation period.
2. Contribution
  - The node submits a proposal (knowledge artifact, adapter, or metadata) to the network. Submissions include manifests and CIDs for off-chain artifacts.
3. Verification
  - Validator nodes (selected by stake/reputation) run deterministic checks and produce attestations. Honest validators sign attestations that are stored as on-chain events or referenced manifests.
4. Aggregation
  - Aggregators collect validated submissions, run confidence-weighted merges, and publish a manifest that references accepted artifacts. The manifest becomes the candidate for inclusion in the Global Brain.
5. Settlement & Rewards
  - At epoch settlement, the governance-controlled reward pool pays out rewards to contributors, validators, storage nodes, and aggregators according to the configured formula. Reputation scores are updated based on verified behavior.
6. Dispute & Slashing
  - If disputes arise (e.g., evidence of fabricated proofs), the governance and slashing mechanisms can penalize misbehaving actors and redistribute parts of slashed stakes to affected parties or to the reward pool.

## Summary table — roles vs typical reward tier

| Role | Typical reward tier | Notes |
|------|---------------------:|------|
| NS Node (Chatbot Agent) | Medium | Rewards for accepted, useful submissions; scaled by reputation and contribution quality |
| Validator Node | High | Higher rewards for attestations and consensus participation; scales with stake and honesty |
| IPFS Storage Node | Low–Medium | Paid for storage, pinning, and uptime; can be per-pin or periodic |
| Aggregator / Publisher | Medium–High | Rewards for verified merging and publishing canonical manifests |

## Staking & Governance Incentives

- Users stake NST to gain voting rights and become eligible to run validator nodes. Staked tokens increase governance weight and validator selection probability.
- Honest, consistent participation increases a node's reputation, which in turn improves future reward share and access to protocol benefits (discounts, priority submissions, voting weight boosts).
- Malicious or dishonest behavior (double-signing, submitting fabricated proofs, spamming the network with low-quality artifacts) results in slashing of staked tokens and reputational penalties. Slashing parameters are governed and configurable.

Governance primitives:
- Token-weighted voting for protocol-level parameter changes (fees, slashing rates, emission schedules).
- Reputation-weighted components for nuanced governance (e.g., advisory signals from long-standing, high-reputation nodes).
- On-chain records of proposals, votes, and finalized parameter changes ensure transparency and auditability.

## Circulation & Sustainability

- Transaction fees collected from chatbot requests continuously feed the reward pool; this creates a self-sustaining loop where user activity funds node incentives.
- If the protocol includes inflationary issuance (token emission), that emission should be gradual and governed; emissions can bootstrap early participation and then taper as fees become the dominant reward source.
- The economic model aims to balance long-term sustainability with fairness:
  - Fees must be high enough to deter spam but low enough to allow organic usage and experimentation.
  - Rewards must be sufficiently attractive to maintain validator, storage, and aggregator participation.

Technical and operational considerations:
- Fee collection and reward distribution are best implemented as transparent on-chain events and periodic settlement rules to allow external indexers and auditors to verify payouts.
- Off-chain components (indexers, auditors) can help reconcile contributions, measure uptime, and detect fraud; these services can themselves be rewarded from the protocol.
- To ensure persistence of critical artifacts, part of the reward pool may be reserved for incentivized pinning and archival services.

## Summary and Safety Mechanisms

- NeuroSwarm's economic model uses modest per-request transaction costs to deter spam and create a steady funding stream for participants.
- Rewards flow to all participant roles (agents, validators, storage, and aggregators) and are proportional to verifiable contribution, stake, and reputation.
- Staking and slashing align incentives for honest behavior and provide governance with economic teeth to tune protocol parameters.
- The model is intentionally flexible: fees, reward curves, and staking parameters are governance-configurable so the community can adapt to changing usage patterns and threats.

## Next steps (suggested)

- Add a simple reward-share formula and numeric examples for an epoch (toy model) and include expected gas/settlement costs for reference.
- Draft smart-contract stubs (ABI + events) for fee collection, epoch settlement, reward distribution, staking, and slashing under `contracts/`.
- Create a `docs/getting-started.md` with a walkthrough showing a user paying a request fee and validators verifying a sample submission so the economics can be exercised in a dev environment.
