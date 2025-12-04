# NeuroSwarm — Master Design Document

**Version**: 0.2.1 (December 2025)  
**Status**: Living document — reflects current implementation + future vision

This document defines NeuroSwarm's architecture, components, and vision. It bridges **what is built today** (local nodes, streaming LLM, Discord integration, block production) with **where we're headed** (Global Brain, decentralized knowledge sharing, personal AI economy, on-chain governance).

---

## Vision: The Global Brain

NeuroSwarm's mission is to build a **decentralized AI platform** where personal AI agents run locally on user devices and collaborate to form collective intelligence — the **Global Brain**.

**Core principles:**
- **Local-first AI**: Your data and models stay on your device; only validated contributions are shared
- **Verifiable knowledge**: All contributions are content-addressed (IPFS), validated by network consensus, and anchored on-chain (Solana)
- **Personal AI economy**: Contributors earn rewards (NST tokens) for useful work — training data, model improvements, validation
- **Transparency**: Audit trails, governance timelines, and blockchain anchoring ensure accountability

**Three-layer architecture:**
1. **Local agents** (ns-node clients) — personal AI running on user devices, learning locally
2. **Coordination layer** (gateway, VP nodes, ns-node server) — mempool, block production, consensus
3. **Global Brain** — aggregated, versioned knowledge base with provenance and confidence scores

---

## Current Implementation Status

✅ **What's Built (v0.2.x)**
- Core network: ns-node server (consensus), gateway (mempool), VP node (block production)
- NS-LLM: Local LLM wrapper with SSE streaming, Ollama integration, HTTP fallback
- Agent 9: Discord bot with streaming integration and source provenance
- Block anchoring: IPFS payload storage, optional Solana anchoring
- Governance: Timeline logging, admin RBAC, audit trails
- Development tooling: CI/CD, integration tests, OpenAPI contracts

🚧 **In Progress**
- Router API: JWT auth, RBAC, Postgres persistence, deterministic anchoring
- E2E testing: Cross-service contract validation
- Monitoring: Prometheus/Grafana dashboards

🔮 **Future Vision**
- Global Brain aggregation: Merge validated contributions into versioned manifests
- Proof-of-Useful-Work (PoUW): Reward contributors for validated training data and model deltas
- Validator economy: Staking, slashing, reputation, committee selection
- Personal AI marketplace: Users deploy and monetize custom agents
- Cross-chain anchoring: Multi-chain support for governance proofs

---

## Component Reference (Current + Planned)

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

## 2) Gateway Node (Admission / validation)
- Default port: 8080
- Purpose: Admission control for incoming transactions, mempool management and adapter integration for source validation.
- Expectations:
 	- Maximum throughput while preventing spam — per-IP and per-key rate limiting.
 	- Exposes mempool APIs for VP polling; provide requeue endpoints for reorg handling.
 	- External adapter integrations must be sandboxed and rate-limited.

## 3) VP Node (Validator / Block Producer)
- **Default port**: 4000
- **Status**: ✅ Implemented (T21) — polls mempool, produces blocks, signs headers, publishes to IPFS
- **Purpose**: Core consensus engine that produces blocks from validated transactions, computes merkle roots, and submits to canonical chain.
- **Current capabilities**:
	- Polls Gateway mempool at configurable intervals
	- Produces deterministic blocks with payloadCid and sourcesRoot
	- Signs block headers with validator key (Ed25519)
	- Publishes block payloads to IPFS (Helia/Kubo)
	- Submits blocks to ns-node for canonical chain recording
	- Health checks and metrics endpoints
- **Expectations**:
	- Deterministic block production in test environments
	- Resilient error handling with backoff when ns-node unavailable
	- Metrics: blocks produced, signing latency, IPFS publish time
	- Validator rotation support (future: committee-based consensus)
- **Future enhancements**:
	- Staking and slashing integration
	- Committee-based block proposal and voting
	- Reward distribution for block producers

## 4) NS-LLM (Local LLM wrapper / Inference service)
- Default port: 3015
- Purpose: Local AI inference layer that proxies to native binary or HTTP prototype (Ollama integration in CI/dev).
- Expectations:
	- Fast startup and clear health signals; `POST /api/generate` for text generation and `/api/embed` for embeddings.
	- Graceful fallback: if native binary missing, use the HTTP prototype.
	- Streaming support for token-by-token responses (SSE) where possible.
	- Low-latency (<200ms for simple queries on supported hardware) and CPU/GPU aware.

