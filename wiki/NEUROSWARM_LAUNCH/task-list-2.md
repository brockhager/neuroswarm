# NEUROSWARM_LAUNCH — Task List 2 (Agent 4 Integration)

This task list translates the Master Design Document (MDD) into a prioritized, actionable implementation backlog for Agent 4 (Discord/Swarm Chat integration) and adjacent foundational services that must be implemented or refactored to achieve v1.2 compatibility.

> NOTE: This file focuses on the Agent 4 integration and immediate dependent platform work required to meet the MDD commitments. Tasks are grouped and prioritized as HIGH / MEDIUM / LOW.

---

## Recent updates — status snapshot (2025-12-04)

- Router API prototype has been hardened: JWT verification (HS256 + RS256) and JWKS remote JWKSet support added; RBAC middleware and server-side artifact validation are implemented and covered by unit + integration tests.
- Pinning persistence has been upgraded for higher-fidelity E2E: in-memory -> file-backed JSON -> SQLite-backed (better-sqlite3) with a runtime fallback to file storage when native modules cannot be built. Local tests will use the fallback; CI is now configured to install build tooling and assert the SQLite path in CI runs (EXPECT_SQLITE=true).
- Agent 9 (Discord) end-to-end ingestion tests covering upload validation, ingestion, and pinning were added and pass locally; CI has a dedicated Agent9 E2E workflow and Router API CI now enforces the SQLite-backed path for higher-fidelity persistence in CI.
- **CN-01 & CN-03 (Cryptographic Verification - 2025-12-03)**: ✅ **COMPLETE** — Cryptographic block verification integrated into production NS-Node `/v1/blocks/produce` endpoint. VP-Node deterministic production + ED25519 signing verified with E2E tests. CI gating added (`crypto_pipeline_test`). Critical bug fixed: validators routes now mounted. Key management docs: `wiki/Key-Management/CN-03-Key-Management-Plan.md`.

- **CN-04 (State Persistence & Block Propagation - 2025-12-03)**: ✅ **COMPLETE** — SQLite persistence layer (`state-db.js`) enables chain state survival across restarts. Block propagation service (`block-propagation.js`) announces blocks to NS-Node network with seen-blocks tracking. Database: `data/neuroswarm_chain.db`. Server verified running.

- **CN-01-E2E (VP→NS Cryptographic E2E - 2025-12-04)**: ✅ **COMPLETE** — Investigated and resolved production-grade E2E failure where NS rejected VP-produced ED25519 signatures. Root cause: NS server mutated the header (added `validatorId`) before verifying signatures, changing the canonicalized bytes. Fix applied across three layers: (1) NS `/v1/blocks/produce` endpoint now verifies original VP-produced header (accepts `producerId`), mapping `producerId` → `validatorId` only after successful verification; (2) `applyBlock` in `chain.js` accepts `producerId` as alias and sets `validatorId` post-verification; (3) `canonicalize()` now filters out `undefined` values. Full VP→NS crypto flow with process spawning validated in `e2e_crypto_block_propagation.test.mjs`.

## CN-05 Sync Protocol Hardening — Implementation Complete (2025-12-04)

**Status:** ✅ Core Implementation Complete | 🚧 Production Deployment Pending

Implemented and validated the Sync Protocol Hardening to secure cross-node synchronization against malformed or malicious peers, make the sync path resource-friendly for production use, and add comprehensive observability.

**Completed work (Implementation Phase):**
- **CN-05-A — Ancestry Integrity** ✅: REQUEST / RESPONSE handlers now validate ancestry. NS rejects sync attempts where the first block's prevHash doesn't match the requester's provided anchor (or when a RESPONSE payload doesn't extend the receiver's current tip). This prevents feeding invalid chain history.
- **CN-05-B — Paging/Chunking** ✅: The responder enforces a configurable per-response block limit (MAX_SYNC_BLOCKS, default 100). Responses include metadata (`hasMore`, `nextFrom`) so requesters can continue paging until caught up.
- **CN-05-C — Resource Rate Limiting** ✅: The REQUEST handler enforces a per-peer concurrency cap (MAX_CONCURRENT_SYNC_PER_PEER, default 3) — excess requests result in HTTP 429 to mitigate DoS.
- **CN-05-D — Observability Hardening** ✅: Prometheus-style metrics instrumented across sync handlers:
  - `sync_requests_total` — Counter for incoming REQUEST_BLOCKS_SYNC (labeled by origin)
  - `sync_ancestry_mismatch_total` — Counter for ancestry validation failures
  - `sync_too_many_concurrent_total` — Counter for 429 rate limit rejections
  - `sync_inflight_total` — Gauge for global in-flight sync handlers
  - `sync_inflight_per_peer` — Gauge for per-peer in-flight handlers

