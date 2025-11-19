# NeuroSwarm — Global Brain Design

Version: 0.1
Date: 2025-11-11
Authors: (open-source contributions welcome)

This document specifies a design for NeuroSwarm: a decentralized network of chatbot agents where each node learns locally, proposes knowledge, participates in consensus, and is rewarded when contributing useful, verifiable updates to a shared global knowledge base (the "Global Brain"). The system emphasizes transparency, auditability (blockchain anchoring), reputation, and confidence-weighted inclusion.

## Table of Contents
- System Overview
- Layered Architecture (text diagram)
- Node Design
- Global Brain / Knowledge Base
- Consensus & Voting
- Blockchain Layer
- Verification Layer
- Aggregation & Synchronization
- Governance
- Incentive Model (Tokenomics + Reputation)
- Confidence Scoring
- Auditability & Traceability
- Workflow Narrative (explicit reversible steps with pseudocode)
- Data Schemas
- Security Considerations and Edge Cases
- Appendix: Implementation checklist and suggestions

---

## System Overview

Purpose & Vision
- NeuroSwarm builds a shared, evolving Global Brain (collective knowledge base) through contributions from many autonomous chatbot agents (nodes).
- Each node retains local personalization (private memory, adapters) while participating in network-level verification and knowledge sharing.
- Knowledge enters the Global Brain only after reaching a consensus confidence threshold (e.g., ≥ 90%).

Core principles
- Decentralization: no single entity controls the Global Brain.
- Verifiability: every lifecycle event (proposal → votes → inclusion → modification/removal) is logged and auditable on-chain.
- Confidence & Reputation: submissions carry confidence scores; validators vote, producing a consensus confidence that governs acceptance.
- Incentives: tokens & reputation reward honest participation and penalize malicious behavior.

Comparative note
- Compared to centralized systems, NeuroSwarm trades centralized control for verifiability and community-driven trustworthiness and resilience.

Success criteria (examples)
- Global Brain grows with high-quality entries (benchmarked improvements and real-world utility).
- High auditability: independent auditors can reproduce verification runs using on-chain references and content-addressed artifacts.
- Low effective rate of successful poisoning or malicious entries.

---

## Layered Architecture (text diagram)

Nodes (Chatbot Agents)  →  P2P Artifact Storage (IPFS/CAS)  →  Blockchain Coordination Layer  →  Verification Layer (Oracles/Validators)  →  Aggregation Layer (Global Brain Updater)  →  Governance Layer (Smart Contracts + UI)  →  User-facing APIs / Dashboards

Legend (short):
- Nodes: run local chat services, local memory, produce proposals.
- P2P Storage: stores artifacts (proposals, proofs, env images) by CID.
- Blockchain Layer: anchors submission pointers, votes, attestations, and reward events.
- Verification Layer: validators fetch artifacts, run deterministic checks/benchmarks, optionally verify ZK-proofs, and post attestations.
- Aggregation Layer: merges verified items into the Global Brain.
- Governance Layer: handles proposals, rules, dispute resolution, and parameter changes.
- APIs: expose chat endpoints, audit explorer, and developer tools.

---

## Node Design (Chatbot Agents)

High-level responsibilities
- Serve users (chat interface)
- Maintain local memory (private facts, logs) and personalization adapters
- Learn locally (on-device or local infra) and generate proposals (facts, knowledge entries, small model deltas)
- Participate as validators when opted-in (run verification tasks)
- Hold cryptographic keys (DID/pubkey) to sign proposals and attestations

Key components
- Runtime: LLM or smaller model + adapter support
- Local Memory Store: key-value store for facts with {content, source, confidence_local, ts, ttl}
- Trainer: scripts for adapter fine-tuning, local evaluation, and packaging
- Packager: creates a content-addressed bundle with delta/fact, metadata, env image CID, deterministic seed, and optional ZK artifacts
- Wallet/Identity: manages keys for signing

Memory & personalization
- Local memory items include a confidence_local score and are used to produce candidate proposals.
- Local personalization layers (adapters or context windows) are not automatically shared; operators opt to publish when desired.

Security & reproducibility
- Training runs must reference a container image CID or deterministic runtime description (env_cid) so validators can reproduce evaluation deterministically.
- Nodes should sandbox training (containers, VMs, or TEEs) to limit tampering and provide reproducible artifacts.

