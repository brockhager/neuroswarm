# NeuroSwarm Data Flow Architecture

Version: 2025-11-16

This document maps the end-to-end data flows in NeuroSwarm: ingress, internal processing, egress, and P2P propagation. It documents the audit hooks, how governance and slashing integrate, and how to validate connectivity and correctness using the repo's test harness and helper scripts.

---

## Flow Summary (High-level)

- Ingress: user -> gateway -> brain (ns-node)
- Internal: brain -> consensus engine -> validator set
- Recording: validated blocks -> `blockMap` and snapshots -> `wiki` / provenance
- Egress: brain -> clients & SPV proofs -> gateway forwarding
- Network: gossip & forks -> canonical chain selection -> reorg replay

Illustrated (simple):

User Input
  |
  v
Gateway (/v1/chat /v1/tx)
  | forward \n (with headers: x-correlation-id, authorization)   →  **Gateway `mempool`**
  v
Brain (ns-node)
  | validation -> mempool -> block production (via vp-node)
  v
Block consensus
  | (validators sign/produce, PoS selection)
  v
Blocks persist to `blockMap` -> `canonicalTipHash` -> snapshots
  | broadcast to gateways & peers
  v
Egress: SPV/Proofs, client queries, governance endpoints

---

## Key Components & Responsibilities

- Gateway (gateway-node): Accepts client messages, validates and forwards them to the `ns-node` via `/v1/tx` or `/v1/chat`. Provides `/debug/peers`, `/history`, and `/v1/mempool` for diagnostics.
 - Gateway (gateway-node): Accepts client messages, validates and forwards them to the `ns-node` via `/v1/tx` or `/v1/chat`. Provides `/debug/peers`, `/history`, `/v1/mempool`, and `/v1/mempool/requeue` for diagnostics and resilience.
- Policy & resilience: Gateway enforces adapter query policies (max adapters per tx, query timeouts, and in-memory caching) that protect gateway resources from abusive requests or slow adapters. Set env vars `GATEWAY_SOURCES_MAX_PER_TX`, `GATEWAY_SOURCES_QUERY_TIMEOUT_MS`, and `GATEWAY_SOURCES_CACHE_TTL_MS` to control them.

### Sources validation and Allie-AI adapters
- Gateways query adapters in `/sources/adapters/` during `POST /v1/tx` admission when the tx declares `sourcesRequired`. The gateway calls adapters, attaches normalized metadata to the tx (on `entry.payload.sources`), and sets `sourcesVerified=true` when the adapters respond with valid data.
- We integrate Allie-AI adapters under `/sources/adapters/` with `origin: 'allie-ai'` to enable adapters from the Allie ecosystem (Allie price, weather, news). Gateway records adapter queries with `origin=allie-ai` in logs for traceability.
- When producing blocks, VP stores the payload and the sources metadata in IPFS; the block header includes `sourcesRoot` (merkle root of per-tx sources metadata). NS verifies `sourcesRoot` during `POST /blocks/produce` and also exposes `/ipfs/verify` that returns `sourcesValid`. Failures to match `sourcesRoot` will result in block rejection.
- Brain (ns-node): Core PoS node that maintains `blockMap`, headers, and validators and performs signature/merkle verification. It does not own the canonical mempool (gateway owns it). It:
  - Accepts validators & txs
  - Validates signatures / canonicalization
  - Computes and verifies Merkle roots
  - Maintains `mempool`, `blockMap`, `txIndex`, and `validators`
  - Exposes debug endpoints: `/debug/peers`, `/debug/gateways`, `/debug/verifyHeader`
  - Exposes SPV: `/proof/:txId` and `/verify/proof`
- Validator / Producer (vp-node): Picks slot & signs block proposals (uses `validators/register` and `vp-node` logic for deterministic selection). 
- Mempool / Gossip: Gateways and nodes forward mempool entries and new blocks; gateways forward to ns-node.

---

## Ingress (Detailed): how data enters

1. User -> Client / App forms a message / tx with optional metadata (cid, signature, forwarded headers): signature may be provided for validator-signed txs.
2. Client POSTs to Gateway (`/v1/tx` or `/v1/chat`) with headers:
   - `Authorization` (optional) — for bots/ clients and governance flows
   - `X-Correlation-ID` — to trace across hops
   - `X-Forwarded-For` / `X-Forwarded-User` — provenance headers