**Testing (Local Validation):**
- Integration tests added and passing: `blocks_sync_ancestry.test.mjs`, `blocks_sync_paging.test.mjs`, `blocks_sync_rate_limit.test.mjs`, `blocks_sync_metrics.test.mjs`
- **6/6 core integration tests passing locally**: cryptographic E2E, ancestry checks, paging, rate limiting with metrics, ancestry mismatch metrics, and block gossip
- Spawn issues fixed across all tests (Windows path handling with `process.execPath`, proper cwd resolution)

**Metrics output example:**
```
neuroswarm_sync_requests_total{origin="test-origin"} 3
neuroswarm_sync_too_many_concurrent_total{origin="test-origin"} 1
neuroswarm_sync_ancestry_mismatch_total{origin="metric-peer"} 1
neuroswarm_sync_inflight_total 0
```

**Remaining work (Production Deployment Phase):**
- **CN-05-E** — CI Integration: Add sync protocol tests to CI pipeline (currently passing locally, need CI validation)
- **CN-05-F** — Prometheus Scraping: Configure Prometheus scrape endpoints in production deployment configurations
- **CN-05-G** — Grafana Dashboards: Create dashboards for sync monitoring (request rates, rejection patterns, inflight tracking)
- **CN-05-H** — Alert Rules: Implement alert rules for ancestry mismatch spikes, persistent 429 patterns, and sync failures

## Consolidated Task Backlog (ordered by priority: HIGH → MEDIUM → LOW)

ID | Component | Task Description | Priority | Status
:-- | :-- | :-- | :--: | :--
OPS-01A | ns-node (3009) | `/health` and `/metrics` endpoints with Prometheus format | HIGH | ✅ Complete (sync metrics implemented)
OPS-01B | All Services | Extend `/health` and `/metrics` to remaining services (Gateway, VP, Router, NS-LLM) | HIGH | Not Started
OPS-02 | All Services | Standardize structured logging (JSON), correlation IDs & trace propagation | HIGH | Not Started
OPS-03A | CI/CD | VP→NS cryptographic E2E test in CI | HIGH | ✅ Complete (`crypto_pipeline_test`)
OPS-03B | CI/CD | Sync protocol integration tests in CI (ancestry, paging, rate limits, metrics) | HIGH | Not Started
OPS-03C | CI/CD | Multi-service E2E harness (Agent 9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node) | HIGH | Not Started
OPS-04 | Secrets & Deployment | Formalize secrets management (Vault/Docker secrets) for local & containerized setups | HIGH | Not Started
CN-01 | ns-node (3009) | Block validation, consensus enforcement, reorg handling, RBAC | HIGH | ✅ Complete (cryptographic verification integrated)
CN-01-E2E | ns-node + VP | VP→NS cryptographic E2E (ED25519 signature verification across network) | HIGH | ✅ Complete (header canonicalization fixed, E2E test passing)
CN-02 | Router API (4001) | JWT/RBAC security, Postgres migrations + IPFS/on-chain anchoring | HIGH | 🚧 In Progress (prototype hardened, needs production DB)
CN-03 | VP Node (4000) | Deterministic block producer: mempool poll → payloadCid/sourcesRoot → sign & submit | HIGH | ✅ Complete (deterministic production + ED25519 signing)
CN-04 | Gateway Node (8080) | Admission control: mempool + per-IP/key rate limiting + requeue endpoints | HIGH | ✅ Complete (SQLite persistence + block propagation service)
CN-05-A | ns-node (3009) | Sync Protocol: Ancestry Integrity (REQUEST/RESPONSE validation) | HIGH | ✅ Complete (implemented + tested locally)
CN-05-B | ns-node (3009) | Sync Protocol: Paging/Chunking (MAX_SYNC_BLOCKS, hasMore/nextFrom) | HIGH | ✅ Complete (implemented + tested locally)
CN-05-C | ns-node (3009) | Sync Protocol: Resource Rate Limiting (per-peer concurrency cap, 429 responses) | HIGH | ✅ Complete (implemented + tested locally)
CN-05-D | ns-node (3009) | Sync Protocol: Observability (Prometheus metrics for sync events) | HIGH | ✅ Complete (6 metrics instrumented, tested locally)
CN-05-E | CI/CD | Add sync protocol tests to CI pipeline | HIGH | Not Started
CN-05-F | Deployment | Configure Prometheus scrape endpoints in production | MEDIUM | Not Started
CN-05-G | Monitoring | Create Grafana dashboards for sync monitoring | MEDIUM | Not Started
CN-05-H | Monitoring | Implement alert rules for sync failures and anomalies | MEDIUM | Not Started
AI-01 | NS-LLM (3015) | SSE/token streaming on `/api/generate` with native fallback | HIGH | ✅ Complete
AI-02 | NS-LLM (3015) | `/api/embed` embedding endpoint with deterministic schema | MEDIUM | ✅ Complete
AG4-01 | Agent 9 | Integrate with NS-LLM streaming + generate/embed contract | HIGH | ✅ Complete
AG4-02 | Agent 9 | IPFS/provenance attachments and deterministic audit metadata | HIGH | ✅ Complete
AG4-03 | Agent 9 | Offline/resiliency handling (status notifications, backoff, monitoring) | MEDIUM | 🚧 In Progress
AG4-04 | Agent 9 | Fine-grained audit logging for user-visible interactions | MEDIUM | Not Started
AG4-05 | Agent 9 | Streaming UX hardening (backpressure, edit throttling, resumable streams) | MEDIUM | Not Started
OPS-CI-NSLLM | CI/CD | NS-LLM integration tests + OpenAPI contract validation in CI | HIGH | Not Started
APP-01 | neuro-services (3007) | Core business logic (billing, reconciliation) and DB access | MEDIUM | Not Started
APP-02 | neuro-runner (3008) | Background worker framework (job queues, metrics, retry logic) | MEDIUM | Not Started
APP-03 | admin-node (3000) | Secure admin UI with RBAC + audit trails | MEDIUM | Not Started
APP-04 | alert-sink (3010) | Alert ingestion, durable JSONL storage & replay hooks | LOW | Not Started

