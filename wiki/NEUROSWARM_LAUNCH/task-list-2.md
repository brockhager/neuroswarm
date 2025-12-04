# NEUROSWARM_LAUNCH — Task List 2 (Agent 4 Integration)

This task list translates the Master Design Document (MDD) into a prioritized, actionable implementation backlog for Agent 4 (Discord/Swarm Chat integration) and adjacent foundational services that must be implemented or refactored to achieve v1.2 compatibility.

> NOTE: This file focuses on the Agent 4 integration and immediate dependent platform work required to meet the MDD commitments. Tasks are grouped and prioritized as HIGH / MEDIUM / LOW.

---

## Consolidated Task Backlog (ordered by priority: HIGH → MEDIUM → LOW)

ID | Component | Task Description | Priority | Status
:-- | :-- | :-- | :--: | :--
OPS-01 | All Services | Add standardized `/health` and `/metrics` endpoints (Prometheus) | HIGH | Not Started
OPS-02 | All Services | Standardize structured logging (JSON), correlation IDs & trace propagation | HIGH | Not Started
OPS-03 | CI/CD | Develop contract/E2E test suite validating inter-service contracts & flows | HIGH | Not Started
OPS-04 | Secrets & Deployment | Formalize secrets management (Vault/Docker secrets) for local & containerized setups | HIGH | Not Started
CN-01 | ns-node (3009) | Implement full canonical node logic (block validation, consensus, reorg handling, RBAC) | HIGH | Not Started
CN-02 | Router API (4001) | Implement JWT/RBAC security, Postgres migrations + IPFS/on-chain anchoring | HIGH | Not Started
CN-03 | VP Node (4000) | Implement deterministic block producer: mempool poll → payloadCid/sourcesRoot → sign & submit | HIGH | Not Started
CN-04 | Gateway Node (8080) | Implement admission / mempool + per-IP/key rate limiting and requeue endpoints | HIGH | Not Started
AI-01 | NS-LLM (3015) | Refactor /api/generate to support SSE/token streaming (and native fallback) | HIGH | ✅ Completed
AG4-01 | Agent 9 | Integrate Agent 9 with NS-LLM streaming + generate/embed contract | HIGH | ✅ Completed
AG4-02 | Agent 9 | Add IPFS/provenance attachments and deterministic audit metadata in responses | HIGH | ✅ Completed
OPS-CI-NSLLM | CI/CD | Add NS-LLM integration tests + OpenAPI contract validation into CI pipeline | HIGH | Not Started
E2E-01 | E2E | End-to-end contract smoke tests (Agent 9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node) | HIGH | Not Started
AG4-05 | Agent 9 | Streaming UX hardening (backpressure, edit throttling, resumable streams, improved error handling) | MEDIUM | Not Started
AI-02 | NS-LLM (3015) | Add `POST /api/embed` embedding endpoint (deterministic schema, tests) | MEDIUM | ✅ Completed
APP-01 | neuro-services (3007) | Implement core business logic (billing, reconciliation) and DB access | MEDIUM | Not Started
APP-02 | neuro-runner (3008) | Implement background worker framework (job queues, metrics, retry logic) | MEDIUM | Not Started
APP-03 | admin-node (3000) | Implement secure admin UI with RBAC + audit trails | MEDIUM | Not Started
AG4-03 | Agent 9 | Offline/resiliency handling (status notifications, backoff, monitoring) | MEDIUM | In Progress
AG4-04 | Agent 9 | Fine-grained audit logging for user-visible interactions | MEDIUM | Not Started
APP-04 | alert-sink (3010) | Implement alert ingestion, durable JSONL storage & replay hooks | LOW | Not Started

---

## 1. Core Network Implementation Tasks

ID | Component | Task Description | Priority
---|-----------|------------------|--------
CN-01 | ns-node (3009) | Implement full canonical node logic: block validation, consensus enforcement, robust reorg handling, and governance RBAC enforcement. Include thorough unit tests and integration contracts with Router API. | HIGH
CN-02 | Router API (4001) | Implement security and anchoring: JWT middleware, RBAC, Postgres schema/migrations, deterministic audit hashing, IPFS pinning pipeline, and optional on-chain anchoring tests. | HIGH
CN-03 | VP Node (4000) | Implement consensus engine: poll Gateway mempool, deterministically build blocks, compute payloadCid and sourcesRoot, sign headers, submit to ns-node, and provide metrics. | HIGH
CN-04 | Gateway Node (8080) | Implement admission control: mempool management, per-IP and per-key rate limiting, adapter sandboxing, and requeue endpoints for reorg handling. | HIGH

---

## 2. AI / LLM Service Refactor Tasks

