# NeuroSwarm Governance Design

Version: 0.1
Date: 2025-11-11

This document defines the governance system for the NeuroSwarm Personal AI Economy. It covers staking, voting, consensus flow, auditability, incentives, slashing/penalties, dispute resolution, data schemas, and pseudocode. The design emphasizes democratic participation, transparency, and auditable on-chain records.

## Table of contents
- Goals & Principles
- Roles & Responsibilities
- Staking
- Voting Mechanisms
- Consensus Flow (step-by-step)
- Auditability & On-chain Records
- Incentives, Rewards & Penalties
- Slashing & Dispute Resolution
- Dynamic Validator Sizing
- Weighting: Token, Reputation, Hybrid
- Smart-Contract Primitives & Events
- Data Schemas & Pseudocode
- Security Considerations & Edge Cases
- Example Workflows
- Appendix: Parameter suggestions and implementation checklist

---

## Goals & Principles

Design goals
- Democratic participation: any user may participate, subject to minimum staking and identity rules.
- Transparency: every governance action and vote is auditable on-chain.
- Fairness: weights combine stake and reputation to balance economic skin and long-run trust.
- Safety: staking acts as collateral; slashing deters dishonest behavior.
- Scalability: validator sets adjust dynamically with network growth.

Core principles
- Openness: governance rules and parameters are public and upgradable via governance.
- Traceability: each proposal's full history is recorded with CIDs for off-chain artifacts.
- Reversibility: critical actions (e.g., protocol upgrades) have delays and rollback paths.

---

## Roles & Responsibilities

- User: runs a Personal AI, can submit proposals, vote, and offer optional compute or services.
- Proposer: a node that submits a governance proposal or knowledge proposal.
- Validator: a staked and optionally reputation-qualified node assigned to verify proposals and cast votes.
- Aggregator/Coordinator: off-chain service that collects votes, computes confidence, and triggers finalization (on-chain calls).
- Auditor: independent or bounty-paid party that replays verification and can open disputes.
- Governance Committee (optional): reputation-elected group for emergency actions.

---

## Staking

Purpose
- Staked tokens grant voting power and validator eligibility and act as collateral against dishonest or negligent behavior.

Staking rules
- Minimum stake S_min required to be eligible as a validator.
- Lockup period L_lock for staked tokens while actively participating (configurable).
- Unstaking delay L_unstake after withdrawal request (gives time to process disputes and slashing).

Staking actions
- stake(amount): increase stake balance and on-chain voting weight
- withdraw(amount): mark withdrawal; funds returned after L_unstake unless slashed

Staking rewards
- Yield on stake: small baseline yield (e.g., protocol-defined fraction) paid from epoch reward pool
- Governance bonuses: additional rewards for active voting participation and correct attestations

Collateral & slashing
- A portion of stake can be slashed for proven malicious behavior (forgery, collusion, false attestations)
- Slashing parameters: fraction or fixed amount; configurable by governance

Example parameters (suggestion)
- S_min = 10 tokens
- L_lock = active participation window (e.g., stake locked for active sets)
- L_unstake = 7 days
- Slashing fraction = variable; e.g., 1–100% depending on severity

---

## Voting Mechanisms

Types of votable items
- Knowledge proposals: add / modify / remove facts (Global Brain)
- Protocol parameters: thresholds, reward splits, validator sizing
- Dataset inclusion / benchmark selection
- Protocol upgrades and migrations

Voting modes
- Per-proposal validator voting (committee-based) for knowledge proposals and verifications
- Wide DAO-style votes (token-weighted) for high-level economic and protocol parameters
- Reputation-weighted or hybrid voting for technical proposals (to favor informed actors)

Vote options
- Knowledge proposals: {accept, reject, abstain}
- Parameter proposals: {yes, no, abstain}
- Emergency: fast-track with committee approval + later community ratification

Voting windows
- Standard voting window (e.g., 7 days) for DAO proposals
- Shorter windows for per-proposal verification (epoch-based) with dispute window after finalization

Vote weighting
- Token-weighted: weight proportional to staked tokens (optionally saturating)
- Reputation-weighted: weight proportional to reputation score
- Hybrid: weight = alpha * stake_weight + (1 - alpha) * reputation_weight
- Default alpha recommended = 0.6 (subject to governance)

