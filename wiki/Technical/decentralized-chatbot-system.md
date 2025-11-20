# Decentralized Chatbot System — Design Document

Version: 0.1
Date: 2025-11-11
Authors: (open-source contributions welcome)

## Purpose

This document describes a modular, auditable design for a decentralized network of chatbots where each node:
- Operates independently and learns locally,
- Submits verifiable contributions to a global model,
- Is rewarded for useful, verifiable work,
- Participates in governance for dataset/model inclusion and dispute resolution.

This is a living design intended as a foundation for implementation and collaboration.

---

## Table of contents

- System Overview
- Layered Architecture (text diagram)
- Node Operation (local learning)
- Synchronization (blockchain ordering & oracles)
- Incentive Mechanism (token + reputation)
- Verification Methods (redundant compute, ZK proofs, benchmarks)
- Aggregation & Personalization
- Governance & Dispute Resolution
- Auditability & Transparency
- Workflow Example (step-by-step with pseudocode)
- Data & Message Schemas
- Security, Edge Cases, and Future Work

---

## System Overview

At a high level, the system is a permissioned-or-permissionless network of chatbot compute nodes that perform local learning and optionally inference. Nodes propose model updates (deltas) off-chain and anchor metadata and ordering on-chain. An oracle/validator layer verifies update integrity and quality. Verified updates are aggregated into a global model (or optional model registry), while personalization is preserved via adapters or client-specific parameters. An incentive layer mints and distributes tokens and reputation to nodes that pass verification.

Goals:
- Decentralized learning with verifiable contributions.
- Incentives aligned to quality improvements and honest behavior.
- Auditability for every update and reward.
- Privacy-preserving options (DP, local-only data, ZK proofs where possible).

Non-goals (for initial release):
- Full zero-knowledge training (computationally expensive) — initially we will support ZK for small verification sub-problems and deterministic benchmark evaluations.

---

## Layered Architecture (text diagram)

Compute Nodes (chatbots)  →  P2P Storage (IPFS/CAS)  →  Blockchain (ordering & metadata)  →  Oracle Verification Layer  →  Aggregation Service / Model Registry  →  Governance Contracts / UI  →  User-facing APIs

Legend:
- Compute Nodes: independent chatbots running local models and data pipelines.
- P2P Storage: stores artifacts (model deltas, logs, benchmarks) with content-addressed CIDs.
- Blockchain: stores pointers, metadata, ordering, staking, and on-chain attestations.
- Oracle Layer: validators that download artifacts, run verification, and post attestations on-chain (or via special oracle messages).
- Aggregator: collects verified deltas and performs secure aggregation, then publishes new global model version.
- Governance: smart contracts + off-chain UI for proposals, voting, disputes.
- APIs: read-only model registry, token balances, audit trails, and endpoints for users/developers.

---

## 1) Node Operation — independent chatbot with local learning

Contract (short):
- Input: local data (user interactions, logs), optional shared seed models.
- Output: model delta artifact, training metadata, a short deterministic evaluation on challenge tasks, cryptographic signature, and optional proofs (ZK or attestation).

Components of a node:
- Local model (base checkpoint + adapters)
- Training pipeline (scripts for local updates)
- Local validation set (private held-out or public small bench)
- Artifact packager: produces a content-addressed bundle (CID) including delta, metadata, and signatures
- Wallet/identity: cryptographic keypair for signing submissions

Local learning strategies:
- On-device fine-tuning of adapter layers (LoRA / PEFT) — small, mergeable deltas.
- Preference learning from interactions via RLHF-style offline updates.
- Periodic distillation to smaller checkpoints.

Privacy & safety features (configurable per node):
- Differential privacy (noise and clipping) to gradients before packaging deltas.
- Data minimization — keep raw data locally; submit only deltas and summary metrics.

Model representation & deltas:
- Use adapter or delta models (parameter diffs) rather than full checkpoints; store as sparse updates or LoRA-like low-rank factors.
- Each delta includes: base_model_version, affected-parameters list, delta-blob (CID), delta-size, training-seed, epochs, hyperparameters, and validation metrics.

