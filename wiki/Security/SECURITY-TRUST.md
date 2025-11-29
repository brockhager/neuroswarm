# Security & Trust — preserving integrity in NeuroSwarm

## Overview

Security and trust mechanisms ensure the Global Brain and its supporting network remain reliable, auditable, and resistant to manipulation. This layer defines reputation, slashing, attestations, and cryptographic checks that underpin governance and consensus.

## Responsibilities

- Maintain reputation scoring for nodes based on verifiable behavior and on-chain attestations.
- Define and enforce slashing rules for malicious or negligent behavior (double-signing, fabricated proofs, spam floods).
- Support advanced cryptographic proofs (including optional zero-knowledge proofs) to enable privacy-preserving, audit-critical checks without revealing sensitive data.
- Provide tooling and on-chain events for dispute resolution and post-facto audits.

## Relation to Global Brain

- Security & Trust components are foundational to consensus and governance: they provide the economic and cryptographic incentives that keep validators honest and contributors accountable.
- While not part of the core model-aggregation codepath, Security & Trust services integrate closely with validators, indexers, and governance contracts to record behavior and penalties.

## Implementation notes

- Reputation should be computed from auditable signals (on-chain attestations, validated manifests, uptime metrics) and be recoverable via transparent algorithms to avoid opaque, centralized scoring.
- Slashing events must be deterministic and provable; associated evidence should be published (or referenceable by CID) so that the community can audit enforcement actions.
- Zero-knowledge techniques can be used selectively for checks where revealing raw data would compromise privacy or IP (e.g., proving a model update passes a validation test without sharing the model weights).

## See also

- `docs/GLOBAL-BRAIN.md`
- `docs/VALIDATOR-NODES.md`
- `docs/TERMS.md`