Abstain handling
- Abstain reduces quorum but must be accounted for in quorum calculations

Quorum & thresholds
- Quorum q: minimum participation fraction required for a vote to be valid (e.g., 20% of active stake)
- Threshold T: minimum weighted support required for acceptance (e.g., 50% for DAOs, 90% for knowledge inclusion)

### Generative Governance Parameters
- **minTokens**: The minimum number of tokens a generated response must have.
- **maxTokens**: The maximum number of tokens a generated response can have.
- **minCoherence**: The minimum coherence score a generated response must have.
- **toxicityEnabled**: A boolean flag to enable or disable toxicity detection in generated responses.

---

## Consensus Flow (step-by-step)

This flow applies to knowledge proposals and per-proposal verification.

1) Proposal submission
- Proposer packages artifact and posts a `submitProposal` transaction that includes: proposal_id, artifact_cid, proposal_type, stake (optional), and metadata.
- The on-chain event is emitted: ProposalSubmitted(...)

2) Validator set selection
- System selects a validator committee for this proposal using dynamic sizing (see "Dynamic Validator Sizing"). Selection uses pseudo-random sampling weighted by stake and reputation.

3) Validator verification & voting
- Each assigned validator fetches artifact_cid, reconstructs env (env_cid), runs deterministic checks and benchmark, and posts `postVote(proposal_id, verdict, metrics_hash, signature)` on-chain (or batched merkle root).

4) Confidence calculation
- Aggregator collects votes and computes weighted confidence C = sum(w_v * vote_v) / sum(w_v)
- Vote_v = 1 for accept, 0 for reject; w_v = weight from stake/reputation formula

5) Threshold check
- If C >= T_inclusion (default 0.90), proposal is accepted and `ProposalFinalized` is emitted with confidence and manifest CID.
- If C < T_inclusion but above an escalate threshold, proposal may be queued or sent to bigger committee; if clearly below, it is rejected.

6) Blockchain recording
- All votes, final confidence, and outcome are logged on-chain (or via merkle-batched attestations anchored on-chain).

7) Rewards & reputation updates
- Rewards distributed to proposer and validators according to reward formula; reputation updated (increase for correct votes aligning with final outcome, decrease for misaligned or malicious behavior).

8) Dispute window
- A challenge window (e.g., 48–72 hours) allows disputes. If a dispute is filed, finalization may be paused and expanded verification occurs.

Reversible points
- Proposal can be withdrawn before finalization (if proposer opts) or challenged after finalization according to dispute rules. Slashing and reward reversals are possible if fraud is proven.

---

## Auditability & On-chain Records

Every governance action is recorded or anchored on-chain. Key on-chain records:
- ProposalSubmitted(proposal_id, proposer, artifact_cid, meta_hash, stake)
- ValidatorAssigned(proposal_id, validator_ids[], committee_seed)
- VoteSubmitted(proposal_id, validator, verdict, metrics_hash)
- ProposalFinalized(proposal_id, entry_id, confidence, manifest_cid)
- RewardDistributed(epoch, details_cid)
- DisputeOpened(dispute_id, proposer, evidence_cid)
- DisputeResolved(dispute_id, outcome, slashed_accounts[])

Off-chain artifacts (content-addressed)
- artifact_cid: proposal bundle (artifact, env_manifest, deterministic seeds, proofs)
- metrics files, attestation details (if not on-chain), and audit manifests

Indexing & explorers
- Off-chain indexer maintains copies of events for fast queries (UI/dashboard) while canonical truth is on-chain.
- Auditor CLI uses on-chain IDs + CIDs to re-run verifications.

Privacy note
- On-chain stores metadata and hashes only; raw user data is never stored on-chain unless explicitly consented.

---

## Incentives, Rewards & Penalties

Reward categories
- Participation reward: base reward R_base for casting a vote on an assigned proposal
- Alignment bonus: extra reward for votes aligning with final consensus
- Proposer reward: reward to proposer scaled by final confidence C and measured utility
- Reviewer/Auditor bounty: paid for successful dispute findings or deep audits