Submission artifact (example fields)
- proposal_id: hash
- node_id: did:...
- proposal_type: fact | correction | model_delta
- base_brain_version: vX.Y.Z
- artifact_cid: Qm...
- env_cid: QmEnv...
- claimed_metrics: {benchA: 0.72}
- confidence_reported: 0..1
- proof_cid: optional (ZK or deterministic transcript)
- signature

---

## Global Brain / Knowledge Base

Definition
- The Global Brain is a structured store of knowledge entries (facts, structured data, small model artifacts, adapters) that nodes may read and reference.
- Each entry has metadata: origin(s), version history, confidence, attestations, and on-chain references.

Entry lifecycle
- Proposed: node creates and publishes proposal (artifact CID) and submits a pointer on-chain.
- Voting: validators fetch the artifact and vote; each vote is recorded on-chain (or anchored via merkle batch with attestations)
- Inclusion: if consensus confidence ≥ threshold (configurable, default 0.9) -> entry is inserted into Global Brain with version id and timestamp.
- Modification/Removal: entries may be updated by later proposals; removal occurs by accepted vote and logged with full audit trail.

Structure of an Entry
- entry_id (CID or deterministic hash)
- type: fact | dataset-ref | adapter | policy
- content_cid: content pointer
- authors: list of node_ids
- versions: chronological list of modifications (each with CID and on-chain tx reference)
- confidence: consensus confidence (0..1)
- attestation_refs: list of validator attestations (CIDs or tx ids)
- status: active | deprecated | removed

Access & queryability
- Indexer services maintain an off-chain index for fast queries, while canonical state can be reconstructed by reading on-chain manifests and fetching CIDs.

Trust model
- Confidence represents the network's current belief in an entry's correctness.
- Consumers may combine Global Brain confidence with local calibration to decide whether to rely on an entry.

---

## Consensus & Voting

Validator set
- Dynamic, scalable validator set. Size adapts to network growth and load (inspired by difficulty adjustment models). Validators can be node operators who stake tokens and/or have reputation.
- Selection uses a pseudo-random, reputation-weighted sampling per epoch to assign validators to proposals.

Voting model
- For each proposal p, assign N validators (N grows with stake/reputation and network size; e.g., N = base + log(total_active_nodes)).
- Validators fetch p.artifact_cid and run deterministic verification.
- Each validator posts a signed vote: {proposal_id, validator_id, verdict: {accept|reject}, metrics, timestamp, signature}.
- Consensus confidence C is computed as weighted_accept_votes / total_weighted_votes, where weights are reputation-based.

Thresholds & inclusion
- Default inclusion threshold T = 0.9 (90%). Configurable via governance.
- If C ≥ T and no dispute is raised within a challenge window, the proposal is included. If C < T, proposal rejected or queued for further review.

Validator incentives
- Validators earn base rewards for participation and bonus for aligning with final consensus.
- Validators who systematically misalign with consensus lose reputation; malicious behavior can be slashed.

Dynamic validator sizing (example)
- Let target_security = function(total_submissions_per_epoch)
- Compute N = clamp(round(k * log(total_active_nodes + 1)), N_min, N_max)
- Use reputation-weighted random selection to choose N validators per proposal.

Dispute handling
- If variance in votes is high (e.g., |accept - reject| > threshold), a dispute may be opened. Dispute triggers larger committee or full re-run of verification with additional validators.

---

## Blockchain Layer

Responsibilities
- Anchor submission pointers, votes/attestations, aggregation manifests, and reward events.
- Enforce smart-contract logic for inclusion thresholds, staking, slashing, and reward distribution.
- Provide immutable audit logs (tx history) for every lifecycle event.

On-chain events (examples)
- SubmissionPosted(node, proposal_id, artifact_cid, meta_hash, stake)
- VotePosted(validator, proposal_id, verdict, metrics_hash)
- ProposalIncluded(proposal_id, entry_id, confidence, manifest_cid)
- RewardDistributed(epoch, details_cid)
- DisputeOpened(dispute_id, proposer, evidence_cid)

Gas & scalability strategies
- Keep artifacts off-chain (IPFS/CAS). On-chain store only compact metadata and merkle roots for batched attestations.
- Use Layer-2 rollups, sidechains, or consortium chains initially to keep costs reasonable.

Smart-contract primitives (conceptual)
- submitProposal(proposal_id, artifact_cid, meta_hash, stake)
- postVote(proposal_id, verdict, metrics_hash)
- finalizeProposal(proposal_id)  // callable by aggregator once thresholds met
- publishEntry(entry_id, manifest_cid)
- distributeRewards(epoch)
- openDispute(proposal_id, evidence_cid)

