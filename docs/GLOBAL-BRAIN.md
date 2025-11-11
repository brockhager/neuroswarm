# Global Brain — NeuroSwarm

Version: 0.1
Date: 2025-11-11

This document describes the Global Brain in NeuroSwarm: the canonical, versioned, auditable knowledge layer that aggregates validated contributions from personal AI agents and exposes collective intelligence for nodes to use.

## What is the Global Brain

- The Global Brain (aka MindHive) is the project’s shared knowledge base: a set of versioned entries (facts, adapters, dataset refs) with provenance, confidence scores, and attestations.
- It is not a single monolithic model; it's a layered system that balances global generalization and local personalization.

## Global Brain Layers

1. NS Nodes (Chatbot Agents)
   - Lightweight personal AI instances running on user devices.
   - Learn locally, create proposals (Swarm Signals), and optionally act as light validators.
   - Keep private memories/adapters local; publish only opt-in artifacts.

2. Aggregation Layer
   - Collects validated updates (accepted Swarm Signals) and merges them into global artifacts.
   - Produces manifests (CID) that list included deltas, weights, and aggregation code.
   - Publishes new Global Brain versions (semantic version and manifest CID) anchored on-chain.

3. Governance Layer (Cortex)
   - Implements staking, committee selection, voting, confidence scoring, and dispute resolution.
   - Holds policy: inclusion thresholds, slashing rules, and upgrade policies.
   - Operates via smart contracts and on-chain events.

4. Reward Layer
   - Implements Proof-of-Useful-Work (PoUW): rewards proposers, validators, and auditors for verifiable contributions.
   - Handles distribution logic, reputation updates, and penalties/slashing.

## Layer interactions

- NS Node proposes a Swarm Signal (artifact CID) to the network and posts a submit pointer on-chain.
- Governance selects a validator committee and assigns verification tasks.
- Validator nodes fetch the artifact (via IPFS), run deterministic checks & benchmarks, and post attestations.
- Aggregation layer collects accepted deltas, computes weights (confidence-weighted), merges adapters or updates, and publishes a manifest CID.
- Governance finalizes the inclusion (on-chain record) and Reward Layer distributes NST + reputation adjustments.
- NS Nodes periodically sync manifests to incorporate new Global Brain versions; local personalization layers remain layered above global artifacts.

## Workflow example (compact)

1. NS Node A packages a delta and pins artifact -> `QmDelta`
2. Node A calls `submitProposal(QmDelta, meta)` on-chain
3. Validators V1..VN fetch `QmDelta`, run benchmarks, then `postVote(proposalId, verdict, metricsHash)`
4. Aggregator computes confidence C; if C >= T_inclusion, publishes `manifestCID` and chain finalizes
5. Reward contract calculates rewards and updates reputations; payments logged on-chain

## Properties & guarantees

- Auditability: every manifest, attestation, and reward event is anchored or referenced on-chain.
- Modularity: adapters and deltas are mergeable; Global Brain remains extensible.
- Privacy: raw user data remains on-device; artifacts are designed to avoid leaking private data.

---

## See also
- `./TERMS.md`
- `./global-brain-design.md`
- `./VALIDATOR-NODES.md`
- `./IPFS-storage.md`
- `./TOKENOMICS.md`