Node submission example (fields):
- node_id: DID or pubkey
- base_model_version: v1.2
- delta_cid: Qm...
- delta_type: "adapter" | "sparse" | "full"
- local_metrics: {loss: x, accuracy: y, utility_score: z}
- confidence: 0.0..1.0 (node-provided)
- proof: optional ZK or signature
- timestamp, signature

---

## 2) Synchronization — ordering updates with blockchain & oracles

Design decisions:
- Use blockchain only for metadata, ordering, and incentives; avoid storing large artifacts on-chain.
- Use content-addressed storage (IPFS) for deltas and artifacts; store the CID on-chain.
- Use a commit-and-reveal or epoch-based batching model to reduce on-chain load.

Ordering model (epoch-based):
- Epoch T opens (on-chain) — nodes may submit delta CIDs off-chain (P2P) and post a submission transaction with CID + stake + metadata.
- A short submission period ends; ordering is the on-chain transaction order for that epoch.
- Validators (oracle nodes) observe submissions and schedule verification tasks.

Oracles & verification:
- Oracles (validator nodes) pull the CID, fetch artifact, run deterministic verification and benchmarks, and post attestations on-chain (signed verdicts). Multiple oracle attestations for redundancy.
- Oracle selection: randomized by stake/reputation or a committee rotating per epoch to avoid centralization.

Dealing with latency and reorgs:
- For public blockchains, use finality threshold (e.g., 6 blocks) before starting verification for a submission.
- Alternatively use a proof-of-authority or consortium chain for faster finality in early stages.

Cost control:
- Batch many CIDs into a single on-chain transaction with a merkle root of submissions to amortize gas.

---

## 3) Incentive Mechanism (tokenomics + reputation)

Hybrid model: tokens + reputation

Why hybrid?
- Tokens enable tangible, transferable rewards.
- Reputation captures long-term trustworthiness and affects selection as verifiers or committee members.

Key behaviors to incentivize:
- Submitting high-utility updates.
- Participating in verification honestly.
- Timely responses and availability.
- Reporting bad actors.

Token model (simple baseline):
- Each epoch has a reward pool R(epoch) (can be inflationary or fee-sourced).
- Verified updates receive a share proportional to utility_score * stake_multiplier.
- Validators receive verification reward for correct attestations.
- Slashing: nodes that submit provably harmful updates or that are shown to have manipulated local metrics lose staked tokens.

Reputation model:
- Reputation is an on-chain score increased for accepted contributions and accurate verifications; decayed slowly over time.
- Reputation influences:
  - Validator selection probability (higher rep → more likely to be chosen)
  - Reward multipliers (small bonus)
  - Voting weight in governance

Anti-sybil measures:
- Require a minimum stake to participate; use identity linking or KYC for some roles if desired.
- Use reputation growth limits to slow sybil accumulation.

Reward distribution pseudocode (simplified):

```
# input: pool R, list of accepted_updates U
# each update u has utility_score u.s and stake s
total_weight = sum(u.s * f(u.stake)) over accepted updates
for u in accepted_updates:
  reward[u.node] = R * (u.s * f(u.stake)) / total_weight
```

Where f(stake) is a saturating function (e.g., log(1+stake)) to prevent whales dominating.

---

## 4) Verification Process

Goals: ensure correctness, quality, and detect malicious updates.

Methods (tiered):
1. Deterministic checks (automated):
   - Verify signature and CID integrity.
   - Check base_model_version compatibility.
   - Verify delta format, size limits, and presence of required metadata.
2. Reproducible eval on challenge tasks (benchmarks):
   - Validators run the delta patched onto base model and evaluate on a small deterministic public benchmark.
   - Use deterministic seeds to ensure reproducibility.
   - Multiple validators run the same bench; compare results.
3. Redundant computation and consensus:
   - Each submission is assigned to N validators (N≥3).
   - Each validator posts attestation: PASS/FAIL + metrics.
   - Majority rule (or weighted by reputation) determines acceptance.