---

## Verification Layer

Goals
- Ensure correctness and reproducibility of proposed knowledge before acceptance.
- Provide strong economic incentives for honest verification.

Verification methods
1. Deterministic re-evaluation
   - Validators reproduce the environment using env_cid and run the provided evaluation with deterministic RNG seeds.
2. Redundant computation
   - Multiple independent validators run the same checks; redundancy reduces single-point failure risk.
3. Reputation-weighted consensus
   - Validator votes are weighted by reputation; reputation evolves by past performance.
4. Zero-knowledge proofs (where feasible)
   - Small ZK-proofs can prove certain properties (e.g., DP noise added, gradient norms clipped) without revealing private data or full logs.
5. Oracles / external attestations
   - Trusted oracles can supply external data (e.g., ground truth for a factual claim) or attest to environment properties.

Verification outputs
- Attestation object: {validator_id, proposal_id, verdict, observed_metrics, proof_cid?, signature}
- Attestations are anchored (individually or via batched merkle root) on-chain for audit.

Handling conflicting attestations
- If attestations disagree, compute confidence with reputation-weighted votes. If confidence < T, open dispute or request more validators.

---

## Aggregation & Synchronization

Aggregation role
- Merge verified items into the Global Brain and publish manifests referencing included proposals and their weights/metadata.

Merging rules
- For factual entries: inclusion adds or updates a structured fact with provenance and confidence.
- For model deltas/adapters: use confidence-weighted merging (see Confidence Scoring) and clipping to prevent large, destabilizing updates.

Synchronization pattern
- Epochic sync: nodes periodically (configurable epoch) fetch new Global Brain manifests and apply updates to local index/store.
- Real-time or near-real-time sync: events may be pushed via pub/sub indexers for low-latency systems.

Conflict resolution
- Use versioned entries with immutable history. Later proposals can supersede or deprecate previous entries; governance/consensus must approve removals.

Local personalization layering
- Nodes keep local adapters and combine them at inference time with the Global Brain's knowledge (e.g., precedence rules: local facts override global when marked private-sensitive).

---

## Governance

Scope
- Dataset inclusion/exclusion, benchmark definitions, thresholds (e.g., inclusion confidence T), reward pool parameters, slashing rules, and major protocol changes.

Mechanisms
- Proposals: on-chain proposals with deposit and description
- Voting: token-weighted voting for economic parameters; reputation-weighted overlays for technical decisions
- Committees: reputation-elected committees for expedited or emergency decisions

Dispute process
1. Any actor can open a dispute with evidence and bond a stake
2. A review committee (reputation-weighted) examines evidence and issues a ruling
3. Ruling outcomes: uphold inclusion, reverse inclusion/removal, apply slashing, or request audit

Transparency & records
- All proposals, votes, and rulings are logged and accessible via the audit explorer

---

## Incentive Model (Tokenomics + Reputation)

Principles
- Reward validators for honest work and aligning with final consensus
- Reward proposers when their proposals are accepted and produce measurable utility
- Penalize malicious actors and reward auditors who find provable issues
- Combine tokens (transferable) and reputation (non-transferable) to balance short-term incentives and long-term trust

Reward components
- Base participation reward R_base per validator vote
- Consensus alignment bonus R_align if validator vote matches final consensus
- Proposer reward R_prop proportional to final consensus confidence C and measured utility gain
- Auditor bounties for valid dispute findings

Simplified token distribution pseudocode
```
# epoch pool R_epoch
for each accepted proposal p:
  proposer_reward = R_epoch * alpha * (utility_p) * C_p
  validator_base = R_epoch * beta / total_validations
  for each validator v who voted:
    validator_reward[v] = validator_base + (if v.vote==final_verdict then bonus_align else 0)
```
- utility_p: measured improvement (bench score or user-signal)
- C_p: final consensus confidence (0..1)
- alpha, beta are governance-set parameters

Reputation
- Reputation increases for accepted proposals and correct attestations, decays slowly, and is reduced for proven bad behavior.
- Reputation influences validator selection probability and attestation weight.

Penalties & slashing
- Stake-backed slashing for provably malicious behavior (e.g., forging attestations, submitting harmful entries).
- Reputation penalties for repeated poor performance.

Dynamic scaling of rewards
- Scale the epoch pool and validator bonuses with network size (e.g., proportional to log(total_active_nodes) or adjusted by on-chain governance for sustainability).

---

## Confidence Scoring

