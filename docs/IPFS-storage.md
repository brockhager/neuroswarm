# IPFS Storage — External Storage Nodes

Version: 0.1
Date: 2025-11-11

This page describes the role of IPFS-style decentralized storage for NeuroSwarm: where artifacts, manifests, and audit logs live off-chain and how the blockchain references them.

## Role

- Stores artifact bundles (Swarm Signals), aggregation manifests, env images, benchmark logs, and audit manifests.
- Provides content-addressed identifiers (CIDs) used as canonical pointers in on-chain events.

## How IPFS hashes are referenced on-chain

- Submissions and finalization events include artifact CIDs or merkle roots of batched attestations.
- Smart contracts store small metadata (CID, meta-hash) while large blobs remain off-chain.
- Auditors reconstruct the verification by fetching CIDs and running deterministic scripts recorded in env manifests.

## Persistence challenges & pinning strategies

Challenges
- Data availability: IPFS is decentralized, but nodes may garbage-collect unpinned content.
- Long-term archival: ensuring manifests and artifacts remain retrievable years later.

Pinning & persistence strategies
- Incentivized pinning: use a network of indexers/pinning nodes that ensure important CIDs are pinned (rewarded from protocol funds).
- Multiple pinning providers: encourage redundancy across different hosts or pinning services.
- Archival snapshots: periodically snapshot important manifests and store them in archival services or secondary storage (long-term retention).
- Garbage-collection policies: mark certain artifacts as ephemeral (test artifacts) vs. canonical (inclusion manifests) to manage costs.

## Best practices for artifacts

- Keep artifacts small (adapters, diffs) rather than full checkpoints.
- Include deterministic env manifests (container digest, runtime deps) so auditors can reproduce verification.
- Add expiry/ttl metadata for non-critical artifacts and explicit pinning for canonical manifests.

---

## See also
- `./GLOBAL-BRAIN.md`
- `./VALIDATOR-NODES.md`
- `./TERMS.md`