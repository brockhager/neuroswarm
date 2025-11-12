# 📝 NeuroSwarm Project Kanban

## In Progress
- [ ] [neuro-infra] Set up distribution & install (binaries for Linux/macOS/Windows, packages, Docker, first run wizard)

## Backlog (to be done)

- [ ] [neuro-infra] Define objectives, roles (NS Node, Gateway, Indexer, Validators), and success criteria  
- [ ] [neuro-infra] Write Architecture Decision Records (ADRs) for on‑chain/off‑chain split, trust boundaries, and failure modes  
- [ ] [neuro-infra] Document user stories (operator, validator, contributor, reader)  

---

### 1. Shared Contracts (foundation)
1. [neuro-shared] Build schemas (TS + Rust codegen)  
2. [neuro-shared] Implement PDA seed rules and constants  
3. [neuro-shared] Publish npm package for shared types  
4. [neuro-shared] Add CI check to ensure generated files are up to date  

---

### 2. On‑Chain Core (depends on Shared Contracts)
1. [neuro-program] Design Solana program account schemas (Manifest, Attestation, Validator, Governance)  
2. [neuro-program] Implement Anchor program instructions (init, attest, finalize, reject, update_validator, update_governance)  
3. [neuro-program] Emit structured events/logs for off‑chain ingestion  
4. [neuro-program] Write unit + integration tests on devnet/localnet  

---

### 3. Services Layer
1. [neuro-services] Scaffold Gateway service (API, cache, rate limiting, audit logs)  
2. [neuro-services] Scaffold Indexer service (event ingestion, catalog builder, search APIs)  
3. [neuro-services] Implement storage adapters (IPFS client, SQLite/LevelDB)  
4. [neuro-services] Add metrics/logging and role toggles (gateway-only, indexer-only)  
5. [neuro-services] Write service unit tests  

---

### 4. Web NS Node
1. [neuro-web] Build React UI (chat, provenance panel, role toggles, peer connect)  
2. [neuro-web] Integrate with Gateway APIs and Indexer search  
3. [neuro-web] Surface on‑chain provenance (CID, tx signature, slot, confidence)  
4. [neuro-web] Add local cache/index (browser storage or lightweight backend)  
5. [neuro-web] Write UI integration tests  
6. [neuro-web] Build GUI (desktop/web UI for sync progress, provenance panel, peers list, role toggles, search, settings)  

---

### 5. Networking & Sync
1. [neuro-infra] Implement NS Node peer sync (WebRTC/WebSockets)  
   - [ ] DNS seeds  
   - [ ] Static peers  
   - [ ] QUIC transport  
   - [ ] Handshake/versioning  
   - [ ] Banlist/reputation  
2. [neuro-infra] Add reconcile loops for Gateway/Indexer vs Solana state  
3. [neuro-infra] Handle stale state markers, retries, reorgs  

---

### 6. Security & Governance
1. [neuro-program] Implement validator registry workflow (activation/suspension)  
2. [neuro-services] Add API auth (keys/signatures), RBAC, rate limits  
3. [neuro-program] Add governance flags (pause, thresholds, weighting model)  
4. [neuro-infra] Document threat model and run security tests  

---

### 7. NS Node (Binary/Daemon)
1. [neuro-program + neuro-infra] Integrate Solana anchoring (verify manifests/attests, cache provenance)
5. [neuro-services] Implement Gateway API (local HTTP/GraphQL endpoints, auth, audit logs)  
6. [neuro-services] Add Indexer integration (event ingestion, faceted search, lineage graphs)  
7. [neuro-infra] Complete CLI commands (`nsd start/stop/status`, `ns peer add/list/ban`, `ns prune`, `ns snapshot`)  
8. [neuro-infra] Implement operating modes (standalone offline, peer-only, anchored, light client, validator node; config flags + runtime switching)  
9. [neuro-infra] Set up distribution & install (binaries for Linux/macOS/Windows, packages, Docker, first run wizard)  
10. [neuro-infra] Enhance security & trust (Ed25519 keys, TLS/Noise transport, verification, hardening)  
11. [neuro-infra] Add observability (logs, metrics, Prometheus exporter, tracing IDs)  
12. [neuro-infra] Create installers and Docker (cross-compiled binaries, packages, Docker image)  
13. [neuro-infra] Implement snapshots and bootstrap (signed catalogs, downloader, integrity verification)  
14. [neuro-infra] Conduct E2E and failure drills (integration tests, chaos tests)  
15. [neuro-infra] Write docs and release (operator, validator, developer guides; reproducible bootstrap)  

---

## Done
- [x] Create 6 repositories (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`, `neuro-infra`, `neuroswarm`)
- [x] [neuro-infra] Define node spec (roles, modes, RPC surface, config schema, message types)
- [x] [neuro-infra] Initialize daemon skeleton, CLI, and config loader
- [x] [neuro-infra] Implement peer networking MVP (DNS seeds, static peers, QUIC transport, handshake)
- [x] [neuro-infra] Build local storage + index (catalog DB, artifact cache, IPFS pin/unpin)
- [x] [neuro-infra] Implement operating modes (standalone offline, peer-only, anchored, light client, validator node; config flags + runtime switching)
- [x] [neuro-program + neuro-infra] Integrate Solana anchoring (verify manifests/attests, cache provenance)  