ID | Component | Task Description | Priority
---|-----------|------------------|--------
AI-01 | NS-LLM (3015) | Refactor for streaming support: implement SSE token-by-token streaming on `POST /api/generate`, ensure fallback behaviour to HTTP prototype/native binary, add contract tests. | HIGH | ✅ Completed
AI-02 | NS-LLM (3015) | Implement embedding API: add `POST /api/embed` endpoint with deterministic embedding schema and tests; ensure low-latency and robust errors. | MEDIUM | ✅ Completed

### Completed (Sprint A work)

- ✅ AI-01 — NS-LLM `/api/generate` streaming + fallback implemented (SSE streaming, HTTP fallback, native shim support). OpenAPI contract (`openapi.yaml`) and integration tests were added.
- ✅ AI-02 — `/api/embed` endpoint tested and included in integration tests.
- ✅ AG4-01 — Agent 9 updated to consume streaming tokens; sample client and bot edits were added for streaming UX with a synchronous fallback.

- ✅ AG4-02 — Agent 9 artifact ingestion (A9-02) completed: added ipfs-http-client integration with deterministic CID fallback for dev, implemented robust file validation and sanitization in the Discord bot (size/type limits + filename normalization), and added unit tests covering deterministic CID generation, IPFS add, and upload validation.

> Note: This is a bot-side hardening step — the Router API still needs server-side enforcement (validation, pinning policy) and production-grade authentication (JWT/RBAC) to complete the end-to-end secure ingestion pipeline.

### Follow-up tasks created after Sprint A

- OPS-CI-NSLLM | CI: Add NS-LLM integration tests and OpenAPI contract validation into CI pipeline | HIGH | Not Started
- E2E-01 | End-to-end smoke & contract tests across services (Agent 9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node) | HIGH | Not Started
- AG4-05 | Agent 9 streaming UX hardening: backpressure, edit throttling, resumable streams, and improved error handling | MEDIUM | Not Started

---

## 3. Application & Support Services Tasks

ID | Component | Task Description | Priority
---|-----------|------------------|--------
APP-01 | neuro-services (3007) | Implement the business logic service with secure DB access, billing/reconciliation routines, adapters plugin interface, and tests. | MEDIUM
APP-02 | neuro-runner (3008) | Build the background worker framework: job queue (Redis/BullMQ or equivalent), idempotent processing, retry/durable metrics, monitoring. | MEDIUM
APP-03 | admin-node (3000) | Implement secure admin portal with RBAC, governance UI, audit trails, and tight access controls. | MEDIUM
APP-04 | alert-sink (3010) | Implement alerts ingestion API, durable JSONL audit storage, replay hooks, and test coverage for alert delivery and storage. | LOW

---

## 4. Operational & Standardization (Cross-cutting)

ID | Component | Task Description | Priority
---|-----------|------------------|--------
OPS-01 | All Services | Add standardized `/health` (readiness) and `/metrics` (Prometheus) endpoints across services. | HIGH
OPS-02 | All Services | Standardize structured logging (JSON), correlation IDs, trace context propagation, and logging levels. | HIGH
OPS-03 | CI/CD | Develop a contract test suite + E2E harness that validates integration compatibility between services (e.g., Gateway -> VP -> ns-node; Router -> ns-node, NS-LLM -> Agent 9). | HIGH
OPS-04 | Secrets & Deployment | Formalize secrets management for local and containerized environments (support for Docker secrets / Vault / environment-based secure loading). | HIGH

---

## 5. Post-Sprint-A follow-ups (priority)

ID | Component | Task Description | Priority | Status
:-- | :-- | :-- | :--: | :--
OPS-CI-NSLLM | CI/CD | Add NS-LLM integration tests & OpenAPI contract validation to CI, ensure tests run and gate merges; include artifact checks and OS cross-runner coverage. | HIGH | Not Started
E2E-01 | E2E | Create end-to-end smoke harness that exercises Agent 9 streaming full-path (Agent9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node) and validates contract compatibility & key flows. | HIGH | Not Started
AG4-05 | Agent 9 | Hardening & UX: implement streaming backpressure handling, partial-message edit throttling, token aggregation policies, resumable streams and better error messages. | MEDIUM | Not Started


## Agent 4 (Discord/Swarm Chat) - Specific Tasks

ID | Task Description | Priority
---|------------------|--------
AG4-01 | Integrate Agent 9 with NS-LLM contract (streaming + generate/embed). | HIGH | ✅ Completed
AG4-02 | Add source provenance to responses and attach IPFS/anchoring data when applicable. | HIGH
AG4-03 | Add offline/resiliency handling and monitoring (status channel notifications, automatic backoff and retries). | MEDIUM
AG4-04 | Add fine-grained audit logging for all user-visible interactions for compliance & reconciliation. | MEDIUM

---

## Agent 4 Task List: Priority Focus — Agent 9 Completion

