# NeuroSwarm — System Entities

This page lists the major entities (services, daemons, components, data types and actors) that make up the NeuroSwarm system. For each entity we describe what it is, the role it plays, where it typically runs (package / repo), and how it integrates with the rest of the system.

The goal of this document is to give new contributors, auditors and integrators a single, concise reference to understand the surface area of the platform and the responsibilities of each system component.

---

## High-level groups

- Core node daemons (Consensus & P2P): `ns-node` / `neuro-infra` (Rust)
- Gateway / API layer: `gateway-node`, `router-api`
- Block producers & validators: `vp-node` (and `vp-*` helper modules)
- Coordination / runner services: `neuro-runner`, `neuro-services`
- Frontend and developer tools: `neuro-web`, `ns-node-desktop`, scripts
- Smart contract/anchoring layer: `neuro-program` (Solana Anchor programs)
- Shared libraries & utilities: `neuro-shared` and `neuroswarm/shared`
- External infra: IPFS (Kubo/Pinata), Solana RPC, monitoring (Prometheus/Grafana), DBs

---

## Entity index (detailed)

### 1) NS Node (neuroswarm/ns-node & neuro-infra)
- What: Core brain / consensus & validation daemon that maintains canonical chain, applies blocks, verifies payloads and reorg handling.
- Language / location: Rust (`neuro-infra` / `ns-node` packages), production-ready binary.
- Responsibilities:
  - Maintain canonical ledger and perform fork resolution/reorgs.
  - Validate incoming blocks and transactions.
  - Provide metadata and proof endpoints used by gateways and validators.
  - Broadcast blocks and finalize chain state.
- Integrations:
  - Receives transactions forwarded by `gateway-node`.
  - Consumed by `vp-node` when creating block headers and verifying merkle roots.
  - Persisted data referenced by governance anchoring and indexer services.

### 2) Gateway Node (neuroswarm/gateway-node)
- What: API entrypoint for external clients — performs admission control, basic validation, and mempool handling.
- Language / location: TypeScript/Node (`neuroswarm/gateway-node`).
- Responsibilities:
  - Accepts external HTTP requests (transactions, submission metadata).
  - Performs initial validation (headers, signatures, source adapters).
  - Forwards validated transactions to `ns-node` and enqueues in `gwMempool`.
  - Interacts with `sources/adapters/*` to normalize source metadata.
- Integrations:
  - Interfaces with external adapters (Allie-AI, Pinata-style services) for source enrichment.
  - Returns responses to clients and proxies certain validation checks to administrative tooling.

### 3) Validator / Producer Node (neuroswarm/vp-node)
- What: Block producer / validator that polls mempools, builds payloads, signs headers and publishes blocks.
- Language / location: TypeScript/Node (`neuroswarm/vp-node`).
- Responsibilities:
  - Polls `ns-node` / `gateway-node` mempools to gather transactions.
  - Builds block payload and computes sourcesRoot (merkle root for sources metadata).
  - Signs block headers and produces blocks via `POST /blocks/produce` on `ns-node`.
  - May publish payloads to IPFS (Helia, Kubo) and publish manifest CIDs.
- Integrations:
  - Pulls transactions from `gateway-node` and `ns-node` when producing.
  - Can call `router-api` or other services for metadata and governance operations.

### 4) Router API (neuroswarm/router-api)
- What: Orchestration and audit layer that handles job routing (T23 flows), audit anchoring, and governance notifications.
- Language / location: TypeScript/Node (`neuroswarm/router-api`).
- Responsibilities:
  - Compute canonical audit hashes, pin payloads to IPFS, and drive on-chain anchoring.
  - Provide diagnostics, retries and fallbacks for IPFS (Pinata / Kubo support).
  - Emit governance timeline entries and notify admin/gov sinks.
  - Serve as the test harness (T23 preflight) for end-to-end verification.
- Integrations:
  - Uses IPFS (Pinata or local Kubo) and Solana RPC for anchoring operations.
  - Persists timeline entries via `admin-node` GovernanceLogger or `GOVERNANCE_LOGGER_URL`.

### 5) Neuro Services (neuro-services)
- What: Central TypeScript services that provide business logic, job queue handling, orchestration for learning pipelines, and APIs used by frontends and CLI tools.
- Language / location: TypeScript/Node (`neuro-services`).
- Responsibilities:
  - Runs server APIs for job lifecycle management, worker orchestration and status endpoints.
  - Houses the core business domain: job queues, retry policies, refund processing, reconciliations.
  - Exposes metrics (/metrics) for Prometheus/Grafana.
- Integrations:
  - Relies on Postgres for persistence and often interacts with `router-api` for audit anchoring.
  - Works with `neuro-runner` to dispatch remote/local jobs and observe results.

### 6) Neuro Runner (neuro-runner)
- What: Execution runtime and process for performing job tasks (e.g., running adapter tasks, integrations, or harnesses).
- Language / location: TypeScript/Node (`neuro-runner`).
- Responsibilities:
  - Pull jobs from `neuro-services` job queue and execute tasks.
  - Emit results, store artifacts, and report status back to services.
  - Handle retries, timeouts and orchestrate dependent tasks.