4. Zero-knowledge proofs (ZK):
   - For small, verifiable properties (e.g., gradient clipping, that DP noise was added correctly, or that a specific training step was run), nodes may supply ZK proofs.
   - Validators verify ZK proofs quickly rather than re-run expensive computations.
   - ZK is optional but used where it is practical (e.g., proving use of a certain RNG seed, or that operator didn't leak specific data fields).
5. Benchmarks & held-out utility estimation:
   - Use small standardized benchmarks (public) and private challenge tasks maintained by governance.
   - Utility score is computed from benchmark improvements and calibration tests.
6. Spot checks & audits:
   - Randomly sample accepted updates for deeper offline audits, possibly with reward bonuses for auditors who detect issues.

Attestation & on-chain verdict:
- Each validator posts an attestation (signed) that includes metrics and PASS/FAIL.
- A simple scoring rule aggregates attestations: if weighted majority PASS, the update is accepted and reward flows are scheduled.

Dispute resolution for conflicts:
- If attestations disagree, an on-chain dispute can be raised. A dispute triggers an expanded verification committee or slashing if provably malicious.

---

## 5) Aggregation of updates into a global model while preserving personalization

Challenges:
- Personalization must not be drowned by global aggregation.
- Heterogeneous nodes: different data distributions and objectives.

Design patterns:
1. Base + Adapters (recommended):
   - Keep a single global base model and let nodes produce adapter deltas (LoRA, prefix, or small modules).
   - Aggregate adapters across nodes to form a shared adapter pool.
   - Clients maintain local personalization by combining global base + selected adapters.
2. Federated Averaging with clustering:
   - Cluster nodes by data similarity (measured by update vector similarity or metadata).
   - Average within clusters and maintain cluster-specific models.
3. Meta-learning / MAML-style aggregation:
   - Learn a global initialization that is fast to adapt locally.
   - Aggregation updates the initialization while preserving local fine-tuning paths.

Aggregation algorithm (adapter-focused) — high level:
- Collect accepted adapter deltas D = {d1..dm} along with metadata and utility scores.
- Compute adapter-weight w_i = utility_score * reliability_factor
- Merge adapters by weighted average in adapter parameter space or select a subset using thresholding
- Publish new model_version++ with aggregated adapter set

Preserving personalization:
- Encourage nodes to store and reuse local adapters.
- The global aggregation should prefer small, generally-useful changes; nodes keep private adapters for specialized behavior.

Conflict minimization:
- Use per-parameter learning rates and clipping when aggregating to avoid catastrophic interference.

---

## 6) Governance

Areas governed:
- Which public benchmarks / challenge tasks are used.
- Inclusion or removal of datasets from public-ledgers.
- Model versioning policy and major hyperparameter changes.
- Dispute resolution and slashing rules.

Governance primitives:
- On-chain proposals: any staked account can submit a proposal with deposit.
- Voting: token-weighted or reputation-weighted voting windows.
- Committees: for time-sensitive or high-stakes decisions, elect a committee (reputation-weighted vote) that executes decisions.
- Emergency pause: a small multi-sig or DAO committee can temporarily pause aggregation in case of incident.

Checks & balances:
- Reputation has negative consequences for malicious or negligent behavior (slashing, vote reduction).
- Transparent proposal publication with reasons and expected impact.

Dispute resolution flow (brief):
1. Raise dispute by staking a bond and providing evidence.
2. An adjudication committee (randomized, reputation-weighted) reviews evidence.
3. Committee issues ruling: uphold, overturn, or call for deeper audit.
4. If the dispute is frivolous, bond is lost; if meritorious, bond is returned and slashing or reversal occurs.

---

## 7) Auditability & Transparency

Principles:
- Every accepted update, verification attestation, and reward payment is referenced on-chain with content-addressed pointers.
- Raw data never needs to be on-chain; artifacts are CIDs with signatures and proofs.

What is auditable:
- Submission transaction with CID, node signature, and metadata.
- Validator attestations with metrics and signatures.
- Aggregation actions with list of included CIDs and weights.
- Reward distribution events.

How to inspect a model evolution:
- On-chain: query model registry contract to get model version history with CID for each aggregated delta set.
- Off-chain: fetch artifact from IPFS using CID and replay deterministic verification steps (benchmarks) using recorded seeds and code.

Example audit script (conceptual):
- Input: model_version V
- Fetch V's aggregation record -> list of delta CIDs + weights
- For each delta CID: fetch artifact, verify signatures, re-run recorded benchmark with the provided seed and deterministic runtime environment (container image CID)
- Compare benchmark outputs to on-chain attestations
- Recompute reward split and compare to payments on-chain

---

## Workflow Example (step-by-step, explicit reversible steps)

This example shows a node performing local learning, submitting an update, verification, aggregation, and reward distribution.

Actors:
- Node A (submitter)
- Validators V1, V2, V3
- Aggregator service
- Governance contract / token contract

Epoch: E

1) Local training & packaging (node)
   - Train adapter delta on local data using base model v1.2
   - Evaluate on local validation set and public challenge set (deterministic seed S)
   - Produce artifact bundle: {delta.bin, train_meta.json, eval.json, code_env_cid}
   - Store bundle in IPFS -> delta_cid
   - Sign message M = Hash(delta_cid || base_model || epoch || node_id)

   Reversible steps: keep local checkpoint and original training logs; remove delta by unpinning if needed.

