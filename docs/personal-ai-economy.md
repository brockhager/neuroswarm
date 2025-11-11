# NeuroSwarm — Personal AI Economy Design

Version: 0.1
Date: 2025-11-11

This document describes a Personal AI Economy where individuals run their own local AI agents (personal AIs) that learn, personalize, contribute verifiably to a global knowledge base (Global Brain), and earn rewards for useful contributions. The architecture emphasizes user control, auditability, decentralized incentives, and community governance.

## Table of Contents
- System Overview
- Layered Architecture (text diagram)
- Personal AI Instance (install & run)
- Network Participation (joining, connecting, contributions)
- Monetization & Incentives (Proof-of-Useful-Work, rewards)
- Global Brain / Knowledge Base (lifecycle & confidence)
- Consensus & Validator Selection (dynamic sizing)
- Blockchain Layer (events, smart contracts)
- Governance (voting, disputes)
- Confidence Scoring (calculation & thresholds)
- Auditability & Traceability
- Workflow Narrative (explicit reversible example)
- Data Schemas & Pseudocode
- Security, Privacy & Edge Cases
- Appendix: Implementation checklist and CLI examples

---

## System Overview

Vision
- Return AI control to individuals by providing a Personal AI that runs locally, stores private data locally, and participates in a decentralized economy where useful contributions are rewarded.
- Create a Global Brain — a shared, auditable knowledge base — that only accepts entries after sufficiently high consensus confidence.

Principles
- Local-first: user data, memories, and personalization remain on-device by default.
- Verifiability: every contribution, vote, and reward has a clear, auditable record anchored on-chain and content-addressed off-chain artifacts.
- Incentive-aligned: tokens and reputation reward genuinely useful contributions and honest verification.
- Modularity: components (client, validator, aggregator, contracts) are pluggable and open-source.

Success indicators
- Users can run a capable Personal AI locally with low friction.
- The network reliably integrates high-quality knowledge with low poisoning risk.
- Financial incentives are sustainable and fair across diverse contributors.

---

## Layered Architecture (text diagram)

Personal AI (user device)  →  P2P Artifact Storage (IPFS/CAS)  →  Network Layer (libp2p/gossip)  →  Blockchain Coordination Layer (L1/L2)  →  Verification Layer (validators/oracles)  →  Aggregation / Global Brain Updater  →  Governance Layer (smart contracts + UI)  →  User-facing APIs & Marketplaces

Legend
- Personal AI: local runtime, memory, trainer, wallet/identity
- P2P: stores artifact bundles and enables discovery
- Network: discovery, validator assignment, and message routing
- Blockchain: anchors pointers, votes, rewards, disputes
- Verification: deterministic checks, redundant validation, optional ZK proofs
- Aggregation: merges verified contributions into Global Brain
- Governance: manages policies, thresholds, slashing, and upgrades
- APIs: dashboards, CLI, SDKs for integrations

---

## Personal AI Instance

Goals
- Minimal friction install and run for non-expert users
- Strong local control: personal data, logs, and adapters are local by default
- Ability to opt into contribution roles (submitter, validator)

Requirements & setup (developer-friendly)
- Host OS: Windows / macOS / Linux
- Runtime: Python 3.10+ or Node.js 18+ (depending on implementation)
- Disk: ~5–20 GB (model + local cache), GPU optional for heavier models
- Network: outbound P2P connectivity (libp2p), optional NAT traversal

Simple installation steps (conceptual)
1. Download installer or run via container (Docker) or package manager.
2. Run `neuroswarm init` to create a local identity (DID + keypair) and pick a default model.
3. Run `neuroswarm run` to start the local agent and expose a local UI/HTTP API.

Local control & privacy
- Data (conversations, logs, memories) stored in local encrypted store by default.
- Users control what is published: proposals are opt-in; only artifacts and metadata are published, never raw private data.
- Personal adapters are local; publishing is an explicit action.

Customization & UX
- Preferences: persona, tone, privacy level, whether to auto-propose knowledge, and participation options.
- Plugins: user can add connectors (calendars, local files) that remain local unless explicitly shared.

Developer hooks
- CLI: `neuroswarm submit --type fact --file fact.json --stake 10` to submit a proposal
- SDK: programmatic APIs for extending the local agent

---

## Network Participation

Joining the network
- On first run, the personal AI creates/derives a DID and registers a lightweight on-chain profile (optional) with zero or small stake.
- The node connects to bootstrap peers and optional indexers.