## 5) Router API (Public API + Anchoring Coordinator)
- **Default port**: 4001
- **Status**: 🚧 In development — auth and anchoring workflows being implemented
- **Purpose**: Public HTTP API for transaction ingestion, job coordination, and deterministic anchoring workflows (IPFS + Solana).
- **Planned capabilities**:
	- Accept authenticated requests with short-lived JWTs
	- RBAC middleware for admin/governance endpoints
	- Postgres persistence with safe migrations and rollback support
	- Deterministic audit hashing (canonical JSON → SHA256)
	- IPFS pinning pipeline (local Kubo + Pinata cloud backup)
	- On-chain anchoring to Solana (optional, when credentials present)
- **Expectations**:
	- Circuit breakers for external services (IPFS, Solana RPC)
	- Database health checks and connection pooling
	- Request/response correlation IDs for tracing
	- Comprehensive error handling and retry logic
- **Future enhancements**:
	- Multi-chain anchoring support (Ethereum, Polygon)
	- Decentralized Router API (distributed across validator nodes)
	- Request assignment and load balancing for validator clients

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
- **Type**: External integration (Discord bot)
- **Status**: ✅ Implemented — streaming integration with NS-LLM complete
- **Purpose**: Bi-directional chat gateway connecting Discord users to NeuroSwarm's AI capabilities
- **Current capabilities**:
	- Real-time streaming responses (SSE consumption from NS-LLM)
	- Progressive message editing as tokens arrive
	- Graceful fallback to synchronous generation when streaming fails
	- Channel-based routing and access control
	- Offline status notifications and resilience handling
- **Expectations**:
	- Secure token handling (environment variables, never committed)
	- Health monitoring and automatic restart on failure
	- Source provenance: cite sources when answering from verified knowledge
	- Rate limiting to prevent Discord API abuse
- **Future enhancements**:
	- Multi-agent conversations (Agent 3, Agent 7 collaboration)
	- IPFS attachment support for verified artifacts
	- Governance voting via Discord commands
	- Personal agent deployment (users can deploy custom bots)

## Operational Expectations (applies to all services)
- Health & readiness endpoints for orchestration and monitoring.
- Structured logs and context-enriched traces (request IDs, correlation ids).
- Prometheus metrics and Grafana dashboards with limit/alerting rules.
- CI gating: critical integration tests must be green before merge (ports & contract compatibility).
- Secrets management: all third-party keys (Pinata JWT, Solana ROUTER_PRIVATE_KEY, Discord tokens) are stored in secure secrets and never in the repo.


## Deployment Models & User Roles

NeuroSwarm supports multiple deployment models to serve different user types:

### 1. Personal AI User (Local-first)
**Goal**: Run your own AI assistant locally with privacy and personalization

**Minimum requirements**:
- Hardware: Modern laptop/desktop (8GB+ RAM, ideally GPU for local inference)
- Software: ns-node client (Electron or browser), Ollama (optional for local LLM)
- Network: Internet connection for consensus participation (optional: can run fully offline)

**What you run**:
- `ns-node` client — your personal AI agent and chat interface
- `NS-LLM` (optional) — local inference with Ollama models
- Discord bot (optional) — expose your agent via Discord

**What you get**:
- Private, local AI that learns from your usage
- Optional: contribute validated knowledge to Global Brain and earn NST rewards
- Full data sovereignty — your conversations never leave your device

### 2. Validator / Node Operator
**Goal**: Participate in consensus, earn staking rewards, help secure the network

**Minimum requirements**:
- Hardware: Server or VPS (16GB+ RAM, persistent storage, reliable uptime)
- Software: Docker, Node.js, Ollama (for validation tasks), monitoring tools
- Network: Static IP or domain, open ports for P2P communication
- Economic: Stake NST tokens (minimum threshold TBD)

**What you run**:
- `ns-node` server — canonical chain authority
- `gateway-node` — mempool and admission control
- `vp-node` — block production and IPFS publishing
- `Router API` (optional) — public API and anchoring coordinator
- Monitoring stack — Prometheus, Grafana, alerting

**What you get**:
- Block production rewards (proportional to stake and uptime)
- Validation rewards (PoUW for reviewing contributions)
- Governance voting rights
- Network reputation and slashing risk

### 3. Admin / Foundation Node
**Goal**: Maintain core infrastructure, governance, and bootstrap the network

**Additional requirements**:
- All validator requirements PLUS:
- Access to governance secrets (multisig keys, admin credentials)
- WordPress publisher access (for governance announcements)
- Solana wallet with anchoring credentials
- CI/CD pipeline access for releases

