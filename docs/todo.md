# 📝 NeuroSwarm Project Kanban

## In Progress
- [ ] Initialize daemon skeleton, CLI, and config loader

## Backlog (to be done)
- [ ] Define objectives, roles (NS Node, Gateway, Indexer, Validators), and success criteria  
- [ ] Write Architecture Decision Records (ADRs) for on‑chain/off‑chain split, trust boundaries, and failure modes  
- [ ] Document user stories (operator, validator, contributor, reader)  

### On‑Chain Core
- [ ] Design Solana program account schemas (Manifest, Attestation, Validator, Governance)  
- [ ] Implement Anchor program instructions (init, attest, finalize, reject, update_validator, update_governance)  
- [ ] Emit structured events/logs for off‑chain ingestion  
- [ ] Write unit + integration tests on devnet/localnet  

### Shared Contracts
- [ ] Build `neuro-shared` schemas (TS + Rust codegen)  
- [ ] Implement PDA seed rules and constants  
- [ ] Publish npm package for shared types  
- [ ] Add CI check to ensure generated files are up to date  

### Services Layer
- [ ] Scaffold Gateway service (API, cache, rate limiting, audit logs)  
- [ ] Scaffold Indexer service (event ingestion, catalog builder, search APIs)  
- [ ] Implement storage adapters (IPFS client, SQLite/LevelDB)  
- [ ] Add metrics/logging and role toggles (gateway-only, indexer-only)  
- [ ] Write service unit tests  

### Web NS Node
- [ ] Build React UI (chat, provenance panel, role toggles, peer connect)  
- [ ] Integrate with Gateway APIs and Indexer search  
- [ ] Surface on‑chain provenance (CID, tx signature, slot, confidence)  
- [ ] Add local cache/index (browser storage or lightweight backend)  
- [ ] Write UI integration tests  

### Networking & Sync
- [ ] Implement NS Node peer sync (WebRTC/WebSockets)  
- [ ] Add reconcile loops for Gateway/Indexer vs Solana state  
- [ ] Handle stale state markers, retries, reorgs  

### Security & Governance
- [ ] Implement validator registry workflow (activation/suspension)  
- [ ] Add API auth (keys/signatures), RBAC, rate limits  
- [ ] Add governance flags (pause, thresholds, weighting model)  
- [ ] Document threat model and run security tests  

### NS Node (Binary/Daemon)
- [ ] Initialize daemon skeleton, CLI, and config loader
- [ ] Implement peer networking MVP (DNS seeds, static peers, QUIC transport, handshake)
- [ ] Build local storage + index (catalog DB, artifact cache, IPFS pin/unpin)
- [ ] Develop sync engine (initial sync, resumable, incremental updates)
- [ ] Integrate Solana anchoring (verify manifests/attests, cache provenance)
- [ ] Implement Gateway API (local HTTP/GraphQL endpoints, auth, audit logs)
- [ ] Add Indexer integration (event ingestion, faceted search, lineage graphs)
- [ ] Complete CLI commands (`nsd start/stop/status`, `ns peer add/list/ban`, `ns prune`, `ns snapshot`)
- [ ] Add GUI (optional desktop UI for sync progress, provenance, search, settings)
- [ ] Implement operating modes (standalone offline, peer-only, anchored, light client, validator node)
- [ ] Set up distribution & install (binaries for Linux/macOS/Windows, packages, Docker, first run wizard)
- [ ] Enhance security & trust (Ed25519 keys, TLS/Noise transport, verification, hardening)
- [ ] Add GUI (optional first-pass: sync progress, peers list, provenance viewer)
- [ ] Implement operating modes (config flags for standalone/light/anchored)
- [ ] Add observability (logs, metrics, Prometheus exporter, tracing IDs)
- [ ] Create installers and Docker (cross-compiled binaries, packages, Docker image)
- [ ] Implement snapshots and bootstrap (signed catalogs, downloader, integrity verification)
- [ ] Conduct E2E and failure drills (integration tests, chaos tests)
- [ ] Write docs and release (operator, validator, developer guides; reproducible bootstrap)

## Done
- [x] Create 5 repositories (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`, `neuro-infra`)
- [x] Define node spec (roles, modes, RPC surface, config schema, message types) 