3. Gateway performs a basic admission check (fee threshold, CID reachability), stores tx in its own canonical `gwMempool`, and forwards a record to `ns-node` for light validation (not to persist the mempool).
4. The brain validates tx core fields (type, fee) and signatures if `signedBy` present. NS does not persist a mempool; the gateway keeps the authoritative mempool.

Key endpoints and functions:
- Gateway: `POST /v1/chat`, `POST /v1/tx`.
- Brain: `POST /tx` to add to mempool.

---

## Internal: processing, consensus, and signing

Data transforms inside the brain:

1. Mempool insertion: on `POST /tx`, brain computes `txIdFor(tx)` (canonicalizes tx excluding signature), and stores it in `mempool`.
2. Block production: `vp-node` or validator process picks slot & uses `validators` state to compile a block: header includes `validatorId`, `prevHash` and `merkleRoot`. The header is canonicalized and signed using a validator's private key.
3. Block verification (`POST /blocks/produce`): node checks validator registration, verifies header signature with `verifyEd25519`, recomputes merkle root and checks `prevHash` existence.
4. Snapshotting & apply:
   - On block apply (function `applyBlock`), the node computes cumulative weight `cumWeight` using snapshot base (parent snapshot or global validators). It updates `txIndex`, `mempool`, and optionally validator stakes or snapshots if the block extended canonical chain.
5. Equivocation & slashing:
   - During block apply, the node detects equivocations by examining sibling blocks (same `parentHash`) produced by the same validator. The system slashes stake and marks the validator as `slashed` in `validators` map, and the slash is idempotent.

---

## Egress: how validated data leaves the brain

1. The brain replies to client queries via `/blocks/latest`, `/headers/tip`, `/proof/:txId`, and `/mempool` endpoints.
2. The brain forwards signed blocks to configured gateways & peers (`publishToGateways` sending to `/v1/chat`), and probably broadcast to other nodes in full deployments (mesh or hub-based routing).
3. SPV proofs can be generated for clients via `/proof/:txId`; verify with `/verify/proof`.
4. Governance: `POST /governance/proposals` and `POST /governance/vote` accept governance actions and are audited — proposals and votes are part of the auditable event ledger.

---

## P2P Network: gossip, fork handling & replay

1. Nodes propagate mempool txs & blocks to peers (gateway and peer endpoints) — in this repo, gateways act as forwarding points for `ns-node`.
2. When a node receives blocks that form a heavier chain, `chooseCanonicalTipAndReorg` selects a new tip, computes the common ancestor, and performs a rollback and replay using snapshots on blocks.
3. Reorg replay: the node:
   - Rolls back transactions from the old tip down to the ancestor (collects removed txs)
   - Re-applies blocks from ancestor child to new tip updating `txIndex`, `mempool`, and snapshots
   - Re-adds removed txs not present in the canonical chain to the mempool for future inclusion

Constraints:
- Keep validator registrations (global map) persistent; do not clear validator registrations during genesis reorg.
- Ensure snapshot usage is local to branch processing. Do not mutate global validators state except when a block is committed to the canonical chain.

---

## Auditing & Provenance

Where provenance metadata is attached:
- Gateway adds `x-correlation-id`, `x-forwarded-for`, `x-forwarded-user`, and Authorization to headers before forwarding. These headers are saved in the `history` log to preserve provenance.
- In `ns-node` history file (`data/history.json`), each in/out message stores `headers` to show origin and path.
- Block snapshots embed validator stakes at that chain point; block headers & signatures are persistent and canonicalized for signature verification.

Where to look for audit hooks:
- `ns-node` / `history` (file) — log of messages & headers
- `ns-node` validators map — registration & slashing status
- `blockMap` & `txIndex` — canonical chain and tx positions
- `SPV proof` (`/proof/:txId`) — to verify an element's inclusion in a block
- `wiki/Updates.md` with `scripts/publishUpdate.mjs` — contributor-driven audit trail for repo-level updates