**What you run**:
- Full validator stack
- `admin-node` — governance UI and timeline management
- `alert-sink` — monitoring and alerting aggregation
- Blockchain anchoring services

**Responsibilities**:
- Emergency governance actions (slashing, upgrades)
- Release coordination and security updates
- Community support and dispute resolution
- Network health monitoring and intervention

### 4. Developer / Contributor
**Goal**: Build on NeuroSwarm, extend functionality, contribute code

**Requirements**:
- Development machine (any OS)
- Git, Node.js, pnpm, Docker
- Optional: Rust toolchain (for neuro-infra daemon), Python (for model training)

**What you run**:
- Local development environment (all services)
- Integration test harness
- CI/CD validation locally

**Resources**:
- [Contributor Guide](wiki/Development/Contributor-Guide.md)
- [Architecture Docs](wiki/Technical/Architecture.md)
- [API Contracts](NS-LLM/openapi.yaml)

---

## Future Vision: The Personal AI Economy

NeuroSwarm is building toward a **decentralized AI marketplace** where:

**For users**:
- Deploy custom AI agents trained on your personal data
- Monetize your agent's capabilities (sell access, subscriptions)
- Earn rewards for contributing valuable training data
- Maintain full control over privacy and data usage

**For developers**:
- Build and sell custom agent templates
- Create specialized adapters for domain expertise
- Earn royalties on agent deployments
- Integrate with existing applications via APIs

**For validators**:
- Earn staking rewards for consensus participation
- Get PoUW rewards for validating contributions
- Build reputation for governance influence
- Participate in protocol evolution

**Enabled by**:
- Content-addressed storage (IPFS) for reproducible artifacts
- Blockchain anchoring (Solana) for tamper-proof provenance
- Smart contracts for automated reward distribution
- On-chain governance for protocol upgrades

**Key innovations**:
- **Proof-of-Useful-Work (PoUW)**: Rewards for verified contributions (not just computation)
- **Federated learning**: Aggregate knowledge without centralizing raw data
- **Reputation system**: Stake, slashing, and quality scores drive trust
- **Versioned Global Brain**: Semantic versioning for knowledge base updates

---

## Technical Roadmap

### Phase 1: Foundation (Current) ✅
- Core network services operational
- Local LLM integration with streaming
- Basic consensus and block production
- Integration testing and CI/CD

### Phase 2: Hardening (Q1 2026) 🚧
- Router API security and anchoring
- E2E test coverage across services
- Production monitoring and alerting
- Performance optimization and caching

### Phase 3: Global Brain MVP (Q2-Q3 2026) 🔮
- Contribution submission and validation
- Confidence scoring and attestations
- Basic aggregation and manifest generation
- Initial PoUW reward distribution

### Phase 4: Decentralization (Q4 2026+) 🔮
- Validator staking and committee selection
- Slashing and reputation system
- On-chain governance with voting
- Multi-chain anchoring support

### Phase 5: Personal AI Economy (2027+) 🔮
- Custom agent deployment marketplace
- Subscription and monetization framework
- Advanced federated learning
- Cross-agent collaboration protocols

---

## Related Documentation

**Architecture & Design**:
- [System Overview](wiki/System-Overview/README.md)
- [Technical Architecture](wiki/Technical/Architecture.md)
- [Global Brain Design](wiki/Technical/GLOBAL-BRAIN.md)
- [Data Flow](wiki/Technical/data-flow-architecture.md)

**Developer Resources**:
- [Contributor Guide](wiki/Development/Contributor-Guide.md)
- [Contributor Onboarding](wiki/Development/Contributor-Onboarding.md)
- [Task List](wiki/NEUROSWARM_LAUNCH/task-list-2.md)
- [Port Configuration](wiki/Ports.md)

**Governance & Economics**:
- [Governance](wiki/Governance/GOVERNANCE.md)
- [Tokenomics](wiki/Governance/TOKENOMICS.md)
- [Validator Guide](wiki/Governance/Validator-Guide.md)
- [Security & Trust](wiki/SECURITY-TRUST.md)

**Operations**:
- [Deployment Guide](wiki/NS-LLM/DEPLOYMENT.md)
- [Monitoring](wiki/Performance/Performance-Scalability-Walkthrough.md)
- [Troubleshooting](wiki/Troubleshooting.md)

---

*Last updated: December 3, 2025*  
*Document maintainer: Foundation Team*  
*Feedback: Submit issues or PRs to improve this document*
