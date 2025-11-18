# Architecture: NeuroSwarm Node Roles & Data Flow
[← Home](Home.md)

## Goals
This page explains the responsibilities and interactions of the core nodes in NeuroSwarm: `ns-node` (brain), `gateway-node` (mempool/validation), `vp-node` (producer and IPFS publisher), and the `sources/` adapters.

## High-level responsibilities
- `ns-node` (Brain): Maintains canonical chain state and validators, verifies headers & signatures, provides SPV endpoints, and coordinates consensus logic. NS remains lightweight — it does NOT perform source validation.
- `gateway-node` (Gateway): The canonical mempool owner. Validates tx admission, performs source validation queries, and exposes mempool and stats. It strictly enforces admission policy and source attestation when configured.
- `vp-node` (Producer / VP): Polls the gateway mempool, produces blocks, signs payloads, publishes block payloads to IPFS, and adds `payloadCid` and `sourcesRoot` to the block header.
- `sources/` adapters: Contains external data validation and normalization logic (e.g., Allie‑AI adapters) which the gateway calls during admission.

## Dataflow (ASCII diagram)
```
User -> Gateway (/v1/tx) ---(source validation: Allie-AI)--> Gateway mempool  
       Gateway -> VP (poll /v1/mempool) -> VP builds payload (txs + sources metadata) -> sign + IPFS add -> header.payloadCid + header.sourcesRoot
       VP -> POST /blocks/produce -> NS validates header signature & merkleRoot; optional: fetch payloadCid and verify payload signature and sourcesRoot via IPFS
       NS applies block to canonical chain -> Notifies Gateway to consume txs (/v1/mempool/consume)
       NS: on reorg -> reconstruct removed txs -> POST /v1/mempool/requeue to Gateway
```

## Headers & payload fields
- `header.merkleRoot`: merkle root over txIds
- `header.payloadCid`: IPFS CID (optional but recommended)
- `header.sourcesRoot`: Merkle root over sources metadata for each tx (optional)
- `payloadSignature`: VP signs canonicalized payload before adding to IPFS; signature included in IPFS payload to attest origin

## Security responsibilities
- Gateway is responsible for validating sources via adapters and rejecting invalid txs (or marking them as unverified based on `ALLOW_UNVERIFIED_SOURCES`).
- VP signs payloads; NS verifies signatures and enforces signer == `header.validatorId`.
- NS verifies sourcesRoot when it arrives in a header (or via IPFS fetch).
