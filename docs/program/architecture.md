# NeuroSwarm — Architecture Outline

Version: 0.1
Date: 2025-11-11

This document is an architectural outline for NeuroSwarm, the decentralized chatbot network. It expands the high-level Table of Contents into concrete responsibilities, diagrams, pseudocode, and actionable design notes suitable for implementation and contribution.

## Contents
1. System Overview
2. Node Design (Chatbot Agents)
3. Blockchain Coordination Layer
4. Verification Layer (Oracles + Proofs)
5. Aggregation Layer
6. Governance Layer
7. Reward Distribution
8. User-Facing APIs
9. Security & Trust
10. Future Extensions

---

## 1. System Overview

Purpose & Vision
- Build a decentralized swarm of chatbots where each node: learns locally, contributes verifiably, and is fairly rewarded.
- Preserve personalization while enabling gradual, auditable global improvements.
- Encourage open participation with clear audit trails and incentives against malicious behavior.

Key Principles
- Openness: artifacts and metadata are open (content-addressed), subject to privacy controls.
- Transparency: every submission, verification, aggregation, and reward is traceable.
- Auditability: deterministic verification replay is possible for auditors.
- Incentives: economic and reputation systems align contributions with network health.

Comparison to Centralized AI
- Centralized: single org controls data, training, model releases; high coordination but single point of failure.
- NeuroSwarm: decentralized ownership, distributed verification, no single global gatekeeper; higher coordination cost traded for resilience and transparency.

Success criteria
- Verifiable increase in utility over time.
- Low incidence of successful poisoning attacks.
- On-chain and off-chain tooling makes audits easy and reproducible.

---

## 2. Node Design (Chatbot Agents)

Responsibilities
- Accept user interactions; optionally store local private logs.
- Perform local training/fine-tuning (adapters / LoRA / small deltas) on-device or on trusted hardware.
- Produce and sign submission artifacts (delta + metadata + evaluation results + optional ZK proofs).
- Optionally act as validator if node opts into verification duties.

Core components
- Model runtime: primary LLM or smaller fine-tuned variant.
- Local memory store: key-value (facts, sequential memory), each item with a confidence score and timestamp.
- Training pipeline: small-adapter training scripts, reproducible seed usage.
- Artifact packager: bundles delta.bin, metadata.json, eval.json, env_cid, signature.
- Wallet/Identity: DID or public key controlled by node operator.

Memory and confidence scoring
- Memory entries: {id, content, source, confidence, created_at, ttl}
- Confidence updated by: heuristic, verification feedback, and global model signals.

Personalization vs Synchronization
- Local personalization: private adapters or local contexts kept on-device.
- Global sync: nodes submit general-purpose adapters intended for aggregation. Private adapters are never submitted.
- Client config guides which adapters to publish (privacy/sensitivity filter).

Security & sandboxing
- Use containerized or TEE-based sandboxes for training and packaging.
- Enforce resource limits and deterministic environments (container image cid) to enable reproducible verification.

Node submission (example JSON)
```
{
  "node_id": "did:example:abc",
  "base_model": "neuroswarm/base:1.2",
  "epoch": 42,
  "delta_cid": "Qm...",
  "delta_type": "adapter",
  "reported_metrics": {"benchA": 0.72, "benchB": 0.84},
  "confidence": 0.85,
  "env_cid": "QmEnv...",
  "signature": "0x..."
}
```

---

## 3. Blockchain Coordination Layer

Role
- Provide immutable ordering of submissions, staking & slashing primitives, and anchoring of manifests. Do not store large artifacts on-chain.

Key features
- Submission transactions store: delta_cid, node_id, epoch, stake_amount, short metadata (hash), and signature.
- Model registry contract: tracks published model versions, aggregation manifests (CID pointing to IPFS manifest), and reward pools.
- Staking & slashing contract: manages stakes for submitters and validators; slashing conditions enforced by governance.

Ordering models
- Epoch-based batching: open/close windows where submissions are accepted; on-chain ordering resolves tie-breakers.
- Commit-reveal (optional): prevent premature metric signaling in adversarial environments.

Gas & cost optimizations
- Store merkle root of a batch of submissions; individual items referenced by merkle proofs off-chain.
- Use sidechains, rollups, or a permissioned consortium chain for early-stage deployments.

Smart contract examples (conceptual fields)
- submit(delta_cid, base_version, metadata_hash, stake)
- post_attestation(delta_cid, validator_id, verdict, metrics_hash)
- publish_aggregation(manifest_cid)
- distribute_rewards(epoch)

---

## 4. Verification Layer (Oracles + Proofs)

Design goals
- Deterministic, reproducible verification of submitted deltas.
- Redundancy to avoid single-point-of-failure verification.
- Optional ZK primitives where they can reduce trust without re-executing expensive training.