Goal
- Produce a consensus confidence C for each proposal that reflects the network's belief in its correctness.

Inputs
- Attestations: each validator submits verdict and observed metrics
- Validator reputation r_v
- Proposal metadata: proposer-reported confidence c_p, proposer history
- Calibration data: historical mapping of reported confidence to observed accuracy

Computation (example)
1. Each validator v provides verdict v.vote ∈ {accept=1, reject=0} and observed_metric u_v
2. Compute weighted votes: w_v = f(r_v) where f(r) = 1 + gamma * log(1 + r)
3. Raw_confidence = sum_v (w_v * v.vote) / sum_v w_v
4. Calibration_factor = sigmoid(k * (mean_u - expected_u_given_c_p))  // optional
5. Final confidence C = clamp( Raw_confidence * (1 + lambda * Calibration_factor), 0, 1 )

Threshold enforcement
- Inclusion threshold T (default 0.9). If C >= T and no valid disputes, include. If C < T, reject or escalate.

Confidence for removals and modifications
- Similar voting process for deprecation; require higher quorum for removal (e.g., T_removal = 0.95) to protect against censorship.

Confidence visibility
- Expose both raw votes, weighted votes, and final C on-chain and in the indexer for auditors.

---

## Auditability & Traceability

What is logged on-chain
- Submission pointers (proposal_id, artifact_cid, meta_hash)
- Validator votes/attestations (or merkle-root of batched attestations)
- Inclusion manifests (entry_id, included_proposals, weights)
- Reward distributions and slashing events
- Disputes and rulings

Off-chain artifacts
- Artifact bundles (IPFS) containing deltas, evaluation scripts, deterministic seeds, env images, and optional ZK-proofs

Reproducing a verification (auditor steps)
1. Fetch on-chain submission event for proposal_id to get artifact_cid, env_cid, and metadata
2. ipfs.fetch(artifact_cid); verify node signature
3. Fetch env_cid and run container/image or deterministic runtime specified
4. Re-run evaluation with recorded seeds and compare metrics
5. Fetch validator attestations from chain and compare their reported metrics
6. Recompute consensus confidence using recorded reputations and attestations
7. Cross-check reward amounts on-chain and the published reward calculation manifest

Audit tooling recommendations
- Provide an auditor CLI that automates the above steps and verifies on-chain vs off-chain records.
- Archive container images and deterministic runtime manifests to ensure reproducibility over time.

---

## Workflow Narrative — Example: Proposing, Validating, Accepting, and Auditing a Fact

Actors
- Node Alice (proposer)
- Validators V1, V2, V3 (dynamic selection)
- Aggregator service & Indexer
- Governance / Dispute committee

Explicit reversible steps
1. Local discovery & packaging (Alice)
   - Alice detects an actionable fact f from local signals and builds a structured fact file `fact.json`.
   - She packages `fact.json` with `meta.json` and `env_manifest.json` into an artifact and pins to IPFS -> `artifact_cid`.
   - She signs the artifact and calls `submitProposal(artifact_cid, meta_hash, stake)` on-chain.
   - Reversible: Alice can unpin the IPFS artifact (but on-chain submission remains a record). If she retracts before inclusion, she may submit a withdrawal request (governed).

2. Validator assignment & reproduction
   - Blockchain event assigns validators V1..VN. Each validator fetches `artifact_cid` and `env_cid`.
   - Validators reproduce the environment and run deterministic checks and the provided benchmark/tests.
   - Each validator posts a signed vote: accept/reject + observed_metrics.
   - Reversible: votes are final on-chain; however, disputes can be raised if evidence shows a validator misbehaved.

3. Consensus computation & inclusion
   - Aggregator computes reputation-weighted confidence C.
   - If C ≥ T (e.g., 0.9), aggregator publishes inclusion manifest and the Global Brain inserts `entry_id` referencing the artifact and records provenance.
   - Reversible: later deprecation/removal proposals can be submitted and voted on; removal requires higher threshold.

4. Reward distribution
   - Based on C and measured utility, smart contracts distribute tokens to Alice (proposer) and validators (participation + alignment bonuses). Reputation updates applied.
   - Reversible: governance can reverse misallocated rewards if provable fraud is found; this requires on-chain dispute and ruling.

5. Auditing
   - An auditor fetches on-chain submission event -> artifact_cid -> env_cid -> re-runs verification. Auditor compares results to on-chain attestations and reward computations.
   - If mismatch, auditor opens a dispute with evidence; the dispute process runs per governance rules.