Governance and disputes:
- New governance proposals and votes are tracked via `/governance/proposals` and `/governance/vote` endpoints — the voting tally uses validator stake weight and is used to drive decisions.
- Slashing operations and logs are visible in `logs` and the validators map; they are auditable and non-destructive (we don't delete data; we mark slashed status & reduce stakes).

---

## Data Lifecycle Narrative (Example: single tx)

Step 1: Submission -> Gateway
- User submits signed tx to Gateway (`POST /v1/tx` with optional `Authorization`)
- Gateway validates fee and behavior, pushes tx to `gwMempool`
- Gateway forwards tx to `ns-node` `/tx` with preserved headers

Step 2: Validation -> Mempool
- ns-node verifies minimal tx shape; verifies signature if `signedBy` is validator; stores tx with `txIdFor`.

Step 3: Block Inclusion
- Validator picks txs from the gateway canonical mempool (`/v1/mempool`) and constructs a block, computes `merkleRoot`, signs header.
- Validator sends block via `POST /blocks/produce` to ns-node.
- ns-node verifies header signature, merkle root, applies block via `applyBlock`. If canonical, moves txs into `txIndex` and removes from mempool.

Step 4: Broadcast & Propagation
- Node broadcasts new block to gateways & peers (`publishToGateways`) and the block is added to other peers' `blockMap` and `heads`.

Step 5: Fork / Reorg Handling
- If a heavier chain arrives, nodes select a new canonical tip; `performReorg` is invoked: rollback + snapshot restore + replay; removed txs re-added to mempool.
  - NS will attempt to re-add removed txs to the gateway canonical mempool by calling `POST /v1/mempool/requeue` with the removed tx payloads so other validators may include them in future blocks.

Step 6: SPV Proof & Client Verification
- Client asks for an SPV proof via `/proof/:txId`; server returns a proof and block header.
- Client verifies proof via `/verify/proof` or locally.

Step 7: Governance Dispute & Slashing
- If a validator equivocated (two blocks with same parent/hash), other nodes detect it by scanning blocks with identical `parentHash` and `validatorId`.
- The node executes slashing (same as in code) via `applyBlock` branch logic: `validators.slashed` is set and stake reduced; slashing events are logged for audit.

---

## Audit Hooks & Provenance Data Schema

- `history` entry: `{ direction: 'in'|'out', id, sender, content, headers: { authorization, 'x-forwarded-for', 'x-forwarded-user', 'x-correlation-id' }, timestamp }`
- `tx` schema: `{ type, fee, cid?, signedBy?, signature?, body?, metadata? }` where `metadata` may include `source`, `tags`, or `attestation`.
- `header` schema: `{ version, prevHash, merkleRoot, timestamp, validatorId, stakeWeight, signature }`
 - `header` schema: `{ version, prevHash, merkleRoot, sourcesRoot?, timestamp, validatorId, stakeWeight, signature }` - `sourcesRoot` is optional and contains the merkle root of per-tx sources metadata when included.
- `blockMap` and `snapshot.validators`: maintained as `{ validatorId -> stake, publicKey, slashed }` in snapshots attached to blocks (not global changes unless a block is canonical and extended)

---

## Contributor Notes & Testability

- To reproduce user -> ns-node flows locally, use the `neuro-services` tests and helpers: `tests/utils/testHelpers.ts`, `startServerWithLogs`, `waitForCondition`, `killChild`.
- Logs: test logs are at `neuroswarm/tmp/logs` by default. Each child process's stdout/stderr are saved — this is crucial for diagnosing reorg & equivocation scenarios.
- For debug endpoints, use the following example calls:
  - `curl http://localhost:3000/health`
  - `curl http://localhost:3000/debug/peers`
  - `curl -s http://localhost:8080/v1/mempool | jq` to inspect gateway mempool
  - `curl -XPOST http://localhost:3000/tx -d '{"type":"example","fee":1}' -H 'Content-Type: application/json'`
  - `POST /blocks/produce` to be used by `vp-node` to publish a signed block

- Tests: The repository contains example tests such as `neuro-services/tests/connectivity.test.ts` that spin up ns/gateway locally. Expand tests:
  - `pos-reorg-extended.test.ts` for reorgs
  - `pos-multi-equivocation.test.ts` for equivocation and slashing
  - `pos-signature-verify.test.ts` for canonicalization & signature verification.

CI / Validation: recommended checks for the pipeline:
- Run the `startServerWithLogs` helper then ensure nodes respond at `/health` within 10 seconds.
- Use `checkNodeConnectivityClean.mjs` script to validate gateway -> ns forwarding and `debug/peers` endpoints.
- Include tests that simulate forks and reorgs and verify mempool re-add behaviour.

**New CI check**: We added a GitHub Action `connectivity-check.yml` to run the connectivity smoke test on PRs and fail the check if the nodes are not connectable. To run the same check locally, run:

```bash
node neuroswarm/scripts/checkNodeConnectivityClean.mjs --ns http://localhost:3000 --gateway http://localhost:8080 --ci --timeout 2000
```

The script will exit non-zero in CI mode (`--ci`) if any of the checks fail.

---

## Extensibility

Steps to extend the flow (e.g., Reputation, Attestation, or Off-chain Proofs):

1. Add module endpoints and a schema for attestation metadata for tx objects (e.g., `tx.attestations` array).
2. Implement validators with attestation checks: optionally require a validator-signed endorsement before block inclusion.
3. Adjust provenance preservation: ensure gateway forwards attestation metadata and store it in `history` and block snapshots.
4. Add a lightweight reputational store keyed by `validatorId` that updates after behavior events (slashing, uptime) but is stored off-chain or in augmented chain metadata for queryability.

---

## Integration with publishUpdate & contributor transparency

1. Use `scripts/publishUpdate.mjs` to record all major system changes and governance updates in `wiki/Updates.md` as a persistent, reviewable artifact.
2. The publish flow supports PR creation with labels & reviewers; treat that PR as an audit trail for changes affecting consensus and validator config.
3. When validators are slashed or governance decisions change chain policy, publish an immutable summary update to `wiki/Updates.md` by default to ensure human review & traceability.

---

## Validation Checklist

- [ ] Validate that `POST /v1/tx` on gateway forwards to `ns-node` and appears in `ns-node` `/mempool`.
- [ ] Validate `vp-node` picks slots, signs header canonicalized the same as server, and `POST /blocks/produce` validates signature server-side.
- [ ] Fault injection: create an equivocation scenario and validate `slashed` status is set and idempotent.
- [ ] Simulate heavy fork: deliver a heavier chain and assert `performReorg` rolls back and replays blocks correctly and mempool entries are re-added as needed.
- [ ] Verify SPV proof retrieval (`/proof/:txId`) and SPV verification (`/verify/proof`) both succeed for a known included tx.
- [ ] Confirm gateway `gwMempool` and `ns-node` `mempool` interface correctly across network segments, and headers (`x-correlation-id`, forwarded heuristics) are recorded.

---

## Final Notes & Next Work Items

- Add peer discovery & gossip layer (ad hoc or Kademlia) for automatic P2P node discovery.
- Add richer telemetry and tracing via `X-Request-ID` propagation and more detailed log metadata (e.g., trace events per tx flow).
- Add replayable audit trail (e.g., append-only event log) for governance actions, slashes, and important snapshots; consider a small indexing service to allow queryable timelines.

For questions: see contributors' guide in the repo, or contact the maintainers as listed in `README.md`. This document should be used as the design reference for future changes to the system and as an onboarding guide for new contributors working on data flows.

### Gateway Node Environment: NS health check params
Gateway node supports configuration for how it checks the `ns-node` health on startup. Set these environment variables to tune behavior for CI or local dev:

- `NS_NODE_URL` (string): URL for the NS node to forward to (default: no check performed if not set)
- `NS_CHECK_RETRIES` (number): How many retry attempts to make before giving up (default: 5)
- `NS_CHECK_INITIAL_DELAY_MS` (number): Initial backoff delay between retries in ms (default: 500)
- `NS_CHECK_MAX_DELAY_MS` (number): Maximum backoff delay (default: 30000)
- `NS_CHECK_EXIT_ON_FAIL` (bool/string): If `true`, the gateway exits if `ns-node` remains unreachable after retries (default: `false`)

Example: start gateway tolerantly and do not exit on missing ns-node:

```bash
NS_NODE_URL=http://localhost:3000 NS_CHECK_RETRIES=10 NS_CHECK_EXIT_ON_FAIL=false node gateway-node/server.js
```