Verification pipeline
1. Fetch delta via CID, verify signature and metadata.
2. Reconstruct deterministic environment (env_cid) and patch delta onto base model.
3. Run deterministic benchmarks (challenge tasks) using recorded RNG seeds.
4. Produce attestation: {validator_id, delta_cid, pass_bool, metrics, time, signature}
5. Submit attestation on-chain or to the oracle aggregator (signed). Repeat by N validators.

Redundant computation
- N ≥ 3 validators assigned per submission.
- Attestations aggregated with reputation-weighted voting.
- Disagreements trigger expanded verification committees or audits.

Zero-knowledge proofs (where applicable)
- Use ZK for small, verifiable properties:
  - Proof that gradients were clipped per DP spec.
  - Proof that training steps used a certain deterministic RNG seed.
  - Proofs for correct format transformation or summary stats.
- Full ZK of training is expensive; prioritize ZK for audit-critical checks.

Benchmarks & test datasets
- Public deterministic micro-benchmarks for reproducible verification.
- Governance-maintained challenge datasets for final acceptance.

Reputation scoring for validators and submitters
- +score for accurate attestations that match final consensus
- -score for invalid attestations or attempts to manipulate results
- Use reputation to weight attestations and to select committee members

Attestation schema (example)
```
{
  "validator_id":"did:val:xyz",
  "delta_cid":"Qm...",
  "pass":true,
  "metrics": {"benchA":0.72},
  "signature":"0x..."
}
```

---

## 5. Aggregation Layer

Objectives
- Merge accepted updates into global artifacts while preserving personalization.
- Provide versioning, rollback, and smooth model transitions.

Aggregation strategies
1. Adapter/LoRA merging (preferred)
   - Merge small adapters into a shared adapter pool; publication is a pointer to these adapters and weights.
   - Weighted average of adapter parameters using utility-based weights.
2. Federated averaging & clustering
   - Cluster submitters by update similarity; average within clusters.
   - Keep cluster-specific models for domain-specific users.
3. Meta-learning (MAML-style)
   - Update global initialization to speed local adaptation.

Confidence-weighted merging (formula)
- Each accepted delta d_i has:
  - observed utility u_i (validator-averaged),
  - submitter confidence c_i,
  - reliability r_i (function of reputation and validator agreement).

Weight w_i = normalize( (u_i * (1 + beta * calibration(c_i))) * g(r_i) )
- calibration(c_i) is calibration factor learned from historical mapping of reported confidence to observed utility.
- g(r_i) is reputation multiplier (e.g., 1 + gamma * log(1 + rep)).

Aggregation pseudocode
```
# inputs: accepted_deltas = [d1..dm]
for d in accepted_deltas:
  u = d.observed_utility
  c = d.reported_confidence
  r = reputation(d.node)
  calib = lookup_calibration(c)
  raw_weight[d] = u * (1 + beta * calib) * (1 + gamma * log(1 + r))
weights = normalize(raw_weight)
aggregated_adapter = weighted_average([d.adapter for d in accepted_deltas], weights)
publish_adapter(aggregated_adapter)
```

Checkpointing & version control
- Each aggregation produces a manifest with included delta CIDs, weights, aggregator code CID, and a semantic changelog.
- Manifest CID published on-chain via model registry.
- Support rollback: keep old manifests and implement migration scripts.

Preserving personalization
- Keep global model small enough to generalize; preserve user adapters locally.
- Offer selective pull of adapters per client profile.

---

## 6. Governance Layer

What governance covers
- Approval of public benchmarks and dataset inclusion.
- Parameters for reward pools, slashing rules, and aggregation policies.
- Electing committees for time-sensitive actions.

Voting mechanisms
- Token-weighted voting for economic stakeholders.
- Reputation-weighted overlays for technical decisions (reputational experts influence but do not fully control).
- Quorum + threshold rules to avoid low-turnout capture.

Proposal lifecycle
1. Submission: proposal with deposit + metadata
2. Discussion: off-chain forum + proposal page
3. Voting window: on-chain vote, time-boxed
4. Execution: automated for parameter changes; multi-sig/manual for protocol upgrades

Dispute resolution
- Anybody can open a dispute with evidence; stake a bond. Committee reviews and rules.
- Appeals escalate to bigger committees or referenda.

Model/versioning policies
- Semantic versioning for model registry (major.minor.patch)
- Breaking changes require higher governance thresholds and migration plans.

---

## 7. Reward Distribution

Proof-of-Useful-Work (PoUW)
- Reward submissions that demonstrably improve utility on verified benchmarks and real user-signal metrics.

Reward components
- Epoch reward pool R_epoch (inflationary, fees, or grant-sourced)
- Submission share based on utility_score, stake, and reliability
- Validator rewards for correct attestations and penalties for false attestations
- Reputation adjustments complement token rewards