Contribution mechanisms
- Knowledge proposals: users can propose facts/updates or small model adapter deltas.
- Compute sharing: nodes can opt-in to provide compute for verification tasks or rented workloads (with explicit consent and CPU/GPU policy).
- Service provision: nodes can offer chatbot-as-a-service endpoints (paid) to other users/clients.

Discovery & routing
- Use libp2p or similar P2P layer for discovery and message routing.
- Proposal announcements are gossip-published with CID pointers; validators pick up tasks via assignment.

Sync with Global Brain
- Nodes periodically fetch Global Brain manifests and merge updates into local search/index.
- Local personalization remains in a separate layer; Global Brain entries may be used as references.

Participation roles
- Submitter: proposes knowledge or services
- Validator: runs verification tasks (requires stake/reputation)
- Auditor: third-party deep checks for complex disputes (bounty-based)

Monetization options for users
- Earn tokens by: (a) producing accepted proposals, (b) validating accurately, (c) offering paid services (chat endpoints), (d) offering compute
- Spend tokens to access premium datasets, faster verification, or tooling

---

## Monetization & Incentives (Proof-of-Useful-Work)

High-level model
- Proof-of-Useful-Work (PoUW) rewards nodes for verifiable, useful contributions rather than raw compute.
- Rewards categories: verified knowledge proposals, validation work (attestations), service provision (paid API calls), and compute renting.

Reward components
- Proposer reward: function of measured utility (bench improvements or user signal) and final confidence C.
- Validator reward: base participation + alignment bonus when their vote matches final consensus.
- Service reward: tokens for paid API uses or compute rentals, possibly split with validators that provided trust.
- Auditor bounties: for valid dispute findings or reproducible bug fixes.

Simplified reward pseudocode
```
# Epoch pool R_epoch determined by protocol economics
for accepted proposal p:
  proposer_reward = R_epoch * alpha * utility_p * C_p
  validators_reward_pool = R_epoch * beta * (some function of N_validators)
  for v in validators:
    v_reward = validators_reward_pool * (1/N_validators) + (v.vote==final? bonus_align : 0)
```
- utility_p: measured improvement (bench metric or aggregated user feedback)
- C_p: final consensus confidence
- alpha, beta: governance-set parameters

Reputation & long-term incentives
- Reputation (non-transferable) increases with accepted proposals and accurate validations; decays slowly.
- Reputation affects: validator selection probability, attestation weight, and small reward multipliers.

Anti-abuse measures
- Require stake for validator roles to make slashing meaningful.
- Use saturating stake functions (e.g., log) to avoid concentration of power.
- Reputation accrual limits to slow sybil attacks.

Dynamic scaling (validator set size)
- Let N_target = base + floor(k * log(total_nodes + 1))
- Increase N per-proposal during times of high submission volume or elevated risk metrics
- Adjust via on-chain governance based on network metrics

---

## Global Brain / Knowledge Base

Definition
- The Global Brain is an auditable store of entries (facts, adapters, dataset references) with provenance and mutable confidence scores.
- Entries are only added/modified/removed via on-chain finalized proposals that have met confidence thresholds.

Entry lifecycle (concise)
1. Proposal created & published (artifact CID) by a Personal AI
2. Validators assigned; attestations posted
3. Compute consensus confidence C (reputation-weighted)
4. If C ≥ T_inclusion and no challenges, include entry
5. Later modification/removal proposals follow similar flow but may require higher thresholds

Confidence & metadata
- Each entry contains: creators, versions list, proofs, attestations (CIDs/tx ids), current confidence score, and status
- Confidence visible on-chain (or via indexer) and used by consumers to decide trust

Versioning & rollbacks
- Entries are immutable per-version; updates append a new version. Removal adds a tombstone version with high quorum.

Privacy model
- Artifacts contain processed or aggregated information, not raw private user data. Nodes must avoid publishing personal data unless explicitly consented by the user.

---

## Consensus & Validator Selection

Validator pool and selection
- Validators are stake-and-reputation-based participants. Anyone can opt-in but must stake a minimum amount.
- Selection per proposal uses pseudo-random sampling weighted by reputation and stake to produce an assigned validator committee of size N.

Dynamic sizing rule (example)
```
N = clamp( N_min + floor(k * log(total_active_nodes + submissions_per_epoch)), N_min, N_max )
```
- N_min, N_max, k configurable by governance

Voting & confidence calculation
- Validators submit binary or graded verdicts plus observed metrics. Each verdict has weight w_v = 1 + gamma * log(1 + rep_v)
- Raw_confidence = sum(w_v * vote_v) / sum(w_v)
- Final confidence C = calibrate(Raw_confidence, observed_metrics, proposer_confidence)