Pseudocode (compact)
```
# Alice
artifact_cid = ipfs.add({fact.json, meta.json, env_manifest.json})
chain.submitProposal(artifact_cid, meta_hash, stake)

# Validator v
on chain.event('proposal_submitted'):
  artifact = ipfs.fetch(artifact_cid)
  env = ipfs.fetch(env_cid)
  ok, metrics = deterministic_verify(artifact, env)
  chain.postVote(proposal_id, ok, hash(metrics), signature)

# Aggregator
votes = chain.collectVotes(proposal_id)
C = compute_confidence(votes)
if C >= T:
  manifest = publish_inclusion_manifest(proposal_id, C, votes)
  chain.finalizeProposal(proposal_id, manifest_cid)
  distribute_rewards(proposal_id)
else:
  reject_or_escalate(proposal_id)
```

---

## Data Schemas (copy-pasteable JSON)

Submission / Proposal schema (trimmed)
```
{
  "$id": "https://neuroswarm.org/schemas/proposal.json",
  "type": "object",
  "properties": {
    "proposal_id": {"type":"string"},
    "node_id": {"type":"string"},
    "proposal_type": {"type":"string"},
    "artifact_cid": {"type":"string"},
    "env_cid": {"type":"string"},
    "confidence_reported": {"type":"number","minimum":0,"maximum":1},
    "claimed_metrics": {"type":"object"},
    "signature": {"type":"string"}
  },
  "required": ["proposal_id","node_id","artifact_cid","signature"]
}
```

Attestation schema (trimmed)
```
{
  "$id": "https://neuroswarm.org/schemas/attestation.json",
  "type": "object",
  "properties": {
    "validator_id": {"type":"string"},
    "proposal_id": {"type":"string"},
    "verdict": {"type":"string"},
    "observed_metrics_hash": {"type":"string"},
    "proof_cid": {"type":"string"},
    "signature": {"type":"string"}
  },
  "required": ["validator_id","proposal_id","verdict","signature"]
}
```

Entry manifest schema (trimmed)
```
{
  "entry_id": "Qm...",
  "type": "fact|adapter|dataset-ref",
  "versions": [{"proposal_id":"...","artifact_cid":"...","onchain_tx":"0x...","confidence":0.93}],
  "status": "active",
  "provenance": ["did:..."],
}
```

---

## Security Considerations & Edge Cases

Model poisoning and malicious proposals
- Multi-validator redundancy & reputation-weighted consensus reduce poison risk.
- Limit magnitude of changes (clipping) per epoch; require higher thresholds for sensitive domains.

Sybil & stake attacks
- Require staking and reputation building to participate as validators; use stake + reputation + randomness for validator selection.
- Apply slashing for proven misconduct.

Privacy
- Raw user data stays local unless explicitly shared; proposals contain only processed results or deltas.
- Differential privacy and ZK mechanisms can be used where needed.

Reorgs & chain finality
- For public chains, implement finality wait (e.g., wait for N confirmations) before starting verification.
- Consider permissioned or L2 with fast finality for production to reduce latency.

Denial of service / spam
- Minimum stake and small submission fees; reputation friction for high-frequency submissions.

Data availability
- Ensure artifact pinning policies for IPFS artifacts so auditors can fetch artifacts long-term (pinning services or a network of indexers).

---

## Appendix: Implementation Checklist & Suggestions

Short-term (MVP)
- Implement proposal submission and on-chain metadata contract (submitProposal + postVote + finalizeProposal)
- Spin up an indexer to record events into an off-chain DB for UI and audit
- Build a simple validator runner (Python) that can patch facts/deltas and run deterministic micro-benchmarks
- Implement a basic aggregator that computes confidence and finalizes proposals
- Reward distribution and reputation updates in smart contracts

Medium-term
- Add ZK primitives for selective proof tasks and privacy-preserving validations
- Implement adapter merging for model updates and a Global Brain store with efficient query APIs
- Add richer governance (proposal snapshots, committees, dispute flows)

Long-term
- Cross-chain registries, decentralized dataset marketplaces, integration with decentralized GPU networks, and TEE attestation

---

If you want, I can now:
- Add `docs/getting-started.md` to demonstrate running a toy node and submitting a test fact,
- Scaffold a small Python validator runner and a toy proposal artifact with a reproducible env (container manifest), or
- Draft minimal Solidity contract interfaces (ABIs) for submission, voting, finalization, and reward distribution.

Which should I do next? Also tell me whether to add a link to this new document in `docs/README.md` (I can update it).