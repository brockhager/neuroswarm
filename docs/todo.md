# 📝 NeuroSwarm Project Kanban

## In Progress
- [ ] [neuro-infra] Initialize daemon skeleton, CLI, and config loader

## Backlog (to be done)
- [ ] [neuro-infra] Define objectives, roles (NS Node, Gateway, Indexer, Validators), and success criteria  
- [ ] [neuro-infra] Write Architecture Decision Records (ADRs) for on‑chain/off‑chain split, trust boundaries, and failure modes  
- [ ] [neuro-infra] Document user stories (operator, validator, contributor, reader)  

### On‑Chain Core
- [ ] [neuro-program] Design Solana program account schemas (Manifest, Attestation, Validator, Governance)  
- [ ] [neuro-program] Implement Anchor program instructions (init, attest, finalize, reject, update_validator, update_governance)  
- [ ] [neuro-program] Emit structured events/logs for off‑chain ingestion  
- [ ] [neuro-program] Write unit + integration tests on devnet/localnet  

### Shared Contracts
- [ ] [neuro-shared] Build schemas (TS + Rust codegen)  
- [ ] [neuro-shared] Implement PDA seed rules and constants  
- [ ] [neuro-shared] Publish npm package for shared types  
- [ ] [neuro-shared] Add CI check to ensure generated files are up to date  

### Services Layer
- [ ] [neuro-services] Scaffold Gateway service (API, cache, rate limiting, audit logs)  
- [ ] [neuro-services] Scaffold Indexer service (event ingestion, catalog builder, search APIs)  
- [ ] [neuro-services] Implement storage adapters (IPFS client, SQLite/LevelDB)  
- [ ] [neuro-services] Add metrics/logging and role toggles (gateway-only, indexer-only)  
- [ ] [neuro-services] Write service unit tests  

### Web NS Node
- [ ] [neuro-web] Build React UI (chat, provenance panel, role toggles, peer connect)  
- [ ] [neuro-web] Integrate with Gateway APIs and Indexer search  
- [ ] [neuro-web] Surface on‑chain provenance (CID, tx signature, slot, confidence)  
- [ ] [neuro-web] Add local cache/index (browser storage or lightweight backend)  
- [ ] [neuro-web] Write UI integration tests  

### Networking & Sync
- [ ] [neuro-infra] Implement NS Node peer sync (WebRTC/WebSockets)  
- [ ] [neuro-infra] Add reconcile loops for Gateway/Indexer vs Solana state  
- [ ] [neuro-infra] Handle stale state markers, retries, reorgs  

### Security & Governance
- [ ] [neuro-program] Implement validator registry workflow (activation/suspension)  
- [ ] [neuro-services] Add API auth (keys/signatures), RBAC, rate limits  
- [ ] [neuro-program] Add governance flags (pause, thresholds, weighting model)  
- [ ] [neuro-infra] Document threat model and run security tests  

### NS Node (Binary/Daemon)
- [ ] [neuro-infra] Initialize daemon skeleton, CLI, and config loader  
- [ ] [neuro-infra] Implement peer networking MVP (DNS seeds, static peers, QUIC transport, handshake)  
- [ ] [neuro-infra] Build local storage + index (catalog DB, artifact cache, IPFS pin/unpin)  
- [ ] [neuro-infra] Develop sync engine (initial sync, resumable, incremental updates)  
- [ ] [neuro-program] Integrate Solana anchoring (verify manifests/attests, cache provenance)  
- [ ] [neuro-services] Implement Gateway API (local HTTP/GraphQL endpoints, auth, audit logs)  
- [ ] [neuro-services] Add Indexer integration (event ingestion, faceted search, lineage graphs)  
- [ ] [neuro-infra] Complete CLI commands (`nsd start/stop/status`, `ns peer add/list/ban`, `ns prune`, `ns snapshot`)  
- [ ] [neuro-web] Add GUI (optional desktop UI for sync progress, provenance, search, settings)  
- [ ] [neuro-infra] Implement operating modes (standalone offline, peer-only, anchored, light client, validator node)  
- [ ] [neuro-infra] Set up distribution & install (binaries for Linux/macOS/Windows, packages, Docker, first run wizard)  
- [ ] [neuro-infra] Enhance security & trust (Ed25519 keys, TLS/Noise transport, verification, hardening)  
- [ ] [neuro-web] Add GUI (optional first-pass: sync progress, peers list, provenance viewer)  
- [ ] [neuro-infra] Implement operating modes (config flags for standalone/light/anchored)  
- [ ] [neuro-infra] Add observability (logs, metrics, Prometheus exporter, tracing IDs)  
- [ ] [neuro-infra] Create installers and Docker (cross-compiled binaries, packages, Docker image)  
- [ ] [neuro-infra] Implement snapshots and bootstrap (signed catalogs, downloader, integrity verification)  
- [ ] [neuro-infra] Conduct E2E and failure drills (integration tests, chaos tests)  
- [ ] [neuro-infra] Write docs and release (operator, validator, developer guides; reproducible bootstrap)  

## Done
- [x] [neuro-infra] Create 5 repositories (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`, `neuro-infra`)  
- [x] [neuro-infra] Define node spec (roles, modes, RPC surface, config schema, message types)  
