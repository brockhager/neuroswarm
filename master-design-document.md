# NeuroSwarm — Master Design Document (High-level components & expectations)

This file captures the canonical list of runtime components used across the local and deployed NeuroSwarm topology and the product-level expectations you (the operator) have for each.

Each component entry below contains a short category label, expected default ports (local dev), reliability, observability, security, and developer notes for what 'good' looks like in production.

---

## 1) ns-node (chatbot,  UI,  sending data to gateway)
- Default port: 3009
- Purpose: Canonical chain authority — validates blocks, applies consensus, enforces canonical history and reorgs.
- Expectations:
	- Highly available in local dev, deterministic in test harnesses.
	- Health check and metrics: /health, /metrics endpoints.
	- Robust reorg handling: replay and requeue removed transactions to gateway.
	- Logging: structured logs and audit trail of governance actions.
	- Security: must enforce RBAC for governance endpoints; sign all produced headers.

## 2) NS-LLM (Local LLM wrapper / Inference service)
- Default port: 3015
- Purpose: Local AI inference layer that proxies to native binary or HTTP prototype (Ollama integration in CI/dev).
- Expectations:
	- Fast startup and clear health signals; `POST /api/generate` for text generation and `/api/embed` for embeddings.
	- Graceful fallback: if native binary missing, use the HTTP prototype.
	- Streaming support for token-by-token responses (SSE) where possible.
	- Low-latency (<200ms for simple queries on supported hardware) and CPU/GPU aware.

## 3) Router API (Gateway for transactions and anchors)
- Default port: 4001
- Purpose: Public HTTP API for ingestion (txs), job coordination, and anchoring workflows (IPFS + optional on-chain anchors).
- Expectations:
	- Resilient to transient network errors, circuit-breakers for external services (IPFS, Solana RPC).
	- Secure: accept requests with short-lived JWTs and enforce RBAC for admin endpoints.
	- Migrations and safe-rollbacks for `POSTGRES` deployments; health checks for the DB.
	- Audit anchoring: deterministic canonical JSON + sha256 audit hash, IPFS pinning, and verified on-chain anchoring when credentials are present.

## 4) Gateway Node (Admission / validation)
- Default port: 8080
- Purpose: Admission control for incoming transactions, mempool management and adapter integration for source validation.
- Expectations:
	- Maximum throughput while preventing spam — per-IP and per-key rate limiting.
	- Exposes mempool APIs for VP polling; provide requeue endpoints for reorg handling.
	- External adapter integrations must be sandboxed and rate-limited.

## 5) VP Node (Validator / Publisher, Core Brain, Consensus)
- Default port: 4000
- Purpose: Produce blocks from the mempool, compute payloadCid, sourcesRoot and sign headers for consensus submission.
- Expectations:
	- Deterministic block production under test conditions.
	- Proper rate limiting and backoff when NS-node is unavailable.
	- Metrics for production rate, block size, and signing latency.

## 6) neuro-services / neuro-runner (Application services)
- Default ports: 3007 (services), 3008 (runner)
- Purpose: Business logic & runner tasks (billing, reconciliation, adapters, task orchestration).
- Expectations:
	- Clear separation of responsibilities (API vs background runner).
	- Idempotent job processing and durable metrics for retries.
	- CI coverage for race conditions and timing-sensitive logic.

## 7) neuro-web / admin-node / alert-sink (UI & ops)
- Default ports: 3005 (neuro-web), 3000 (admin-node), 3010 (alert-sink)
- Purpose: Public UI, governance/admin, and alert ingestion/processing.
- Expectations:
	- RBAC in admin UI for governance actions.
	- Instrumented dashboards (Prometheus/Grafana) for quick triage.
	- Alert sink durable storage (JSONL audit) and test hooks for smoke notifications.

## 8) IPFS / Storage / Postgres
- Ports: 5001 (IPFS API), 5433 (local Postgres mapping)
- Purpose: IPFS for payload storage and Postgres for Router API persistence.
- Expectations:
	- IPFS: both local Kubo and cloud pinning options (Pinata) supported with authenticated uploads.
	- Postgres: migrations must be safe and idempotent; schema versioning and CI database checks.

## 9) Agent 9 — Discord Integration Bot
- Type: External integration (Discord bot)
- Purpose: Bi-directional chat gateway to the NeuroSwarm network (connects to NS-LLM)
- Expectations:
	- Runs as a persistent process with secure token handling (never committed to git).
	- Health checks / watchdog to alert when offline.
	- Clear source-of-truth: answers should include provenance/sources when available.

## Operational Expectations (applies to all services)
- Health & readiness endpoints for orchestration and monitoring.
- Structured logs and context-enriched traces (request IDs, correlation ids).
- Prometheus metrics and Grafana dashboards with limit/alerting rules.
- CI gating: critical integration tests must be green before merge (ports & contract compatibility).
- Secrets management: all third-party keys (Pinata JWT, Solana ROUTER_PRIVATE_KEY, Discord tokens) are stored in secure secrets and never in the repo.


## Deployment Roles & Minimum Requirements

These short role descriptions explain what components must run where in the common local and managed deployments:

- **Admin / Operator**
	- Typical responsibilities: run & manage the control plane (Router API, NS-Node, VP Node), keep the LLM/proxy, and operate infrastructure.
	- Minimum software: Ollama (or equivalent LLM runtime), Docker (for Postgres/containers), ns-node (for local testing), and monitoring (Prometheus/Grafana).
	- Privileges: Admins require access to secrets (Pinata JWT, Solana ROUTER_PRIVATE_KEY, DB credentials) and must follow secure key management.
    - Admins will run OLLAMA, Docker, and other required software. 

- **Client / End-user**
	- Typical responsibilities: run a lightweight node and use the web UI for interaction with the network.
	- Minimum software: `ns-node` (the local client/brain) and a modern web browser for the web UI.
	- Notes: client installations should not require LLM binaries, Docker, or privileged infrastructure credentials.

---

If you want, I can now:
- Start a small E2E smoke script that validates health endpoints for the major components on the machine (ns-node, router-api, ns-llm, gateway, postgres).  
- Add this `Components & Expectations` section into the top-level README and/or generate a printable checklist you can use to verify new developer environments.