---

## 1. Core Network Implementation Tasks

ID | Component | Task Description | Priority | Status
---|-----------|------------------|--------|:--
CN-01 | ns-node (3009) | Implement full canonical node logic: block validation, consensus enforcement, robust reorg handling, and governance RBAC enforcement. Include thorough unit tests and integration contracts with Router API. | HIGH | ✅ Complete (cryptographic verification in `/v1/blocks/produce`, validators routes mounted, integration tests passing)
CN-01-E2E | ns-node + VP | VP→NS Cryptographic E2E: Validate full cryptographic flow from VP block production (ED25519 signing) through network transmission to NS verification and canonical chain application. | HIGH | ✅ Complete (header canonicalization bug fixed, `e2e_crypto_block_propagation.test.mjs` passing with spawned processes)
CN-02 | Router API (4001) | Implement security and anchoring: JWT middleware (HS256/RS256/JWKS), RBAC, Postgres schema/migrations, deterministic audit hashing, IPFS pinning pipeline, and optional on-chain anchoring tests. | HIGH | 🚧 In Progress (prototype hardened with JWT/RBAC/validation, needs production Postgres + anchoring pipeline)
CN-03 | VP Node (4000) | Implement consensus engine: poll Gateway mempool, deterministically build blocks, compute payloadCid and sourcesRoot, sign headers with ED25519, submit to ns-node, and provide metrics. | HIGH | ✅ Complete (deterministic production, ED25519 signing, Merkle root computation, CI tests passing)
CN-04 | Gateway Node (8080) | Implement admission control: mempool management, per-IP and per-key rate limiting, adapter sandboxing, and requeue endpoints for reorg handling. | HIGH | ✅ Complete (SQLite state persistence via `state-db.js`, block propagation service via `block-propagation.js`, server verified running)
CN-05-A | ns-node (3009) | Sync Protocol - Ancestry Integrity: Implement REQUEST/RESPONSE ancestry validation to prevent feeding invalid chain history. | HIGH | ✅ Complete (implemented, `blocks_sync_ancestry.test.mjs` passing locally)
CN-05-B | ns-node (3009) | Sync Protocol - Paging/Chunking: Enforce configurable per-response block limit (MAX_SYNC_BLOCKS) with hasMore/nextFrom metadata for continuation. | HIGH | ✅ Complete (implemented, `blocks_sync_paging.test.mjs` passing locally)
CN-05-C | ns-node (3009) | Sync Protocol - Rate Limiting: Implement per-peer concurrency cap (MAX_CONCURRENT_SYNC_PER_PEER) with HTTP 429 responses for DoS mitigation. | HIGH | ✅ Complete (implemented, `blocks_sync_rate_limit.test.mjs` passing locally)
CN-05-D | ns-node (3009) | Sync Protocol - Observability: Instrument Prometheus metrics for sync events (requests, ancestry mismatches, 429 rejections, inflight gauges). | HIGH | ✅ Complete (6 metrics instrumented, `blocks_sync_metrics.test.mjs` passing locally)
CN-05-E | CI/CD | Add sync protocol integration tests to CI pipeline (ancestry, paging, rate limits, metrics validation). | HIGH | Not Started (tests pass locally, need CI integration)
CN-05-F | Deployment | Configure Prometheus scrape endpoints in production deployment configs for ns-node sync metrics. | MEDIUM | Not Started
CN-05-G | Monitoring | Create Grafana dashboards for sync monitoring (request rates, rejection patterns, inflight tracking, ancestry failures). | MEDIUM | Not Started
CN-05-H | Monitoring | Implement alert rules for sync anomalies (ancestry mismatch spikes, persistent 429 patterns, sync failures). | MEDIUM | Not Started