Challenge & dispute windows
- After finalization, a short challenge window may allow filing disputes (require bond). If dispute accepted, revert/expansion of verification occurs.

Incentives for validators
- Base reward + alignment bonus to encourage honest voting
- Reputation increase for accurate votes
- Slashing for proven dishonest votes or collusion

---

## Blockchain Layer

Responsibilities
- Anchor submission pointers and attestations
- Enforce staking, slashing, threshold checks, and reward distribution logic
- Provide immutable audit logs for every lifecycle event

Core on-chain events (illustrative)
- ProposalSubmitted(node, proposal_id, cid, stake)
- VoteSubmitted(validator, proposal_id, verdict, metrics_hash)
- ProposalFinalized(proposal_id, entry_id, confidence)
- RewardPaid(epoch, details_cid)
- DisputeOpened(dispute_id, evidence_cid)

Gas & scaling
- Keep artifacts off-chain; store merkle roots for batched attestations when possible
- Use L2 rollups or sidechains for production to reduce fees and latency

Smart contract primitives (conceptual)
- submitProposal(proposal_id, artifact_cid, meta_hash, stake)
- postVote(proposal_id, verdict, metrics_hash)
- finalizeProposal(proposal_id)  // invoked by aggregator after threshold
- distributeRewards(epoch)
- openDispute(proposal_id, evidence_cid)

---

## Governance

Scope of governance
- Parameters: inclusion threshold T, staking minimums, reward fractions (alpha/beta), N_min/N_max, dispute rules
- Policies: dataset inclusion, benchmark selection, removal thresholds
- Governance types: token-weighted for economic choices; reputation-weighted for technical decisions; hybrid where appropriate

Proposal lifecycle
1. Propose (deposit + description)
2. Discussion (off-chain forums + snapshot)
3. Vote (on-chain; quorum & threshold checks)
4. Execute (automated or via committee)

Emergency & committees
- Reputation-elected committee can perform emergency pauses and fast responses with higher oversight and later review

Transparency
- All proposals, votes, and execution records visible on-chain and in indexer dashboards

---

## Confidence Scoring

Purpose
- Create a robust, reproducible confidence C ∈ [0,1] per proposal/entry representing network belief in correctness

Inputs
- Validator votes and observed metrics
- Validator reputation r_v
- Proposer-reported confidence c_p
- Calibration data mapping reported confidence to realized accuracy

Algorithm (example)
1. For each validator v: vote_v ∈ {0,1}, observed_metric u_v
2. weight w_v = 1 + gamma * log(1 + r_v)
3. raw_confidence = sum(w_v * vote_v) / sum(w_v)
4. metric_score = normalize(mean(u_v))  # normalized benchmark improvement
5. calibration = sigmoid(k * (metric_score - expected_metric(c_p)))
6. final_confidence C = clamp(raw_confidence * (1 + lambda * calibration), 0, 1)

Thresholds
- Inclusion threshold T_inclusion (default 0.9)
- Removal threshold T_removal > T_inclusion (e.g., 0.95) to protect against censorship

Visibility & auditing
- Expose raw votes and weighted votes for auditors; publish calibration mappings periodically (with DP if privacy needed)

---

## Auditability & Traceability

What is auditable
- On-chain: submissions, votes, finalization, rewards, disputes
- Off-chain: artifacts (CIDs) including env manifests, evaluation scripts, deterministic seeds, and optional ZK proofs

Auditor steps (reproducible)
1. Get proposal on-chain -> artifact_cid, env_cid, tx refs
2. ipfs.fetch(artifact_cid), verify proposer signature
3. Fetch env (container digest) and run deterministic evaluation with recorded seed
4. Compare observed metrics with validator attestations and on-chain stored metrics_hash
5. Recompute confidence and reward split and validate reward transactions

Tooling recommendations
- Provide an auditor CLI that automates the above
- Archive container images and runtime manifests (env_cid) to ensure long-term reproducibility

---

## Workflow Narrative — Example: User submits a fact and earns rewards (explicit reversible steps)

Actors
- User Bob (personal AI on laptop)
- Validators V1..VN
- Aggregator service & indexer
- Governance committee (if dispute)

Step-by-step (reversible notes included)
1. Bob discovers fact F locally and chooses to propose it.
   - Bob runs: `neuroswarm submit --type=fact --file=fact.json --stake=5`
   - Local agent packages artifact bundle (fact.json, meta.json, env_manifest) -> artifact_cid and signs it.
   - Bob submits on-chain: submitProposal(artifact_cid, meta_hash, stake)
   - Reversible: Bob can unpin the artifact locally; on-chain tx remains (withdrawal requests allowed pre-inclusion via governance)