Reward calculation (simplified)
```
# Epoch pool R_epoch
for each accepted proposal p:
  proposer_reward = R_epoch * alpha * utility_p * C_p
  validator_base_total = R_epoch * beta  # split across validators
  for validator v in committee:
    v_reward = (validator_base_total / N) + (v.vote == final_vote ? bonus_align : 0)
```
- Parameters alpha, beta set by governance; utility_p derived from deterministic benchmarks and user signals

Reputation effects
- Reputation increases for accepted proposers and validators whose votes align with consensus; decreases for slashed or repeat-misaligned actors
- Reputation influences future selection probability and vote weight

Penalties & slashing
- Types of offenses: forged attestations, collusion, deliberate misreporting, repeated incorrect attestations indicating negligence
- Penalty actions: reputation reduction, partial stake slashing, removal from validator eligibility
- Slashing process: requires evidence (on-chain) and adjudication; slashing events are recorded on-chain

Anti-capture measures
- Cap effective voting weight from a single staked address via saturating functions (e.g., log(1+stake))
- Reputation-based checks to prevent purely token-based oligarchy

---

## Slashing & Dispute Resolution

Slashing process
1. Evidence submission: any party can submit evidence of misbehavior with bond to discourage frivolous claims
2. Adjudication: committee or on-chain dispute module evaluates evidence (may run extra verification)
3. Ruling & enforcement: if malicious behavior proven, slash stake and adjust reputation; if claim is frivolous, the submitter's bond is burned

Dispute lifecycle
- OpenDispute(proposal_id, evidence_cid, bond)
- Assign adjudication committee (larger, reputation-weighted)
- Committee issues ruling: upheld, rejected, or escalate to referendum
- All steps recorded on-chain

Safeguards
- Multi-stage appeals (committee → larger committee → full referendum) for serious cases
- Time-bound windows and transparency for fairness

---

## Dynamic Validator Sizing

Motivation
- Larger validator committees increase security but cost more verification work. We scale N dynamically with network size and submission load.

Heuristic algorithm (example)
```
# parameters: N_min, N_max, k
N = clamp(N_min + floor(k * log(total_active_nodes + submissions_last_epoch + 1)), N_min, N_max)
```
- Alternative: target security level by increasing N when risk metrics (variance in votes, number of disputes) exceed thresholds

Assignment
- Selected by weighted-random sampling where weight = 1 + gamma * log(1 + reputation) + stake_factor
- Use deterministic committee seed derived from block / epoch to prevent manipulation

---

## Weighting: Token, Reputation, or Hybrid

Weighting functions
- stake_weight(s) = log(1 + s)  # saturating to limit whales
- rep_weight(r) = 1 + gamma * log(1 + r)
- hybrid_weight = alpha * normalize(stake_weight) + (1 - alpha) * normalize(rep_weight)

Recommended defaults
- alpha = 0.6 (slightly favor stake), gamma = 0.5
- Normalize across committee when computing vote weights

Rationale
- Token stake ensures economic skin; reputation ensures long-term trust and technical knowledge
- Hybrid reduces risk of purely bought influence and rewards sustained honest participation

---

## Smart-Contract Primitives & Events

Core primitives (conceptual)
- submitProposal(proposal_id, artifact_cid, meta_hash, stake)
- assignValidators(proposal_id, validators[])  // emitted event or on-chain mapping
- postVote(proposal_id, verdict, metrics_hash)  // sig verifies validator
- finalizeProposal(proposal_id, manifest_cid, confidence)
- distributeRewards(epoch)
- stake(amount), requestUnstake(amount)
- openDispute(proposal_id, evidence_cid, bond)
- adjudicateDispute(dispute_id, ruling)

Key events
- ProposalSubmitted
- ValidatorAssigned
- VoteSubmitted
- ProposalFinalized
- RewardDistributed
- DisputeOpened
- DisputeResolved
- StakeChanged

Gas & batching recommendations
- Batch votes via merkle roots to save gas; store merkle root on-chain and proofs/attestations off-chain
- Use L2s / rollups for high-volume activity

---

## Data Schemas & Pseudocode

ProposalSubmitted event schema (JSON)
```
{
  "proposal_id": "string",
  "proposer": "did:...",
  "artifact_cid": "Qm...",
  "proposal_type": "knowledge|parameter|upgrade",
  "stake": 10,
  "timestamp": 1699710000
}
```