Quality & penalties
- Use a sliding scale: small improvements get small rewards; large, robust improvements get larger shares.
- Penalty: slashing for provably malicious updates, repeated false attestations, or attempted replay attacks.

Transparency
- All distributions logged on-chain with references to included CIDs and computation of shares.

Reward pseudocode
```
# R = epoch pool
W = sum_i (u_i * f(stake_i) * reliability_i)
for each accepted submission i:
  reward[i] = R * (u_i * f(stake_i) * reliability_i) / W
```
- f(stake) is saturating (e.g., log) to prevent stake oligopolies.

---

## 8. User-Facing APIs

Chat interfaces
- Hosted endpoints or node-local APIs to query a node's chatbot.
- Options to query global, cluster, or local personalized model.

Fact-check dashboards
- For a given response, expose:
  - provenance: which adapters/versions influenced the response
  - confidence scores for facts asserted
  - links to audit trails for model versions used

Audit trail explorer
- Query model registry for version history, included deltas, attestations, and reward payments.

Developer APIs
- Submit test deltas (sandbox) and fetch test attestations.
- Query reputation, stake, and submission history.

API design note
- Keep read-only, heavy queries off-chain (indexer service) with pointer to on-chain events for canonical truth.

---

## 9. Security & Trust

Model poisoning prevention
- Multi-validator consensus before acceptance.
- Reputation and stake-backed slashing.
- Limit magnitude of parameter changes per epoch (clipping).

Rate limiting & spam
- Minimum stake per submission; gas/fees; reputation friction for high-frequency submitters.

Privacy-preserving learning
- Strong encouragement for local-only private adapters.
- DP mechanisms for any aggregated metrics published.
- Optional secure enclaves (TEEs) or ZK proofs to protect secrets while proving compliance.

Human-verifiable audit logs
- Provide an auditor CLI that fetches artifacts and replays verification using container images referenced by env_cid.

Operational security
- Monitor validator behavior and implement automatic temporary suspensions for misbehaving validators pending governance review.

---

## 10. Future Extensions

Cross-chain interoperability
- Cross-chain registries to allow model artifacts and rewards to span multiple ecosystems.

Decentralized dataset marketplaces
- Curated dataset listings with licensing and privacy metadata; dataset inclusion governed by votes.

Integration with decentralized GPU networks
- Use rented GPU work for large verifications or heavy aggregation steps; payments handled via smart contracts.

Self-correcting governance
- Automated feedback loops where on-chain metrics (model drift, user-satisfaction) can trigger parameter proposals or emergency measures.

---

## Appendix: Example workflows & pseudocode snippets

A. Submit -> Verify -> Aggregate (compact pseudocode)
```
# Node submits
delta_cid = ipfs.add(bundle)
tx = chain.submit(delta_cid, base_version, meta_hash, stake)

# Validators react
on chain.event('submission'):
  assign_validators(submission)
  for v in validators:
    artifact = ipfs.fetch(submission.delta_cid)
    ok, metrics = deterministic_verify(artifact, submission.base_version)
    v.attest = sign({delta_cid, ok, metrics})
    post_attestation(v.attest)

# Aggregator / chain collects attestations
accepted = collect_accepted_submissions(epoch)
aggregated_adapter = aggregate(accepted)
manifest_cid = ipfs.add({included:accepted, weights, agg_code})
chain.publish_aggregation(manifest_cid)
chain.distribute_rewards(epoch)
```

B. Confidence calibration mapping (sketch)
```
# Keep calibration table as histogram per confidence bucket
# Update with DP or smooth decay
update_calibration(conf_bucket, observed_utility):
  hist[conf_bucket].append(observed_utility)
  expected[conf_bucket] = running_mean(hist[conf_bucket])

calib_factor(c_node, u_obs) = sigmoid(k*(u_obs - expected[bucket(c_node)]))
```

C. Reproducible verification checklist for auditors
1. Fetch submission tx -> delta_cid, meta
2. ipfs.fetch(delta_cid) and verify signature
3. Pull env_cid and run provided container (recorded to deterministic runtime) or use provided docker image digest
4. Run benchmark with seed S and compare metrics
5. Check validator attestations on-chain
6. Recompute reward split and compare

---

## Next steps (suggested actionable items)
- Implement an indexer that converts on-chain events into an easily-queryable DB for dashboards.
- Prototype a validator runner (Python/Node) that can deterministically patch models and run micro-benchmarks.
- Define container images and test benchmarks for reproducibility.
- Draft minimal smart-contract ABIs for submission, attestation, aggregation, and reward distribution.

If you'd like, I can now:
- Convert key pseudocode into a small Python validator runner scaffold (deterministic patch + benchmark), or
- Draft minimal Solidity contract interfaces for the coordination layer, or
- Create `docs/getting-started.md` with a developer quickstart that demonstrates running a toy node and submitting a test delta.

Which should I do next?