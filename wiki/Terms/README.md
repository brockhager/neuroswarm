# NeuroSwarm — Glossary of Terms

This page lists the important terminology used across the NeuroSwarm system, with short explanations and examples. It's intended as a friendly, quick-reference for new contributors and integrators to understand the vocabulary and how each concept is used in the NS architecture.

--

## Consensus & Production

- **Producer / designated producer**
  - Explanation: Deterministically chosen validator that produces a block at a specific height (stake-weighted selection). Only canonical producer is allowed to produce a block and — for CN-08 — sign certain LLM-generated TXs like `ARTIFACT_CRITIQUE`.
  - Example: `getProducer(42)` returns `validator-abc` — that validator should sign the block header for height 42.

- **Slot / height**
  - Explanation: An increasing integer that identifies the next block index in the canonical chain; used for scheduling and producer selection.
  - Example: Current height = 100, the next slot/height = 101 (producer selected deterministically).

- **Merkle root / merkleRoot**
  - Explanation: Compact cryptographic commitment to the set of transaction ids included in the block header.
  - Example: Calculate `merkleRoot` from an ordered list of txIds and include in the header.

--

## Transactions & Mempool

- **TX / transaction**
  - Explanation: A discrete action (e.g., stake, transfer, REQUEST_REVIEW, ARTIFACT_CRITIQUE). Canonicalized deterministically to compute a tx id.
  - Example: A `ARTIFACT_CRITIQUE` tx contains fields: `type`, `from`, `payload`, `signedBy`, `signature`, and a `fee`.

- **Mempool (Gateway)**
  - Explanation: Gateway keeps the authoritative mempool; VP nodes poll it and consume txs for blocks. NS delegates mempool ownership to gateway for admission control.
  - Example: Gateway GET `/v1/mempool` returns pending transactions with `txId` and `payload`.

- **txId / txIdFor()**
  - Explanation: Stable canonical hash of a transaction computed over canonicalized JSON excluding the `signature` field. Used to de-duplicate and index txs.
  - Example: `txIdFor(tx)` → `e3b0c442...`.

--

## Core Nodes & Services

- **NS Node (brain)**
  - Explanation: The canonical chain service — validates blocks and transactions, applies consensus rules, stores chain state, and enforces economic rules (rewards, slashing).
  - Example: `ns-node` receives a `POST /blocks/produce` from a VP and verifies signatures, merkle root, and sourcesRoot before applying the block.

- **Gateway (gateway-node)**
  - Explanation: The public-facing mempool and admission validator. Accepts client `POST /v1/tx`, performs source validation and authorization, and acts as the canonical mempool owner.
  - Example: A dApp POSTs a `REQUEST_REVIEW` transaction to the Gateway; the Gateway enriches tx with `sources` metadata then exposes it to VP nodes via `/v1/mempool`.

- **VP Node (validator / producer)**
  - Explanation: Produces blocks, polls the Gateway mempool, builds signed headers, optionally publishes block payloads to IPFS, and posts `POST /blocks/produce` to NS.
  - Example: A VP is selected as the producer for height 123; it signs the block header, uploads payload to IPFS, sets `header.payloadCid`, and posts to NS.

--

## Cryptography & Proofs

- **Ed25519 signatures / signature verification**
  - Explanation: Validators sign block headers and certain transactions (ARTIFACT_CRITIQUE) using Ed25519 keys. NS verifies these signatures before accepting blocks or special transactions.
  - Example: `verifyEd25519(publicKeyPem, canonicalHeader, signature)` returns `true` if signature is valid.

- **Payload CID / IPFS payload**
  - Explanation: VP optionally stores the block payload (header + txs + sources metadata) on IPFS and includes a `payloadCid` in header. NS can fetch and verify payload signatures & contents.
  - Example: header.payloadCid = `bafy...`; NS fetches `<producerUrl>/ipfs/<cid>` to validate merkle/sources root.

--

## Developer & Ops Terms

- **REQUEST_REVIEW**
  - Explanation: Client or Router API submits a request to review an artifact (CID). VP nodes (when producer) will process this and generate `ARTIFACT_CRITIQUE` transactions.
  - Example: `{ type: 'REQUEST_REVIEW', artifact_id: 'bafy...', block_height: 200, fee: 1 }`

- **ARTIFACT_CRITIQUE**
  - Explanation: Structured LLM-generated critique of an artifact. For CN-08-C, must be produced by the canonical producer, signed by that producer, validated by schema, and deduplicated.
  - Example: `{ type: 'ARTIFACT_CRITIQUE', signedBy: 'validator-1', signature:'...', payload: { artifact_id: 'bafy...', issues: [ ... ] } }`

- **NS-LLM client (shared)**
  - Explanation: Shared wrapper around the team's LLM integration (Gemini/Ollama) used by the Router and VP to produce structured critique JSON according to a canonical schema.
  - Example: `ns-llm-client.generate({ artifactContent, schema: ARTIFACT_CRITIQUE_SCHEMA })` → returns validated JSON.

--

## LLM & Review Transactions (CN-08 & CN-09)

- **StateDB / state.db**
  - Explanation: NS persistent storage for validators, blocks, txIndex, accounts and completed reviews (e.g., `persistCompletedReview` lookups used to prevent duplicate critiques).
  - Example: `db.getCompletedReviewsByArtifact(artifactId)` returns all recorded reviews for the artifact.

- **consecutive_misses / slashing**
  - Explanation: Scheduling metric tracked for validators which counts missed production windows. Excessive misses may lead to slashing (loss of stake) and disqualification.
  - Example: Validator `val-1` misses two consecutive designated slots — `consecutive_misses` increments accordingly; `SLASHEVIDENCE` may be emitted when policy threshold reached.

--

## State & Database

- **E2E harness (OPS-03C)**
  - Explanation: Multi-service test harness (Docker Compose + deterministic LLM stub) that verifies the integrated flow across Router → VP → NS and validates security properties (signature, producer provenance, dedupe).
  - Example: `neuroswarm/e2e/happy-path` spins up services, submits a sample artifact, triggers REQUEST_REVIEW, checks chain for a canonical ARTIFACT_CRITIQUE.

- **CI/CD / PR checks**
  - Explanation: Unit tests, integration tests, and E2E harness run in CI (GitHub Actions) to prevent regressions. PRs must pass lint, tests, and E2E where applicable.
  - Example: When you open `feat/cn-08-security-hardening`, CI will run ns-node, vp-node and gateway tests and the E2E harness (if added) before merge.

--

If you want additional terms added (e.g., `sourcesRoot` internals, P2P message types, governance timelines, Solana anchoring), tell me which area and I’ll expand this glossary with concise examples and pointers to source files where behavior is implemented.
