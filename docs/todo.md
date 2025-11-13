# 📝 NeuroSwarm Project Kanban

## In Progress
- [ ] [neuro-web] Real-World Governance Activation (bootstrap proposals, community launch, docs finalization)

## Backlog (to be done)

### 1. Shared Contracts (foundation)
1. [neuro-shared] Build schemas (TS + Rust codegen)  
2. [neuro-shared] Implement PDA seed rules and constants  
3. [neuro-shared] Publish npm package for shared types  
4. [neuro-shared] Add CI check to ensure generated files are up to date  

### 2. On‑Chain Core (depends on Shared Contracts)
1. [neuro-program] Design Solana program account schemas (Manifest, Attestation, Validator, Governance)  
2. [neuro-program] Implement Anchor program instructions (init, attest, finalize, reject, update_validator, update_governance)  
3. [neuro-program] Emit structured events/logs for off‑chain ingestion  
4. [neuro-program] Write unit + integration tests on devnet/localnet  

### 3. Services Layer
1. [neuro-services] Scaffold Gateway service (API, cache, rate limiting, audit logs)  
2. [neuro-services] Scaffold Indexer service (event ingestion, catalog builder, search APIs)  
3. [neuro-services] Implement storage adapters (IPFS client, SQLite/LevelDB)  
4. [neuro-services] Add metrics/logging and role toggles (gateway-only, indexer-only)  
5. [neuro-services] Write service unit tests  

### 4. Web NS Node
1. [neuro-web] Build React UI (chat, provenance panel, role toggles, peer connect)  
2. [neuro-web] Integrate with Gateway APIs and Indexer search  
3. [neuro-web] Surface on‑chain provenance (CID, tx signature, slot, confidence)  
4. [neuro-web] Add local cache/index (browser storage or lightweight backend)  
5. [neuro-web] Write UI integration tests  
6. [neuro-web] Build GUI (desktop/web UI for sync progress, provenance panel, peers list, role toggles, search, settings)  

### 5. Networking & Sync
1. [neuro-infra] Implement NS Node peer sync (WebRTC/WebSockets)  
   - [ ] DNS seeds  
   - [ ] Static peers  
   - [ ] QUIC transport  
   - [ ] Handshake/versioning  
   - [ ] Banlist/reputation  
2. [neuro-infra] Add reconcile loops for Gateway/Indexer vs Solana state  
3. [neuro-infra] Handle stale state markers, retries, reorgs  

### 6. Security & Governance
1. [neuro-program] Implement validator registry workflow (activation/suspension)  
2. [neuro-services] Add API auth (keys/signatures), RBAC, rate limits  
3. [neuro-program] Add governance flags (pause, thresholds, weighting model)  
4. [neuro-infra] Document threat model and run security tests  

### 7. NS Node (Binary/Daemon)
1. [ ] [neuro-infra] Create installers and Docker (cross-compiled binaries, packages, Docker image)  
2. [ ] [neuro-infra] Implement snapshots and bootstrap (signed catalogs, downloader, integrity verification)  
3. [ ] [neuro-infra] Conduct E2E and failure drills (integration tests, chaos tests)  
4. [ ] [neuro-infra] Write docs and release (operator, validator, developer guides; reproducible bootstrap)

### 8. Portal Implementation MVP
**✅ Frontend (neuro-web)**: Next.js app with Tailwind CSS, portal layout, badge display, dashboard, learning paths, and Solana wallet integration  
**Backend (neuro-program)**: Solana attestation integration for confidence scoring of docs and contributions  
**Community Hub**: Basic forum threads + mentorship matching prototype  
**Search & Discovery**: Initial AI-powered search across playbooks, governance docs, and living documentation  
**Observability**: Metrics for portal usage, contributor progression, and voting participation

### 9. Real-World Governance Activation
**🗳️ Governance Bootstrapping**
- [x] [proposal] Draft roadmap priorities
- [x] [proposal] Working group formation
- [ ] [vote] Quorum validation test
- [ ] [announcement] Governance launch draft

**📢 Community Scaling**
- [ ] [onboarding] Sprint kickoff plan
- [ ] [badge] Incentive design
- [ ] [event] Governance demo call

**📁 Documentation & Transparency**
- [ ] [docs] voting.md finalization
- [ ] [docs] Quickstart guide
- [ ] [logs] Transparency record schema

**🚀 Ecosystem Growth**
- [ ] [outreach] Contributor campaign
- [ ] [seo] Metadata + discoverability
- [ ] [enterprise] Adoption deck

