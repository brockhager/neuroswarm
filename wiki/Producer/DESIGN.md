# VP Node (Validator Producer) — Design

This page collects the design guidance for the VP node (Validator / Producer). It is a coalesced copy of the previous `Nodes/VP_NODE_DESIGN.md` content and related sections.

## Purpose & Scope

The VP node (Validator Producer) is responsible for producing deterministic, signed blocks for the NeuroSwarm network. Its role is to collect validated mempool items, build canonical block payloads, compute source merkle roots, sign block headers deterministically, and publish blocks to the NS (brain) node for validation and canonicalization.

### Key responsibilities
- Deterministic ordering rules
- Block header format and signing contract
- Merkle tree / sourcesRoot construction
- External HTTP RPC surface
- Persistence, safety, replay & idempotency
- Security considerations

## Deterministic ordering and block header contract
See the canonical ordering rules and header contract in the original design doc (order by priority, fee, timestamp, id) and the `contracts/VPBlockHeader.json` contract schema in the repo.

## Merkle & sourcesRoot
The VP computes a `merkleRoot` for the block payload and a `sourcesRoot` over per-entry sources metadata. Both use deterministic hashing (SHA-256) and consistent padding rules.

## Persistence & idempotency
VP must persist mempool state and produced block index to guarantee idempotency and avoid double-production for the same slot. The design recommends SQLite-backed mempool and a produced-block index keyed by height and header hash.

## Endpoints & API
- `POST /v1/mempool/add` — add validated entries (for test harness).
- `GET /v1/mempool` — list pending mempool entries.
- `POST /v1/blocks/produce` — trigger production; return signed header + payloadCid.

For detailed design, see the in-repo contract tests and `vp-node/server.js` implementation.
