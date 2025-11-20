# Indexer Nodes — Off-chain Indexing Services

Version: 0.1
Date: 2025-11-11

Indexer nodes are off-chain services that transform blockchain events and on-chain manifests into queryable databases for dashboards, audit explorers, and UIs. They are not part of the Global Brain core but are essential for transparency and developer ergonomics.

## Role

- Listen to on-chain events (ProposalSubmitted, VoteSubmitted, ProposalFinalized, RewardDistributed, etc.).
- Fetch referenced CIDs (manifests, artifacts, attestation batches) and store normalized records in a DB.
- Serve fast queries for UIs, dashboards, and auditors.

## Why indexers are external

- Indexers provide speed and convenience without changing canonical on-chain truth.
- They can maintain richer metadata, full text search, and aggregated metrics that would be expensive on-chain.

## Privacy & trust

- Indexers should verify referenced CIDs and only surface data permitted by privacy settings (do not index raw private data if not published).
- Multiple independent indexers improve censorship-resistance and availability of explorer data.

## Example usage

- Audit explorer: show proposal history, validator votes, and reward flows.
- Dashboard: network metrics (submissions per epoch, average confidence, dispute rates).

---

## See also
- `./GLOBAL-BRAIN.md`
- `./VALIDATOR-NODES.md`
- `./IPFS-storage.md`
- `./TERMS.md`