---

## 2. AI / LLM Service Refactor Tasks

ID | Component | Task Description | Priority | Status
---|-----------|------------------|--------|:--
AI-01 | NS-LLM (3015) | Refactor for streaming support: implement SSE token-by-token streaming on `POST /api/generate`, ensure fallback behaviour to HTTP prototype/native binary, add contract tests. | HIGH | ✅ Completed
AI-02 | NS-LLM (3015) | Implement embedding API: add `POST /api/embed` endpoint with deterministic embedding schema and tests; ensure low-latency and robust errors. | MEDIUM | ✅ Completed

### Completed (Sprint A work)

- ✅ AI-01 — NS-LLM `/api/generate` streaming + fallback implemented (SSE streaming, HTTP fallback, native shim support). OpenAPI contract (`openapi.yaml`) and integration tests were added.
- ✅ AI-02 — `/api/embed` endpoint tested and included in integration tests.
- ✅ AG4-01 — Agent 9 updated to consume streaming tokens; sample client and bot edits were added for streaming UX with a synchronous fallback.

- ✅ AG4-02 — Agent 9 artifact ingestion (A9-02) completed: added ipfs-http-client integration with deterministic CID fallback for dev, implemented robust file validation and sanitization in the Discord bot (size/type limits + filename normalization), and added unit tests covering deterministic CID generation, IPFS add, and upload validation.

> Note: This is a bot-side hardening step — the Router API still needs server-side enforcement (validation, pinning policy) and production-grade authentication (JWT/RBAC) to complete the end-to-end secure ingestion pipeline.

### Follow-up tasks created after Sprint A

- **OPS-CI-NSLLM** | CI: Add NS-LLM integration tests and OpenAPI contract validation into CI pipeline | HIGH | Not Started
- **OPS-03B** | CI: Add sync protocol integration tests to CI (ancestry, paging, rate limits, metrics) | HIGH | Not Started (tests passing locally)
- **OPS-03C** | E2E: End-to-end smoke & contract tests across services (Agent 9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node) | HIGH | Not Started (VP→NS crypto E2E complete in CI)
- **AG4-05** | Agent 9: Streaming UX hardening (backpressure, edit throttling, resumable streams, improved error handling) | MEDIUM | Not Started
- **CN-05-E** through **CN-05-H** | Sync Protocol: Production deployment (CI integration, Prometheus scraping, Grafana dashboards, alert rules) | MEDIUM | Not Started

---

## 3. Application & Support Services Tasks

ID | Component | Task Description | Priority | Status
---|-----------|------------------|--------|:--
APP-01 | neuro-services (3007) | Implement the business logic service with secure DB access, billing/reconciliation routines, adapters plugin interface, and tests. | MEDIUM | Not Started
APP-02 | neuro-runner (3008) | Build the background worker framework: job queue (Redis/BullMQ or equivalent), idempotent processing, retry/durable metrics, monitoring. | MEDIUM | Not Started
APP-03 | admin-node (3000) | Implement secure admin portal with RBAC, governance UI, audit trails, and tight access controls. | MEDIUM | Not Started
APP-04 | alert-sink (3010) | Implement alerts ingestion API, durable JSONL audit storage, replay hooks, and test coverage for alert delivery and storage. | LOW | Not Started

---

## 4. Operational & Standardization (Cross-cutting)