2. Validators assigned & verify
   - Validators fetch artifact_cid and env_cid, run deterministic checks, and postVote(proposal_id, verdict, metrics_hash)
   - Reversible: votes are recorded on-chain; disputes can be raised if validator misbehavior is proven.

3. Consensus & inclusion
   - Aggregator computes final confidence C.
   - If C >= T_inclusion, aggregator calls finalizeProposal(proposal_id) and publishes inclusion manifest.
   - Reversible: later modification/removal proposals can change status; removal requires higher threshold.

4. Reward distribution
   - Smart contract distributes tokens: proposer_reward and validator rewards.
   - Reversible: governance dispute can trigger slashing and reward reallocation in case of proven fraud.

5. Sync & use
   - Bob's agent pulls new Global Brain manifest in next sync and marks F as included with confidence C.
   - Bob's agent may adjust local confidence calibration or mark as private/sensitive if user chooses.

---

## Data Schemas & Pseudocode

Proposal schema (trimmed)
```
{
  "proposal_id": "hash",
  "node_id": "did:...",
  "type": "fact|adapter|service",
  "artifact_cid": "Qm...",
  "env_cid": "QmEnv...",
  "reported_confidence": 0.85,
  "claimed_metrics": {"benchA":0.72},
  "signature": "0x..."
}
```

Attestation schema (trimmed)
```
{
  "validator_id": "did:...",
  "proposal_id": "hash",
  "verdict": "accept|reject",
  "metrics_hash": "sha256...",
  "signature": "0x..."
}
```

Reward computation pseudocode
```
# inputs: accepted_proposals, R_epoch
for p in accepted_proposals:
  C = p.final_confidence
  utility = measure_utility(p)  # normalized
  proposer_reward = R_epoch * alpha * utility * C
  validator_pool = R_epoch * beta * num_validators_weight
  for v in p.validators:
    base = validator_pool / N
    bonus = (v.vote == final_vote) ? bonus_align : 0
    pay(v) = base + bonus
```

Validator selection pseudocode
```
# inputs: validator_set (list of (id, rep, stake)), N
weights = [1 + gamma * log(1 + rep) for each validator]
selected = weighted_random_sample(validator_set, weights, N)
assign(selected, proposal_id)
```

Confidence calc pseudocode
```
raw_conf = sum(w_v * vote_v)/sum(w_v)
metric_score = normalize(mean(u_v))
calib = sigmoid(k*(metric_score - expected_metric(p.reported_confidence)))
C = clamp(raw_conf * (1 + lambda * calib), 0, 1)
```

---

## Security, Privacy & Edge Cases

Model poisoning
- Multi-validator redundancy, reputation-weighted voting, and clipping of update magnitudes mitigate poisoning.

Sybil & stake attacks
- Minimum stake and reputation-growth limits slow sybil attacks. Slashing deters malicious behavior.

Privacy
- Raw private data never published unless explicitly consented by user. Use DP and ZK where needed.

Reorgs and chain finality
- Wait for finality (e.g., confirmations) before starting verification; L2s or permissioned chains reduce latency.

Spam & DoS
- Submission fees, minimum stakes, and reputation friction mitigate spam.

Data availability
- Use pinning services and incentivized pinning (indexers) for artifact availability. Consider archival incentives.

---

## Appendix: Implementation checklist & CLI examples

MVP checklist
- Personal AI installer + local runtime and identity creation
- P2P layer + IPFS artifact storage
- Smart contracts for submitProposal, postVote, finalizeProposal, distributeRewards
- Validator runner (deterministic verification) prototype
- Aggregator + indexer for manifests & audit explorer
- Basic UI/CLI for submit, vote, query

CLI examples (conceptual)
```
# initialize local agent
neuroswarm init --name "BobAI"

# run local agent
neuroswarm run

# propose a fact
neuroswarm submit --type fact --file ./fact.json --stake 5

# act as validator (opt-in)
neuroswarm validator run --concurrency 2

# fetch global brain manifest
neuroswarm fetch-manifest --version latest
```

Next steps I can implement for you
- Create `docs/getting-started.md` with a toy node and submit example.
- Scaffold a small Python validator runner and toy artifact to demonstrate verification locally.
- Draft minimal smart-contract ABIs for submission, vote, finalize, and reward distribution.
- Add a link to this doc in `docs/README.md`.

Which would you like me to do next? You can pick one or more and I will add it to the todo and implement it.