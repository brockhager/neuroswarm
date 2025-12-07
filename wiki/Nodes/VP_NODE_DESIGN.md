# VP Node (Validator Producer) — Design Document (moved)

This design document has been consolidated into the central Producer documentation.

See: `../Producer/DESIGN.md`

## High-level requirements

1. Determinism: given the same inputs (mempool contents, configuration, time/slot), block production must be deterministic and reproducible to allow verification across independent validators.
2. Cryptographic integrity: headers and proofs must be signed by the VP's private key so their origin and integrity can be validated by NS and peers.
3. Composability: block payloads must include strong, verifiable references to sources (sourcesRoot) and the payload itself (payloadCid / payloadHash) to enable anchoring & verification.
4. Interoperability: define explicit RPC endpoints that enable the rest of the stack to enqueue validated entries and request block production in a testable manner.

## Block lifecycle overview

1. VP reads mempool entries (locally or via gateway/ns) — these entries are already validated by upstream checks (signatures, canonicalization) and annotated with source metadata.
2. VP builds an ordered payload according to deterministic ordering rules.
3. VP computes the payload CID (content-address) and the sourcesRoot (merkle root of per-entry source metadata) — both deterministic.
4. VP constructs block header with required fields and signs header using the configured private key (ED25519 or ECDSA per network policy).
5. VP publishes block header + payloadCid + sourcesRoot to NS via POST /blocks/produce (or via an agreed RPC), and persists local state so block production is idempotent.

## Deterministic ordering rules (core)

Determinism is critical — the algorithm below must be followed by every VP implementation:

1. Sort order of entries included in a block:
   - Primary key: entry.priority (number) ascending (lower numbers are higher priority)
   - Secondary key: entry.fee (number) descending (higher fee first)
   - Tertiary key: entry.timestamp (number) ascending (first-seen earlier wins)
   - Final key: canonicalized entry.id (string) ascending

2. If entries are equal across all keys, stable tie-breaking should be applied by falling back to lexicographic order of entry.id.

3. Block size constraints must be enforced: a maximum payload byte size and maximum entries per block (configurable via environment or network policy).

4. If high-priority entries cause size overflow, include as many entries as fit and leave the rest for later blocks (deterministically, based on the same sort order).

## Block Header contract (summary)

The header is the minimal, canonical, signed object describing the block. The canonical JSON shape and a JSON Schema are defined in the repository `contracts/VPBlockHeader.json` (see contract file). Important header fields include:

- `version`: string — semantic version of block format
- `chainId`: string — network identifier
- `height`: integer — block height
- `producerId`: string — validator public key id (or DID)
- `prevHash`: string — hash of previous block header (hex or base58)
- `payloadCid`: string — CID or content-address representing the block payload
- `sourcesRoot`: string — Merkle root of sources metadata
- `merkleRoot`: string — Merkle root of the payload entries
- `timestamp`: integer — epoch millis (preferred for determinism)
- `slot`: integer — optional network slot or epoch counter
- `txCount`: integer — number of entries included
- `extra`: object — optional extension field for future data
- `signature`: string — signature over canonical bytes of the header

Signature policy: The header MUST be signed deterministically by the producer's private key. The canonicalization function (deterministic JSON to bytes) must be clearly defined (e.g., RFC8785 canonical JSON, or a custom deterministic serialization) and documented.

## Merkle tree & sourcesRoot

We expect two merkle roots:

1. `merkleRoot`: Merkle root of the ordered payload entries. Leaves are hash(canonicalize(entry)).
2. `sourcesRoot`: Merkle root computed over each entry's source metadata (attestations, URIs, adapters). Allows verifying provenance metadata separately from payload content.

Merkle construction rules:
- Leaves: hash(canonicalize(entry)) or hash(canonicalize(entry.metadata)) respectively.
- Use a collision-resistant hash (SHA-256 recommended) and encode root as hex or base58.
- If number of leaves is odd, duplicate the last leaf or choose the common merkle padding used in the repo. The convention must be consistent across implementers.

## Endpoints / RPC surface

Minimal HTTP RPC endpoints for a VP node prototype:

- `POST /v1/mempool/add` — accept validated entries (application/json). Return queued status and assigned mempool id.
- `GET /v1/mempool` — list pending mempool entries (with ordering / pagination).
- `POST /v1/blocks/produce` — trigger block production for the current slot or immediate (optional overrides: maxBytes, maxEntries). Return produced header (signed) and payloadCid/sourcesRoot.
- `GET /v1/blocks/:height` or `GET /v1/blocks/latest` — retrieve produced block header and metadata.
- `POST /v1/mempool/requeue` — requeue dropped entries after reorg or failure handling.

Admin / operations endpoints (RBAC protected):
- `GET /v1/admin/health`, `GET /v1/admin/metrics`, `POST /v1/admin/keys` — key management and status endpoints.

## Persistence & idempotency

VP must persist enough state to avoid producing duplicate blocks for the same slot and must persist the mempool and produced block indexes to survive restarts.

Recommended persistent artifacts:
- mempool DB (SQLite) with entry id, priority, fee, timestamp, sources metadata, locked flags
- produced blocks index keyed by height and header hash

Idempotency rules:
- A produce request for the same slot/height should return the previously produced header if the block was already produced — do not sign and produce multiple differing headers for the same height.

## Signing & key management

VP must support loading a private key and deriving a `producerId`. ED25519 is recommended for speed and deterministic signatures. The header's `signature` field MUST be produced deterministically when the key algorithm supports it. Key rotation needs a documented plan (out of scope for prototype) — header must be extensible to include rotation metadata.

## Interaction with NS (brain)

- After successful produce, VP POSTs produced header and payloadCid/sourcesRoot to NS `/blocks/produce` endpoint for inclusion in the canonical chain. NS validates signatures and merkle roots.
- NS may respond with acceptance, rejection, or reorg notice — VP must handle requeueing or state updates accordingly.

## Testing & CI

Contract tests should verify:
- Deterministic ordering: given a canonical input fixture, the produced block's payload ordering, merkle roots and header fields must match deterministic expected values.
- Header signature verification: returned signature verifies against producer public key.
- Idempotency: repeated produce calls for the same slot return the same header/payloadCid.
- SourcesRoot correctness: computed sourcesRoot must match an independent implementation.

Integration & E2E:
- Deploy a three-node test harness (VP, NS, Gateway) with in-memory mempools and produce a few blocks to assert entire produce->apply->verify cycle.

## Next steps

1. Add `contracts/VPBlockHeader.json` (canonical schema + canonicalization notes).
2. Implement a small VP prototype (server skeleton, deterministic produce route, tests).
3. Add CI contract tests and integrate into repository CI.