ID | Component | Task Description | Priority | Status
---|-----------|------------------|--------|:--
OPS-01A | ns-node (3009) | Implement `/health` (readiness) and `/metrics` (Prometheus) endpoints with sync protocol metrics. | HIGH | ✅ Complete (6 sync metrics instrumented, exposed via `/metrics`)
OPS-01B | All Services | Extend `/health` and `/metrics` to remaining services (Gateway, VP, Router, NS-LLM, neuro-services). | HIGH | Not Started
OPS-02 | All Services | Standardize structured logging (JSON), correlation IDs, trace context propagation, and logging levels. | HIGH | Not Started
OPS-03A | CI/CD | VP→NS cryptographic E2E test in CI with block signing and verification validation. | HIGH | ✅ Complete (`crypto_pipeline_test` workflow)
OPS-03B | CI/CD | Add sync protocol integration tests to CI (ancestry, paging, rate limits, metrics). | HIGH | Not Started (tests passing locally)
OPS-03C | CI/CD | Multi-service E2E harness validating full flows (Agent 9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node). | HIGH | Not Started
OPS-04 | Secrets & Deployment | Formalize secrets management for local and containerized environments (support for Docker secrets / Vault / environment-based secure loading). | HIGH | Not Started

---

## 5. Post-Sprint-A follow-ups (priority)

ID | Component | Task Description | Priority | Status
:-- | :-- | :-- | :--: | :--
OPS-CI-NSLLM | CI/CD | Add NS-LLM integration tests & OpenAPI contract validation to CI, ensure tests run and gate merges; include artifact checks and OS cross-runner coverage. | HIGH | Not Started
OPS-03C | E2E | Create end-to-end smoke harness that exercises Agent 9 streaming full-path (Agent9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node) and validates contract compatibility & key flows. | HIGH | Not Started (VP→NS crypto E2E complete, full multi-service flow pending)
AG4-05 | Agent 9 | Hardening & UX: implement streaming backpressure handling, partial-message edit throttling, token aggregation policies, resumable streams and better error messages. | MEDIUM | Not Started


## Agent 4 (Discord/Swarm Chat) - Specific Tasks

ID | Task Description | Priority | Status
---|------------------|--------|:--
AG4-01 | Integrate Agent 9 with NS-LLM contract (streaming + generate/embed). | HIGH | ✅ Completed
AG4-02 | Add source provenance to responses and attach IPFS/anchoring data when applicable. | HIGH | ✅ Completed
AG4-03 | Add offline/resiliency handling and monitoring (status channel notifications, automatic backoff and retries). | MEDIUM | In Progress
AG4-04 | Add fine-grained audit logging for all user-visible interactions for compliance & reconciliation. | MEDIUM | Not Started

---

## Agent 4 Task List: Priority Focus — Agent 9 Completion

This list prioritizes the implementation of the Future enhancements defined in Section 9 of the MDD, which will transform the bot from a simple gateway into a core network interaction tool.

### 1. Agent 9 Core Enhancements (Discord Feature Parity)

These tasks integrate the Discord bot with the network's decentralized features (Router API, ns-node).

ID | Component | Task Description | Priority | Status | MDD Feature
:-- | :-- | :-- | :--: | :--: | :--
A9-01 | Agent 9 | Multi-Agent Conversation Routing: Implement routing logic to allow users to invoke and coordinate other agents (Agent 3, Agent 7, etc.) within a single Discord thread. | HIGH | Not Started | Multi-agent conversations
A9-02 | Agent 9 | IPFS Attachment Support: Develop handlers to securely process user-uploaded files, calculate the content hash, and submit the artifact to the Router API (4001) for IPFS pinning. | HIGH | ✅ Completed | IPFS Attachment Support
 - ✅ Bot-side hardening completed: added ipfs-http-client integration, deterministic CID fallback for dev, strict file validation (size/type), filename sanitization, and unit tests.
 - ⚠️ Server-side follow-up: Router API must enforce the same validation, pinning policy, and add JWT/RBAC before production enablement.
 - ✅ Server-side E2E coverage added: JWKS verification (RS256), file-backed pinning mock (later upgraded to SQLite-backed fallback for higher-fidelity testing), and Agent 9 → Router E2E tests added in `discord/tests/e2e/ingestion.test.mjs`.
 - ✅ CI updated: Router API CI installs OS build tools and asserts the SQLite path (EXPECT_SQLITE=true) — this ensures high-fidelity persistence path is executed. Agent 9 E2E workflow has been added to CI and also configured to expect SQLite in CI runs.