2) Submit (on-chain pointer)
   - Node posts transaction: submit(delta_cid, base_model, reported_metrics, signature, stake_amount)
   - Transaction included in block; ordering defines the submission order.

3) Validators assigned (oracle layer)
   - Chain emits event; validators pick up submission and fetch delta_cid.
   - Validators run deterministic checks and evaluation: they patch delta onto base model, run benchmark with seed S, and compute metrics.

4) Attestations posted
   - Each validator signs its attestation A = {delta_cid, metrics, PASS/FAIL, timestamp}
   - Validators post attestations either on-chain or to an aggregator oracle endpoint (with signed receipts anchored on-chain)

5) Acceptance determination
   - Smart contract aggregates attestations. If acceptance threshold met (e.g., weighted majority PASS) then status = ACCEPTED.
   - Accepted update is added to list for aggregation for epoch E.

6) Aggregation
   - Aggregator collects accepted updates for epoch E.
   - Computes utility-weighted merging to produce aggregated adapters or updates the global initialization via meta-update.
   - Publishes new model_version v1.3 with manifest = {list of delta_cids, weights, aggregation_code_cid}
   - Manifest is stored in IPFS; CID anchored on-chain.

7) Reward distribution
   - Based on utility scores and stake multipliers, distribute token rewards from the epoch pool.
   - Validators get verification rewards.
   - Reputation scores adjusted on-chain.

8) Post-conditions & audit record
   - All events (submission tx, attestations, aggregation manifest, reward txs) are on-chain and refer to IPFS content for replay.

Pseudocode: submission + verification (simplified)

```
# Node A
artifact = package_delta(...)  # produces delta_cid
tx = blockchain.submit_submission(delta_cid, base_model, reported_metrics, stake)
sign(tx, node_priv)

# Validator V
on_event(submission):
  artifact = ipfs.fetch(delta_cid)
  if not deterministic_checks(artifact):
    post_attestation(delta_cid, FAIL)
    return
  metrics = run_benchmark(artifact, seed)
  post_attestation(delta_cid, PASS, metrics)

# Aggregation contract
collect_attestations(epoch)
for each delta where accept_threshold(attestations):
  include in aggregation
new_model = aggregate(included_deltas)
publish_manifest(new_model_cid)

distribute_rewards(included_deltas, pool)
```

---

## Data & Message Schemas (copy-pasteable JSON Schema snippets)

1) Submission schema (trimmed):

```
{ 
  "$id": "https://example.org/schemas/submission.json",
  "type": "object",
  "properties": {
    "node_id": {"type":"string"},
    "base_model_version": {"type":"string"},
    "epoch": {"type":"integer"},
    "delta_cid": {"type":"string"},
    "delta_type": {"type":"string"},
    "reported_metrics": {"type":"object"},
    "confidence": {"type":"number", "minimum":0, "maximum":1},
    "stake": {"type":"number"},
    "signature": {"type":"string"}
  },
  "required": ["node_id","base_model_version","delta_cid","epoch","signature"]
}
```

2) Attestation schema (trimmed):