### 7) Admin Node (neuroswarm/admin-node)
- What: Governance and admin-facing service for timeline persistence, audits, policy decisions and cluster administration.
- Language / location: TypeScript/Node (`neuroswarm/admin-node`).
- Responsibilities:
  - Persist governance events into `wp_publish_log.jsonl` and provide audit APIs.
  - Accept timeline entries (from `router-api`) and optionally anchor to chain.
  - Provide E2E tools and tests for admin workflows.

### 8) Neuro Web (neuro-web)
- What: The frontend web UI for dashboards, explorer views and developer tooling.
- Language / location: Next.js / TypeScript (`neuro-web`).
- Responsibilities:
  - Offer visual dashboards for chain state, block production, job statuses, and governance timelines.
  - Provide UX for developers to inspect transactions, run tests and manage nodes.

### 9) NS-LLM / Local model adapters (`NS-LLM` / sources)
- What: Local LLM runtime and adapters used for semantic enrichment, answering queries, and providing normalized source metadata.
- Responsibilities:
  - Provide embeddings, inference endpoints, and a semantic cache to reduce duplicate computation.
  - Serve as the local/CI model stack used in tests and evaluation.

### 10) neuro-program (Solana Anchor programs)
- What: Smart contract programs that define on-chain anchoring logic, governance contracts and validators.
- Language / location: Rust / Anchor (`neuro-program`).
- Responsibilities:
  - Accept manifests and governance events as on-chain state for provenance and anchor verification.
  - Enforce account constraints, validator attestation rules and provide PDA seed semantics.
  - Be invoked by `router-api` or off-chain scripts for anchoring events.

### 11) IPFS & Pinning (Kubo / Pinata / Helia)
- What: External storage & pinning used to persist payloads and artifacts (CIDs). Multiple integrations supported:
  - Local Kubo (IPFS daemon) — used by devs & CI sometimes
  - Helia/HUB/CDN — optional content addressing layers
  - Pinata Cloud — production pinning with JWT/API key
- Responsibilities:
  - Make payloads (event metadata, ML artifacts, manifests) durable and content-addressed.
  - Provide CIDs that are anchored (on-chain or in governance timeline) for verifiable audit trails.

### 12) Postgres (Persistence)
- What: Primary relational database used by `neuro-services`, `router-api` tests, and other services.
- Roles:
  - Persistent storage for jobs, statuses, schema migrations, and repository state.
  - Backed up with migrations and seeded with essential validator configuration for local testing.

### 13) Prometheus / Grafana / Monitoring
- What: Observability stack that scrapes /metrics endpoints, stores time series and provides dashboards/alerts.
- Role:
  - Metrics provide p50/p95/p99 latencies, anchor success rate, IPFS pin rates, and operational health.
  - Alerts configured to detect high error rate, IPFS failures, or production regressions.

### 14) External Integrations and Actors
- Solana Devnet & RPC Providers — Used for test anchoring or production anchoring.
- CI / GitHub Actions — Runs E2E and preflight tests (T23), manages secrets (ROUTER_PRIVATE_KEY, PINATA_JWT) and publishing steps.
- Third-party adapters — Allie-AI, Pinata, cloud storage providers.

### 15) Shared Code & Utilities (neuro-shared / neuroswarm/shared)
- What: Types, helper utilities, and configuration shared across services.
- Responsibilities:
  - Keep port assignments, common protocols, and shared data types consistent across packages.
  - Provide helpers for dist/bin packaging and cross-node discovery.

---

## How entities fit together — simplified flows

### Transaction lifecycle (summary):
1. Client submits payload → `gateway-node` (admission) → adapters enrich sources
2. Gateway forwards to `ns-node` mempool and `neuro-services` job queue as needed
3. `vp-node` collects mempool data, builds block payload, signs and posts to `ns-node` (produce)
4. Payloads are optionally persisted to IPFS (CID) and anchor steps recorded by `router-api`
5. `router-api` pins payloads, anchors audit_hash to Solana (`neuro-program`) or simulated anchor, and notifies `admin-node` governance timeline
6. Dashboards (`neuro-web`) and monitoring surfaces the result; logs recorded in `wp_publish_log.jsonl` for provenance

### Governance & audits
- `router-api` creates the canonical audit_hash and attempts to pin to IPFS and anchor on Solana.
- `admin-node` persists timeline entries and acts as the single source of truth for governance actions.
- `neuro-program` contains on-chain logic to attest anchor events and validator signatures.

---

## Appendix — where to look for each entity
- ns-node / neuro-infra: `neuro-infra/` and `neuroswarm/ns-node/`
- gateway-node: `neuroswarm/gateway-node/`
- vp-node: `neuroswarm/vp-node/`
- router-api: `neuroswarm/router-api/`
- neuro-services: `neuro-services/`
- neuro-runner: `neuro-runner/`
- admin-node: `neuroswarm/admin-node/`
- neuro-web: `neuro-web/`
- neuro-program: `neuro-program/`
- shared: `neuro-shared/` + `neuroswarm/shared/`

---

If you'd like, I can expand any of the above entries with:
- sequence diagrams (ASCII or Mermaid)
- exact HTTP endpoints and sample payloads
- data model (DB tables & column explanations) for key services
- security considerations and secrets map for each entity

Tell me which of those you'd like next and I will update this doc accordingly.