### 10. Website Development & Launch
**🏗️ Website Infrastructure Setup**
- [ ] Set up Next.js 14 project in `/neuroswarm/website/` with TypeScript and Tailwind CSS
- [ ] Configure deployment pipeline for getblockchain.tech/neuroswarm
- [ ] Set up CI/CD with automated builds and deployments
- [ ] Implement SEO optimization and meta tags
- [ ] Add analytics tracking (Google Analytics, custom events)

**🎨 Design & Branding**
- [ ] Create NeuroSwarm brand guidelines and color palette
- [ ] Design homepage hero section with value proposition
- [ ] Build responsive navigation and footer components
- [ ] Create consistent typography and spacing system
- [ ] Design key page layouts (About, Governance, Docs, Community)

**📄 Content Creation**
- [ ] Write homepage copy explaining NeuroSwarm's mission and value
- [ ] Create "What is NeuroSwarm" section with clear explanations
- [ ] Build governance portal integration and voting guides
- [ ] Write technical documentation landing pages
- [ ] Create community and contributor onboarding content

**🔧 Core Pages & Features**
- [ ] Homepage with hero, features, and call-to-actions
- [ ] About page explaining the vision and technology
- [ ] Governance page linking to portal.neuroswarm.ai/governance
- [ ] Documentation hub with links to docs.neuroswarm.ai
- [ ] Community page with Discord, forum, and social links
- [ ] Blog/news section for announcements and updates

**🚀 Portal Integration**
- [ ] Embed governance portal iframe or redirect system
- [ ] Add voting status widgets and proposal previews
- [ ] Implement wallet connection prompts and badge displays
- [ ] Create contributor dashboard integration
- [ ] Add real-time governance metrics and statistics

**📱 Mobile & Performance**
- [ ] Ensure full mobile responsiveness across all pages
- [ ] Optimize images and assets for fast loading
- [ ] Implement lazy loading and code splitting
- [ ] Add PWA capabilities for offline access
- [ ] Test cross-browser compatibility

**🔒 Security & Compliance**
- [ ] Implement HTTPS and security headers
- [ ] Add rate limiting and DDoS protection
- [ ] Set up monitoring and error tracking
- [ ] Ensure GDPR compliance for user data
- [ ] Add content security policies

**📊 Analytics & Optimization**
- [ ] Set up conversion tracking for key actions
- [ ] Implement A/B testing framework
- [ ] Add user feedback and survey systems
- [ ] Create performance monitoring dashboards
- [ ] Set up automated testing and quality assurance

**🚀 Launch & Marketing**
- [ ] Create launch announcement and press kit
- [ ] Set up social media profiles and branding
- [ ] Build email newsletter signup and automation
- [ ] Create promotional graphics and video content
- [ ] Plan community launch event and AMA sessions

## Done
- [x] Create 6 repositories (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`, `neuro-infra`, `neuroswarm`)
- [x] [neuro-infra] Define node spec (roles, modes, RPC surface, config schema, message types)
- [x] [neuro-infra] Initialize daemon skeleton, CLI, and config loader
- [x] [neuro-infra] Implement peer networking MVP (DNS seeds, static peers, QUIC transport, handshake)
- [x] [neuro-infra] Build local storage + index (catalog DB, artifact cache, IPFS pin/unpin)
- [x] [neuro-infra] Set up distribution & install (binaries for Linux/macOS/Windows, packages, Docker, first run wizard)
- [x] [neuro-program + neuro-infra] Integrate Solana anchoring (verify manifests/attests, cache provenance)
- [x] [neuro-infra] Enhance security & trust (Ed25519 keys, TLS/Noise transport, verification, hardening)
- [x] [neuro-services] Add observability (Prometheus metrics, Grafana dashboards, monitoring stack)
- [x] [neuro-services] Implement Gateway API (local HTTP/GraphQL endpoints, auth, audit logs)
- [x] [neuro-services] Add Indexer integration (event ingestion, faceted search, lineage graphs)
- [x] [neuro-infra] Complete CLI commands (`nsd start/stop/status`, `ns peer add/list/ban`, `ns prune`, `ns snapshot`)
- [x] [neuro-infra] Implement operating modes (standalone offline, peer-only, anchored, light client, validator node; config flags + runtime switching)
- [x] [docs] Create contributor playbooks (adding validator, extending indexer, writing tests)
- [x] [docs] Establish contributor recognition & governance framework
- [x] [docs] Build community scaling resources (workshop templates, code of conduct)
- [x] [docs] Organize governance documentation in dedicated directory
- [x] [docs] Create governance charter & decision framework
- [x] [docs] Establish living documentation processes
- [x] [docs] Create knowledge base & contributor portal  