VoteSubmitted (on-chain / batched) schema
```
{
  "proposal_id":"string",
  "validator":"did:...",
  "verdict":"accept|reject|abstain",
  "metrics_hash":"sha256...",
  "signature":"0x..."
}
```

Confidence calculation (pseudocode)
```
# inputs: votes = [(validator, verdict, rep, stake), ...]
weights = [hybrid_weight(rep, stake) for each validator]
numer = sum(weight_i * (verdict_i == 'accept' ? 1 : 0))
denom = sum(weights)
raw_conf = numer / denom
metric_score = normalize(mean(observed_metric_i))
calib = sigmoid(k*(metric_score - expected_metric(proposer_conf)))
C = clamp(raw_conf * (1 + lambda * calib), 0, 1)
```

Reward distribution (pseudocode)
```
# R_epoch allocated
for proposal in accepted_proposals:
  proposer_pay = R_epoch * alpha * utility(proposal) * C
  validator_base = (R_epoch * beta) / N
  for v in validators:
    pay(v) = validator_base + (v.vote == final ? bonus_align : 0)
  pay_to_proposer(proposer, proposer_pay)
  pay_to_validators(validators, pay)
```

Validator selection (pseudocode)
```
# inputs: validator_pool list of (id, rep, stake)
weights = [1 + gamma*log(1+rep) + stake_factor(stake) for each]
committee = weighted_random_sample(validator_pool, weights, N)
publish ValidatorAssigned(proposal_id, committee, seed)
```

---

## Security Considerations & Edge Cases

Collusion & bribery
- Risk: validators collude for bribers. Mitigations: randomized committees, reputation tracking, slashing, high bond cost for disputes.

Censorship
- Risk: large staked actors censor proposals. Mitigations: saturating stake weight, reputation-based checks, appeals and larger committees.

Flash staking attacks
- Risk: attacker farms stake temporarily to influence a vote. Mitigations: minimum lock-up periods, reputation influence, and sliding stake weight windows.

False evidence & spam
- Bonded dispute submissions to deter frivolous disputes; auditor bounties to encourage evidence submission for real issues.

Reorgs and finality
- Avoid starting verification until a chain finality threshold is met (or use fast-finality L2).

---

## Example Workflows

A. Knowledge inclusion (compact)
1. Alice submits proposal P with artifact_cid.
2. System selects N validators using dynamic sizing.
3. Validators fetch artifact, run checks, post votes.
4. Aggregator computes C; if C >= 0.9, finalize and publish entry.
5. Distribute rewards; update reputation. All steps anchored on-chain.

B. Dispute & slashing
1. Bob files dispute with evidence and bond.
2. Committee examines evidence; runs additional verification.
3. If Bob right, revert inclusion, slash malicious validators, reward Bob; else burn Bob's bond.

---

## Appendix: Parameter Suggestions & Implementation Checklist

Suggested starting parameters (tunable by governance)
- Inclusion threshold T_inclusion = 0.90
- Removal threshold T_removal = 0.95
- Minimum stake S_min = 10 tokens
- Unstake delay = 7 days
- Voting window (DAO) = 7 days
- Challenge window (post-finalization) = 48–72 hours
- alpha (stake vs rep) = 0.6
- gamma (rep sensitivity) = 0.5
- N_min = 3, N_max = 51, k = 2

Implementation checklist
- Smart contracts: staking, proposal lifecycle, voting registry, rewards, disputes
- Indexer: off-chain DB for dashboards and auditors
- Validator runner: deterministic execution environment reference and runner code
- Auditor CLI: fetch on-chain events + CIDs and replay verification
- UI: proposal pages, vote pages, audit explorer, stake management

---

If you want, I can now:
- Add `docs/getting-started.md` describing how to run a node, stake tokens in a testnet, and participate as a validator (toy flow), or
- Scaffold a minimal Solidity ABI and contracts for `submitProposal`, `postVote`, `finalizeProposal`, and `stake`, or
- Implement a small Python validator runner prototype to demonstrate the verification and vote posting flow locally.

Which would you like me to do next?