# Indexing & Discovery — Supporting layer for the Global Brain

## Overview

Indexing and discovery services translate the NeuroSwarm protocol's raw outputs (on-chain events, manifests, and IPFS artifacts) into queryable, developer- and user-friendly interfaces. These services live outside the Global Brain core but make its contents accessible, auditable, and usable.

## Responsibilities

- Convert blockchain events, manifest updates, and IPFS CIDs into normalized, queryable databases and search indices.
- Provide dashboards and explorers for provenance, confidence scores, version history, and contribution lineage.
- Support auditors, researchers, and end-users with interfaces for filtering by submitter, time, reputation, or confidence levels.
- Expose APIs for programmatic discovery (REST/GraphQL) and for downstream tooling (visualizers, analytic pipelines).

## Relation to Global Brain

- Indexers and discovery services are external to the Global Brain's core aggregation and consensus machinery.
- They make the Global Brain's outputs usable: enabling fast lookups, historical audits, and cross-referencing of manifests and artifacts.

## Operational notes

- Indexers should watch on-chain events and IPFS reference updates; they may also perform light off-chain validation (e.g., verify CIDs match manifests) to improve trustability of search results.
- To preserve privacy, indexers must honor any on-chain or off-chain access controls and respect encrypted payloads.

## See also

- `docs/GLOBAL-BRAIN.md`
- `docs/IPFS-storage.md`
- `docs/INDEXER-NODES.md`
