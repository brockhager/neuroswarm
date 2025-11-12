# 📝 NeuroSwarm Project Kanban

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

### Observability & Ops
- [ ] Add structured logs, metrics, tracing IDs  
- [ ] Build dashboards (Prometheus/Grafana)  
- [ ] Package services into Docker images with config toggles  
- [ ] Write operator/developer guides and quickstarts  

```markdown
# 📝 NeuroSwarm Centralized Kanban

## Backlog
- [ ] Define objectives, roles, and success criteria  
- [ ] Write ADRs for on‑chain/off‑chain split  
- [ ] Document user stories  

### On‑Chain Core (neuro-program)
- [ ] Design Solana account schemas  
- [ ] Implement Anchor instructions  
- [ ] Emit structured events/logs  
- [ ] Write unit + integration tests  

### Shared Contracts (neuro-shared)
- [ ] Build schemas + codegen  
- [ ] Implement PDA seed rules  
- [ ] Publish npm package  
- [ ] Add CI check for generated files  

### Services Layer (neuro-services)
- [ ] Add CI pipeline  
- [ ] Write Dockerfile(s)  
- [ ] Deployment scripts (docker-compose, k8s)  
- [ ] Gateway API implementation  
- [ ] Indexer event ingestion  
- [ ] Documentation (README, operator guide)  

### Web NS Node (neuro-web)
- [ ] Build React UI (chat + provenance panel)  
- [ ] Integrate Gateway APIs  
- [ ] Surface on‑chain provenance  
- [ ] Add local cache/index  
- [ ] Write UI integration tests  

### Infra (neuro-infra)
- [ ] Bootstrap script for local dev  
- [ ] Integration pipeline (e2e tests across repos)  
- [ ] Monitoring dashboards  
- [ ] CI/CD templates  

---

## In Progress
*(move items here as you start them)*

---

## Done
- [x] Create 5 repositories (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`, `neuro-infra`)

``` 