This list prioritizes the implementation of the Future enhancements defined in Section 9 of the MDD, which will transform the bot from a simple gateway into a core network interaction tool.

### 1. Agent 9 Core Enhancements (Discord Feature Parity)

These tasks integrate the Discord bot with the network's decentralized features (Router API, ns-node).

ID | Component | Task Description | Priority | MDD Feature
:-- | :-- | :-- | :--: | :--
A9-01 | Agent 9 | Multi-Agent Conversation Routing: Implement routing logic to allow users to invoke and coordinate other agents (Agent 3, Agent 7, etc.) within a single Discord thread. | HIGH | Multi-agent conversations
A9-02 | Agent 9 | IPFS Attachment Support: Develop handlers to securely process user-uploaded files, calculate the content hash, and submit the artifact to the Router API (4001) for IPFS pinning. | HIGH | ✅ Completed
 - ✅ Bot-side hardening completed: added ipfs-http-client integration, deterministic CID fallback for dev, strict file validation (size/type), filename sanitization, and unit tests.
 - ⚠️ Server-side follow-up: Router API must enforce the same validation, pinning policy, and add JWT/RBAC before production enablement.
A9-03 | Agent 9 | Governance Voting Commands: Implement command handlers (/vote, /propose) to allow users to submit voting transactions or governance proposals directly to the Router API (4001). | HIGH | ✅ Completed
 - ✅ Bot-side: /vote handler integrated and wired to Router prototype. Add server-side validation & auth (JWT/RBAC) for production.
A9-04 | Agent 9 | Personal Agent Deployment: Implement the workflow for users to define and deploy custom, personalized AI configurations via a Discord command interface (integration with future Personal AI marketplace feature). | MEDIUM | Personal agent deployment

### 2. Supporting Infrastructure & API Contracts

These tasks are necessary to support the advanced features above and remain critical to the In Progress list.

ID | Component | Task Description | Priority | Related MDD Status
:-- | :-- | :-- | :--: | :--
RA-01 | Router API (4001) | Implement Governance Endpoint: Create the authenticated endpoint in the Router API to receive and validate governance/voting transactions from Agent 9 (Required for A9-03). | HIGH | ✅ Prototype available (router-api-prototype/server.js) — **Security hardening implemented** (JWT validation + RBAC enforced on /governance/vote)
RA-02 | Router API (4001) | Implement Artifact Ingestion Endpoint: Create the authenticated endpoint to receive IPFS content hashes and metadata for pinning and anchoring (Required for A9-02). | HIGH | ✅ Prototype available (router-api-prototype/server.js) — **Server-side validation implemented** (CID checks, metadata validation, size/type limits). Server still requires DB/pinning policy + CI/E2E gating for production.
-- Server TODO: enforce server-side validation (size/type/content checks), pinning policy & production auth (JWT/RBAC) before enabling public ingestion.
OPS-01 | All Services | Prometheus/Grafana Dashboards: Focus on integrating metrics for Agent 9 performance (latency, token usage, command volume, connection health). | HIGH | 🚧 In Progress

This focused list ensures that the Discord experience is fully developed first, leveraging the in-progress backend services where necessary. Coordinate A9 tasks with the Router API team so RA-01/RA-02 are available as gates for the high-priority Agent 9 features.

## Acceptance Criteria (applies to all HIGH tasks)

- Unit tests with >80% coverage for new modules.
- Contract tests verifying request/response JSON structures among services.
- End-to-end smoke suite demonstrating basic happy-path flows.
- Prometheus metrics and `/health` endpoint implemented and queried by CI harness.
- Secrets managed via config (no plain tokens in code) and documented for CI/dev.

---

## Next actions / Sprint-ready slices

1. Sprint A (2-week) — ✅ Completed: NS-LLM streaming + embed (AI-01 / AI-02) and Agent 9 streaming integration (AG4-01) implemented. Follow-ups: add CI gating for NS-LLM tests & OpenAPI, E2E smoke tests across services (Agent9 ↔ NS-LLM ↔ Router ↔ VP ↔ ns-node), and streaming UX hardening (AG4-05).
2. Sprint B (2-week): Router API security & anchoring + Postgres migrations (CN-02 + OPS-03). Add CI tests for anchoring pipeline.
3. Sprint C (2-week): Gateway + VP (CN-03, CN-04) with mempool tests and deterministic block producer integration tests.
4. Sprint D (2-week): Application services (APP-01..APP-04) + admin UI and alert sink + operational cross-cutting work (OPS-01..OPS-04).

---

If you'd like, I can
- expand Sprint A into a concrete task breakdown (files, sample API contracts, test harness) for Agent 4 to start implementing immediately, or
- scaffold the NS-LLM streaming contract and a minimal test harness so Agent 4 can iterate quickly.

Which of these would you like me to do next (expand Sprint A or scaffold NS-LLM streaming)?