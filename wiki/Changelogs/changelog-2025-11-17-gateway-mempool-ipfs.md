# Gateway / Mempool / VP / NS architectural changes (2025-11-17)

This document contains the detailed changes for the Gateway-owned mempool, VP IPFS integration with payload signatures, NS lightweight behavior and the requeue site for reorg resilience.

## Summary

- Gateway now owns the canonical mempool. Gateways accept transactions, add admission control (fee & spam checks), rate-limiting, and maintain the authoritative mempool.
- NS remains lightweight, forwarding inbound txs to gateways and proxying `/mempool` to the gateway for compatibility.
- VP consumes curated transactions from the gateway mempool and produces blocks; the VP publishes block payloads and proofs to IPFS and includes `payloadCid` in block headers.
- Payload signing: VP signs payload content before publishing to IPFS and includes `payloadSignature` and `signer` in IPFS content. NS fetches and verifies signatures and merkle roots before accepting blocks, enforcing signer matching header.validatorId.
- On reorgs, NS reconstructs removed txs and asks gateway to requeue them via `/v1/mempool/requeue` to be included again by other validators.

## Behavior & API changes

Gateway endpoints:
- `POST /v1/tx` — Accept a transaction, apply checks, add to gateway mempool and return id.
- `GET /v1/mempool` — List curated transactions (`{ txId, type, payload, fee, timestamp, status }`).
- `GET /v1/stats` — Mempool size, rejected counters, and rate limiters.
- `POST /v1/mempool/consume` — Remove consumed txs, called by VP after a block is produced and accepted.
- `POST /v1/mempool/requeue` — Re-add tx payloads to the gateway mempool after a reorg (called by NS).

### Sources adapaters & Allie-AI integration
- Gateway now supports querying external `sources` adapters during admission when a tx includes `sourcesRequired`. Adapters live in `/sources/adapters/` and are normalized via `sources/index.js`.
- We add Allie-AI wrappers (Allie Price / Weather / News) under `/sources/adapters` with `origin: 'allie-ai'`. Gateway logs queries with `origin=allie-ai` and attaches the returned metadata as `tx.sources` and sets `tx.sourcesVerified` accordingly.
- VP includes `sources` metadata in IPFS payloads and `sourcesRoot` in headers; NS verifies `sourcesRoot` during block acceptance. Integration tests added to validate `allie-price` queries and the negative case where `sourcesRoot` mismatches cause block rejection.

NS Node changes:
- `POST /tx` — NS forwards to the gateway and does not own a mempool.
- `GET /mempool` — Proxy to gateway mempool for compatibility.
- Reorg handling: NS collects removed txs and calls the gateway `POST /v1/mempool/requeue` to re-add them.
- `POST /blocks/produce` — If header contains `payloadCid`, NS fetches IPFS content via `X-Producer-Url/ipfs/:cid` and validates:
  - Merkle root vs header
  - Payload signature (if present) against the signer public key in `validators` map
  - Ensures the signer matches `header.validatorId` before accepting the block

VP Node changes:
- Poll `GET /v1/mempool` on the gateway to fetch curated txs for block generation.
- Sign the serialized payload object and publish `{ payload, signer, payloadSignature }` to IPFS; `payloadSignature` is stored with the IPFS payload.
- After block is accepted by NS, call `POST /v1/mempool/consume` on the gateway to remove included txs.

## Reorg & Requeue behavior
- During `performReorg`, NS reconstructs txs that were removed and calls the configured gateway to requeue them via `/v1/mempool/requeue`.
- Gateway requeue endpoint checks tx format and re-adds to the canonical mempool with `status: 'pending'`.

## Logging & Metrics
- Gateway logs accepted/rejected txs including the reason, timestamp and `X-Source` if provided.
- NS logs forwarded txs and requeue events.
- VP logs produced block info and IPFS `payloadCid` and signer:
  - `[timestamp] vp-node produced block #N, CID: <cid> signer=val-xxx`

## Integration tests & CI
- The following integration scripts were added or updated:
  - `scripts/integration/gateway-to-ns.mjs` — Verify gateway -> NS -> gateway mempool path
  - `scripts/integration/ns-to-gateway.mjs` — Verify NS forwards txs -> gateway
  - `scripts/integration/vp-block-ipfs.mjs` — Verify VP publishes signed payload to IPFS and NS verifies both merkle root and signature
  - `scripts/integration/gateway-requeue-test.mjs` — Validates gateway requeue behavior (consume -> requeue -> verify)

- CI updates to start an IPFS daemon via Docker and run the new integration tests (Linux, macOS, and Windows runners).

## Files changed (high-level)
- `gateway-node/server.js`: mempool ownership, new endpoints, spam filtering, rate limits and logging.
- `ns-node/server.js`: forward `POST /tx` to gateway(s), proxy `/mempool` to gateway, reorg requeue logic.
- `vp-node/server.js`: read gateway mempool; sign payloads, IPFS publishing & `payloadCid` header, notify gateway to `consume` after block acceptance.
- `scripts` integration tests: updated & new scripts that assert signature verification and requeue behavior.
- `docs/run-nodes.md` & `docs/data-flow-architecture.md`: documentation updates to reflect the new flow and endpoints.

## Notes
- This changes the canonical data flow:
  - Client -> gateway -> (gateway mempool) -> vp-node produce -> NS validate & apply -> gateway consume
  - NS remains the canonical state-holder (chain and validators) but no longer keeps a mempool of pending transactions.

---

If you want any additional details or a smaller breakout of changes (e.g., top-level metrics, requeue rate limits, or signature verification tests), let me know and I'll add them to this file.