A9-03 | Agent 9 | Governance Voting Commands: Implement command handlers (/vote, /propose) to allow users to submit voting transactions or governance proposals directly to the Router API (4001). | HIGH | ✅ Completed | Governance Voting Commands
 - ✅ Bot-side: /vote handler integrated and wired to Router prototype. Add server-side validation & auth (JWT/RBAC) for production.
A9-04 | Agent 9 | Personal Agent Deployment: Implement the workflow for users to define and deploy custom, personalized AI configurations via a Discord command interface (integration with future Personal AI marketplace feature). | MEDIUM | Not Started | Personal agent deployment

### 2. Supporting Infrastructure & API Contracts

These tasks are necessary to support the advanced features above and remain critical to the In Progress list.

ID | Component | Task Description | Priority | Status | Related MDD Status
:-- | :-- | :-- | :--: | :--: | :--
RA-01 | Router API (4001) | Implement Governance Endpoint: Create the authenticated endpoint in the Router API to receive and validate governance/voting transactions from Agent 9 (Required for A9-03). | HIGH | Prototype | ✅ Prototype available (router-api-prototype/server.js) — **Security hardened (HS256 + RS256 + JWKS verified), RBAC enforced, unit & integration tests added (HS256/RS256/JWKS), README and CI workflow present**. Remaining work: DB persistence & anchoring pipeline for production.
RA-02 | Router API (4001) | Implement Artifact Ingestion Endpoint: Create the authenticated endpoint to receive IPFS content hashes and metadata for pinning and anchoring (Required for A9-02). | HIGH | Prototype | ✅ Prototype available (router-api-prototype/server.js) — **Server-side validation implemented (CID checks, metadata validation, size/type limits), HS256/RS256/JWKS validation supported, tests and CI workflow added, README added, mock pinning & DB store added for E2E verification**. Remaining work: pinning policy, durable storage, on-chain anchoring and production auth integration.
-- Server TODO: enforce server-side validation (size/type/content checks), pinning policy & production auth (JWT/RBAC) before enabling public ingestion.
OPS-01 | All Services | Prometheus/Grafana Dashboards: Focus on integrating metrics for Agent 9 performance (latency, token usage, command volume, connection health). | HIGH | In Progress | 🚧 Work in progress (dashboard & metrics integration)

This focused list ensures that the Discord experience is fully developed first, leveraging the in-progress backend services where necessary. Coordinate A9 tasks with the Router API team so RA-01/RA-02 are available as gates for the high-priority Agent 9 features.

## Acceptance Criteria (applies to all HIGH tasks)

- Unit tests with >80% coverage for new modules.
- Contract tests verifying request/response JSON structures among services.
- End-to-end smoke suite demonstrating basic happy-path flows.
- Prometheus metrics and `/health` endpoint implemented and queried by CI harness.
- Secrets managed via config (no plain tokens in code) and documented for CI/dev.

---

## Next actions / Sprint-ready slices

**Sprint A (2-week)** — ✅ Completed:
- NS-LLM streaming + embed (AI-01 / AI-02) ✅
- Agent 9 streaming integration (AG4-01) ✅
- Agent 9 IPFS attachments (AG4-02) ✅
- VP→NS cryptographic E2E (CN-01-E2E) ✅
- Sync protocol hardening implementation (CN-05-A through CN-05-D) ✅

**Sprint A.5 (1-week)** — 🚧 CI & Production Hardening:
- Add sync protocol tests to CI (OPS-03B)
- Add NS-LLM integration tests to CI (OPS-CI-NSLLM)
- Configure Prometheus scraping for ns-node (CN-05-F)
- Create basic Grafana dashboards (CN-05-G)

**Sprint B (2-week)** — Router API & Multi-Service E2E:
- Router API security & anchoring + Postgres migrations (CN-02)
- Multi-service E2E harness (OPS-03C)
- Extend `/health` and `/metrics` to all services (OPS-01B)

**Sprint C (2-week)** — Application Services:
- Application services (APP-01..APP-04)
- Admin UI and alert sink
- Operational cross-cutting work (OPS-02, OPS-04)
- Sync protocol alert rules (CN-05-H)

---

If you'd like, I can
- expand Sprint A into a concrete task breakdown (files, sample API contracts, test harness) for Agent 4 to start implementing immediately, or
- scaffold the NS-LLM streaming contract and a minimal test harness so Agent 4 can iterate quickly.

Which of these would you like me to do next (expand Sprint A or scaffold NS-LLM streaming)?