```
{
  "$id": "https://example.org/schemas/attestation.json",
  "type": "object",
  "properties": {
    "validator_id": {"type":"string"},
    "delta_cid": {"type":"string"},
    "pass": {"type":"boolean"},
    "metrics": {"type":"object"},
    "signature": {"type":"string"}
  },
  "required":["validator_id","delta_cid","pass","signature"]
}
```

3) Aggregation manifest (trimmed):

```
{
  "model_version": "v1.3",
  "epoch": 42,
  "included_deltas": [
    {"delta_cid":"Qm...","weight":0.42,"node_id":"did:..."}
  ],
  "aggregation_code_cid": "Qm...",
  "timestamp": "..."
}
```

---

## Confidence-weighted scoring and calibration

Rationale:
- Nodes provide a self-reported confidence score; validators compute calibrated scores and the system uses both for reward and weighting.

Scoring pipeline:
1. Node reports confidence c_node in [0,1].
2. Validator computes observed utility u_obs using deterministic benchmark.
3. Compute calibration factor: calib = sigmoid(k*(u_obs - E[u_obs|c_node])) where E[...] is expected utility given c_node from historical data.
4. Final utility_score = u_obs * (1 + alpha * calib) where alpha is calibration sensitivity.

Mechanism to learn E[u_obs|c_node]:
- Maintain a running distribution mapping confidence buckets to observed utilities (privacy-preserving, averaged with DP).
- Update mapping as more attestations come in.

Use in rewards: both raw utility and calibration-adjusted multiplier used to compute reward weight.

---

## Governance examples

Example proposal process:
- Create on-chain proposal: includes rationale, expected effects, tests, and migration plan.
- Voting window: 7 days.
- If passed with >Quorum and >Threshold, execute automated migration or schedule manual upgrade.

Committee election:
- Periodic election where top-K reputations are invited; random sample weighted by reputation selects the committee.

Metrics for inclusion/removal of datasets:
- Public audit of dataset licensing
- Privacy review (DP analysis) and community vote
- Test inclusion requires passing a dataset compatibility test suite

---

## Auditability: trace an update from submission to reward

1. Query on-chain submission record for delta_cid.
2. Fetch artifact from IPFS and verify node signature.
3. Fetch validator attestations on-chain and compare metrics.
4. Fetch aggregation manifest and confirm delta included.
5. Trace reward transactions to node's address.

All steps are deterministic and reversible provided the artifact and code_env_cid are available.

---

## Security, Edge Cases, and Operational Notes

Edge cases:
- Split-brain forks of aggregator: resolved by chain-anchored manifest and finality.
- Malicious validators: slashing and reputation loss; economic incentives to be honest.
- Large deltas / noisy updates: size limits and normalization/clipping.

Performance & cost considerations:
- Keep on-chain data minimal; batch operations and merkle roots where possible.
- Prefer adapter-style updates to reduce bandwidth and verification cost.

Privacy considerations:
- Offer DP tooling for nodes that must protect user data.
- Use ZK to hide certain private computations while proving compliance.

Operational roles & runbooks:
- Runner nodes: maintain training infra and may opt-in as validators.
- Indexer: off-chain service that aggregates attestations and serves queries for UIs.
- Auditor: third-party tool to replay and validate model versions.

---

## Appendices

A. Quick-checklist for implementers
- Implement IPFS-backed artifact storage with pinning.
- Implement submission transaction schema in smart contracts.
- Build a validator runner that can deterministically patch and evaluate deltas.
- Implement aggregation service for adapter merging.
- Build token + reputation contracts with reward distribution and slashing.
- Provide CLI tools to replay verification locally for auditors.

B. Future improvements
- Broader ZK support to verify training without revealing datasets.
- Tighter hardware attestation (TEEs) integration.
- Automated model catalog with semantic search for adapters.

---

If you'd like, I can now:
- Add `docs/architecture.md` with a visual ASCII diagram and shorter technical summary,
- Create `docs/getting-started.md` with a minimal developer quickstart (run a node, submit a test delta), or
- Scaffold smart contract interfaces (ABI) and a small reference validator runner in code.

Which should I do next?