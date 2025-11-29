# System Overview

[← Wiki Home](../Index.md)

**Welcome to NeuroSwarm!** This page provides a comprehensive reference of all entities (services, components, data structures, and tools) in the NeuroSwarm ecosystem. Use this as your entry point to understand the system architecture.

## High-Level Architecture

NeuroSwarm is a decentralized architecture comprised of multiple services and coordination nodes. The Admin Node is the canonical governance node and is responsible for timeline logging, governance actions, and blockchain anchoring to provide tamper-evident proof of admin configuration.

**Key Components:**
- **Admin Node**: Express-based service that exposes admin routes, observability endpoints, and manages the governance timeline.
- **Indexer / Gateway Nodes**: Responsible for decentralized content indexing and discovery.
- **UI (Dashboard)**: Tools for founders, admins, and contributors to review and act on governance events.
- **Anchoring (Blockchain)**: Periodic anchoring of the governance timeline to a blockchain (e.g., Solana) to provide cryptographic evidence and audit trails.

**Quick Start:**
1. Install and run local services following the repository README
2. Use `admin-node` to serve a local admin dashboard; seed the timeline using scripts/seed-e2e-timeline.js
3. Use the observability endpoints to inspect the governance timeline and anchoring status

> Note: Running the core node services (ns-node, gateway-node, vp-node, neuro-services) does NOT require Python to be installed. Python is only required for optional admin tooling (WordPress publisher, content sync, model export/training) which now lives under `neuroswarm/admin-node/scripts/` and `neuroswarm/NS-LLM/training` respectively. This keeps everyday node operation simple and Node.js-only for most contributors.

**Technical References:**
- `docs/general/neuro-infra-README.md`
- `docs/admin/admin-node-design.md`
- `admin-node` service folder in the repository

---

## 🌐 Web Interfaces Overview

NeuroSwarm provides **two distinct web interfaces** serving different audiences and purposes. Understanding the difference is critical for contributors.

### `/ns/neuro-web/` — Ecosystem Portal
**Purpose**: Public-facing web interface for the broader NeuroSwarm ecosystem  
**Audience**: End-users, external contributors, and the general public  
**Role**: External visibility and ecosystem integration

**What it provides:**
- Landing pages and marketing content
- Contributor onboarding portals
- Public documentation browser
- Ecosystem-wide feature showcase
- External integration dashboards
- Community resources and links

**Use this when:**
- You're building public-facing content
- Creating landing pages or marketing materials
- Designing external contributor experiences
- Showcasing ecosystem-level features

---

### `ns/neuroswarm/ns-web/` — Internal Dashboard
**Purpose**: System-level operational dashboard for NeuroSwarm node infrastructure  
**Audience**: Developers, node operators, and internal contributors  
**Role**: Visualization and control surface for backend services

**What it provides:**
- **Consolidated System Dashboard** with navigation to:
  - Performance & Scalability metrics
  - Decentralized Governance controls
  - Plugin Manager interface
- Real-time node health monitoring
- Backend service orchestration controls
- Developer tools and debugging interfaces
- Internal API explorers

**Use this when:**
- You're operating a NeuroSwarm node
- Debugging backend services
- Monitoring system performance
- Managing plugins or governance
- Developing internal tooling

**Related**: See [System Visualization](../NS-LLM/Dashboard.md) for dashboard details

---

### Key Distinction

| Feature | `/ns/neuro-web/` | `ns/neuroswarm/ns-web/` |
|---------|------------------|-------------------------|
| **Scope** | Ecosystem-wide | Node-specific |
| **Audience** | External users | Internal operators |
| **Purpose** | Public visibility | Operational control |
| **Content** | Marketing, docs, community | Metrics, controls, debugging |
| **Examples** | Landing page, contributor portal | Performance dashboard, plugin manager |

**Both are complementary**: The ecosystem portal (`/ns/neuro-web/`) provides external visibility and onboarding, while the internal dashboard (`ns/neuroswarm/ns-web/`) provides operational control for those running nodes.

---

## 📦 Core Services (Nodes)

### NS-Node Client (User Interface)
**Locations**: 
- `neuroswarm/ns-node-desktop/` (Electron desktop app - NS-E)
- `neuroswarm/ns-node/public/` (Browser-based UI - NS-B)

**Ports**: 3000 (Electron), 3009 (Browser) — See [Port Configuration](../Ports.md)  
**Purpose**: User-facing chat interface for interacting with NeuroSwarm

The NS-Node Client is how **end users interact** with NeuroSwarm. It provides a chat interface for submitting queries, browsing history, and interacting with personal AI agents.

**Two Deployment Options:**
- **NS-E (Electron)**: Standalone desktop application with system tray integration
- **NS-B (Browser)**: Web-based interface accessed through a browser

**Key Responsibilities:**
- Chat interface for user queries
- Transaction submission forms
- Personal AI agent interaction
- DuckDuckGo search integration
- Learning service integration
- Local history and preferences

**Used For:**
- Daily interaction with NeuroSwarm
- Submitting data and queries
- Chatting with AI
- Personal AI assistant

**Related Docs**: [NS-Node Deployment Options](../Nodes/NS-Node/readme.md)

---

### Gateway Node (Anti-Spam Gateway)
**Location**: `neuroswarm/gateway-node/`  
**Port**: 8080 — See [Port Configuration](../Ports.md)  
**Purpose**: Entry point with spam protection and source validation

The Gateway Node is the **first line of defense** for the network. It validates incoming transactions, performs spam filtering, rate limiting, and maintains the canonical mempool before forwarding validated transactions to the consensus layer.

**Key Responsibilities:**
- Accept user transactions from clients
- **Spam filtering** (fee threshold, rate limiting)
- **Source validation** (Allie-AI adapter queries)
- Maintain **canonical mempool** (authoritative transaction queue)
- Rate limiting and DDoS protection
- Transaction canonicalization
- Forward validated transactions to VP nodes

**Used For:**
- Protecting the network from spam
- Validating external data sources
- Maintaining transaction queue
- Providing REST API for applications

**Data Flow:**
```
User → Gateway (validate, rate limit, spam filter) → Gateway Mempool → VP Node
```

**Related Docs**: [Gateway API](../API/Gateway-API.md) | [Data Flow](../Technical/data-flow-architecture.md)

---

### VP Node (Block Producer/Brain)
**Location**: `neuroswarm/vp-node/`  
**Port**: 3002 — See [Port Configuration](../Ports.md)  
**Purpose**: Block production, consensus, and IPFS publishing

The VP Node is the **core consensus engine** (the "brain"). It polls the Gateway mempool, produces blocks, validates them, and publishes to IPFS. This is where blocks are actually created and consensus happens.

**Key Responsibilities:**
- **Poll Gateway mempool** for validated transactions
- **Produce blocks** with merkle roots
- **Sign block headers** with validator key
- **Publish block payloads to IPFS** (content-addressed storage)
- **Submit blocks to NS Node** for canonical chain recording
- Validator coordination and consensus
- Earn validation rewards

**Used For:**
- Block production and consensus
- Participating as a network validator
- Earning staking rewards
- IPFS content publishing
- Network consensus coordination

**Data Flow:**
```
Gateway Mempool → VP Node (produce block, sign, IPFS publish) → NS Node (record to canonical chain)
```

**Related Docs**: [Validator Guide](../Governance/Validator-Guide.md) | [Staking](../Governance/Staking.md)

---

### NS-Server (Canonical Chain Authority)
**Location**: `neuroswarm/ns-node/server.js`  
**Port**: 3009 — See [Port Configuration](../Ports.md)  
**Purpose**: Canonical blockchain state and verification

The NS-Server maintains the **authoritative blockchain state**. It receives blocks from VP nodes, validates signatures and merkle roots, applies blocks to the canonical chain, and provides SPV proofs.

**Key Responsibilities:**
- Maintain **canonical blockchain** (blockMap, chain state)
- Validate block signatures and merkle roots
- Apply blocks to canonical chain
- **SPV proof generation** (cryptographic verification)
- Coordinate validator consensus
- Broadcast blocks to gateways and peers
- Handle chain reorganizations (reorgs)
- Provide blockchain query endpoints

**Used For:**
- Querying canonical chain state
- SPV proof verification
- Blockchain history
- Validator coordination
- Network state synchronization

**Data Flow:**
```
VP Node (blocks) → NS-Server (validate, apply to canonical chain) → Gateways (notify, sync)
```

**Related Docs**: [Node Design](../Nodes/NODE-DESIGN.md) | [Architecture](../Learning-Hub/Core-Concepts/Architecture.md)

---

### Admin Node
**Location**: `neuroswarm/admin-node/`  
**Port**: 3000 — See [Port Configuration](../Ports.md)  
**Purpose**: Dashboard, governance, and monitoring

The Admin Node provides a **visual interface** for monitoring network health, managing governance proposals, and observing real-time metrics.

**Key Responsibilities:**
- Real-time dashboard with metrics
- Governance proposal submission and voting
- Network monitoring and alerting
- Validator management
- Audit log visualization
- Plugin management UI

**Used For:**
- Monitoring network health
- Submitting governance proposals
- Viewing validator performance
- Managing plugins
- Accessing real-time analytics

**Related Docs**: [Dashboard](../Dashboard/README.md) | [Governance](../Learning-Hub/Core-Concepts/Governance.md)

---

### NS-LLM Service
**Location**: `neuroswarm/NS-LLM/`  
**Port**: 5555 — See [Port Configuration](../Ports.md)  
**Purpose**: Local AI inference and semantic operations

The NS-LLM service provides **local AI capabilities** using Ollama for semantic caching, content validation, and intelligent routing.

**Key Responsibilities:**
- Local LLM inference (via Ollama)
- Semantic cache similarity matching
- Content quality scoring
- Toxicity detection
- Coherence validation
- Dynamic threshold adjustment

**Used For:**
- Semantic search across transactions
- Content validation before admission
- Cache hit determination (similarity > 0.9)
- AI-powered governance scoring
- Natural language processing

**Related Docs**: [NS-LLM Integration](../NS-LLM/README.md) | [Semantic Cache](../Technical/Semantic-Cache.md)

---

### NS-Web Frontend
**Location**: `neuroswarm/ns-web/`  
**Port**: 3010  
**Purpose**: User-facing web interface

The NS-Web service is a **React-based frontend** that provides a user-friendly interface for interacting with the NeuroSwarm network.

**Key Responsibilities:**
- Transaction submission forms
- Block explorer UI
- Validator dashboard
- Governance voting interface
- Plugin marketplace
- Real-time metrics visualization

**Used For:**
- Submitting transactions via web UI
- Browsing blockchain history
- Voting on governance proposals
- Managing personal AI agents
- Installing plugins

**Related Docs**: [Web UI Guide](../Web/README.md)

---

## 🧩 Core Components

### PluginManager
**Location**: `ns-node/src/services/plugin-manager.js`  
**Purpose**: Dynamic plugin loading and execution

Manages the lifecycle of plugins (validators, scorers, visualizations). Loads plugins from the `plugins/` directory, validates manifests, and provides APIs for execution.

**Key Features:**
- Dynamic plugin discovery
- Version management (semver)
- Enable/disable plugin control
- Plugin execution sandboxing
- Manifest validation

**Used For:**
- Extending validation logic
- Custom scoring algorithms
- Dashboard widgets
- Community-contributed features

**Related Docs**: [Plugin Development](../Getting-Started/Home.md#-plugin-development) | [Starter Kits](../../plugins/)

---

### OrchestrationService
**Location**: `ns-node/src/services/orchestration.js`  
**Purpose**: Cross-node task coordination

Dispatches tasks to specific node types (NS, Gateway, VP) with routing strategies (random, broadcast, round-robin).

**Key Features:**
- Task dispatch by node type
- Routing strategy selection
- Load balancing across peers
- Failure handling and retries

**Used For:**
- Distributed computation
- Cross-node coordination
- Task distribution
- Network orchestration

**Related Docs**: [Architecture](../Learning-Hub/Core-Concepts/Architecture.md#6-cross-node-orchestration)

---

### ScoringConsensus
**Location**: `ns-node/src/services/scoring-consensus.js`  
**Purpose**: Distributed voting and consensus

Manages distributed voting for content quality, proposals, and validator actions.

**Key Features:**
- Create voting sessions
- Collect votes from validators
- Calculate consensus results
- Weighted voting by stake
- Quorum requirements

**Used For:**
- Governance proposal voting
- Content quality consensus
- Validator attestations
- Distributed decision-making

**Related Docs**: [Governance](../Learning-Hub/Core-Concepts/Governance.md)

---

### FederatedCacheService
**Location**: `ns-node/src/services/federated-cache.js`  
**Purpose**: Cross-node cache synchronization

Enables querying cached data across multiple nodes, with hit rate tracking and visualization.

**Key Features:**
- Federated query across nodes
- Cache hit rate metrics
- Visualization API
- Cross-node synchronization

**Used For:**
- Distributed caching
- Cache analytics
- Performance optimization
- Cross-node data sharing

**Related Docs**: [Federated Cache](../Technical/Federated-Cache.md)

---

### GenerativeGovernanceService
**Location**: `ns-node/src/services/generative-governance.js`  
**Purpose**: AI-powered content validation

Extensible validation system with toxicity detection, coherence scoring, and custom validators.

**Key Features:**
- Multi-layer validation pipeline
- Custom validator registration
- Governance parameter updates
- Validation chain history
- Event-driven architecture

**Used For:**
- Content quality enforcement
- Spam detection
- Governance rule validation
- AI-powered moderation

**Related Docs**: [Governance](../Learning-Hub/Core-Concepts/Governance.md)

---

### BlockchainAnchorService
**Location**: `ns-node/src/services/blockchain-anchor.js`  
**Purpose**: Solana blockchain integration

Anchors governance events and critical state to Solana blockchain for immutable provenance.

**Key Features:**
- Transaction submission to Solana
- State anchoring
- Verification against on-chain data
- Governance log immutability

**Used For:**
- Blockchain provenance
- Governance transparency
- Cryptographic verification
- Immutable audit trails

**Related Docs**: [Anchoring](../Anchoring/readme.md) | [Solana Program](../../neuro-program/)

---

### PerformanceProfiler
**Location**: `ns-node/src/services/performance-profiler.js`  
**Purpose**: Performance metrics and profiling

Tracks latency, throughput, TTFT (Time to First Token), resource usage, and generates performance scores.

**Key Features:**
- P50/P95/P99 latency tracking
- Throughput monitoring (req/s, tok/s)
- Resource profiling (CPU, memory)
- Bottleneck analysis
- Performance scoring (0-100)

**Used For:**
- Performance optimization
- Identifying bottlenecks
- Capacity planning
- SLA monitoring

**Related Docs**: [Performance Benchmarks](../Performance/Benchmark-Results.md)

---

### PeerManager
**Location**: `neuroswarm/shared/peer-discovery/index.js`  
**Purpose**: P2P peer discovery and health checks

Manages connections to other nodes, health checks, and maintains peer registries.

**Key Features:**
- Peer registration by type
- Health check heartbeats
- Peer metrics tracking
- Connection management
- Node type discovery

**Used For:**
- P2P networking
- Node discovery
- Health monitoring
- Network topology

**Related Docs**: [P2P Discovery](../Technical/P2P-Discovery.md)

---

### GovernanceLogger
**Location**: `neuroswarm/admin-node/services/governance-logger.js`  
**Purpose**: Immutable governance audit trail

Appends all governance actions to `wp_publish_log.jsonl` with cryptographic signatures.

**Key Features:**
- JSONL append-only log
- Cryptographic signing
- Timestamp verification
- Action provenance
- Blockchain anchoring

**Used For:**
- Governance transparency
- Audit trail verification
- Action history tracking
- Compliance logging

**Related Docs**: [Governance Timeline](../Governance/Timeline.md)

---

## 📊 Data Structures

### Transaction
**Purpose**: Unit of data submitted to the network

**Structure**:
```javascript
{
  txId: "unique-id",
  payload: {
    content: "...",
    timestamp: 1234567890,
    sources: [{ url, metadata }]
  },
  signature: "hex-signature",
  publicKey: "user-pubkey"
}
```

**Used For:**
- Submitting data to Global Brain
- Block production
- Validation and consensus
- Blockchain anchoring

---

### Block
**Purpose**: Container of validated transactions

**Structure**:
```javascript
{
  header: {
    blockNumber: 123,
    parentHash: "0x...",
    merkleRoot: "0x...",
    sourcesRoot: "0x...",
    payloadCid: "Qm...",
    validatorPubkey: "...",
    signature: "..."
  },
  transactions: [txId1, txId2, ...]
}
```

**Used For:**
- Canonical chain state
- Transaction immutability
- Validator attestation
- Consensus verification

---

### Manifest
**Purpose**: IPFS content metadata with provenance

**Structure**:
```javascript
{
  cid: "Qm...",
  creator: "pubkey",
  dataHash: "0x...",
  finalized: true,
  attestationCount: 5,
  timestamp: 1234567890
}
```

**Used For:**
- IPFS content addressing
- Provenance tracking
- Validator attestations
- Blockchain anchoring

---

### Governance Proposal
**Purpose**: Community decision-making

**Structure**:
```javascript
{
  id: "proposal-123",
  title: "Increase block size",
  type: "parameter-change",
  description: "...",
  creator: "pubkey",
  votes: { yes: 100, no: 20 },
  status: "active",
  expiresAt: 1234567890
}
```

**Used For:**
- Network parameter changes
- Validator actions
- Community voting
- Governance transparency

---

### Plugin Manifest
**Purpose**: Plugin metadata and configuration

**Structure**:
```javascript
{
  id: "custom-validator",
  name: "Custom Validator",
  version: "1.0.0",
  type: "validator",
  author: "...",
  enabled: true,
  config: { ... }
}
```

**Used For:**
- Plugin discovery
- Version management
- Configuration storage
- Dependency resolution

---

## 🛠️ Tools & Scripts

### Onboarding Scripts
**Location**: `neuroswarm/onboarding/`  
**Purpose**: Automated setup in < 5 minutes

**Scripts**:
- `onboard.ps1` (Windows PowerShell)
- `onboard.sh` (Linux/macOS Bash)

**Used For:**
- New contributor setup
- Docker Compose automation
- Health check validation
- Zero-to-running in 5 minutes

**Related Docs**: [Quick Setup](../onboarding/Quick-Setup.md)

---

### Connectivity Check
**Location**: `neuroswarm/scripts/checkNodeConnectivityClean.mjs`  
**Purpose**: Validate node connectivity

**Used For:**
- Verifying node health
- Testing API endpoints
- CI/CD validation
- Troubleshooting

---

### Benchmark Suite
**Location**: `neuroswarm/ns-node/benchmarks/`  
**Purpose**: Performance validation

**Scripts**:
- `inference_latency.js` - AI inference benchmarks
- `throughput_test.js` - Transaction throughput

**Used For:**
- Performance validation
- Regression detection
- Capacity planning
- SLA verification

**Related Docs**: [Benchmark Results](../Performance/Benchmark-Results.md)

---

### Anchoring Scripts
**Location**: `neuroswarm/governance/scripts/`  
**Purpose**: Blockchain anchoring automation

**Scripts**:
- `anchor-governance.ts` - Anchor governance logs
- `verify-governance.ts` - Verify on-chain anchors

**Used For:**
- Governance transparency
- Blockchain provenance
- Verification
- Audit compliance

---

### Package Scripts
**Location**: `neuroswarm/scripts/`  
**Purpose**: Build and packaging automation

**Scripts**:
- `package-bins.mjs` - Create standalone installers
- `publishUpdate.mjs` - Post updates to wiki/Discord

**Used For:**
- Binary distribution
- Update notifications
- Release automation
- Community communication

---

## 🗄️ Daemon (Rust)

### neuroswarm-node (nsd)
**Location**: `neuro-infra/`  
**Language**: Rust  
**Purpose**: High-performance P2P networking and storage

The Rust daemon provides low-level infrastructure for networking, storage, and consensus.

**Operating Modes**:
- **validator** - Anchoring and consensus (storage + network + Solana sync)
- **gateway** - API server for external requests (storage + network + HTTP)
- **indexer** - Search and lineage queries (storage + network + index)
- **full** - All components enabled (default for local development)

**Key Features**:
- P2P networking (libp2p)
- SQLite storage engine
- Manifest catalog management
- Peer discovery
- Content verification
- Blockchain synchronization

**Used For**:
- High-performance networking
- Local storage management
- Peer coordination
- Production deployments

**Related Docs**: [neuro-infra README](../neuro-infra-README.md) | [CLI Commands](../../neuro-infra/docs/)

---

## 🔗 Smart Contracts

### neuro-program (Solana)
**Location**: `neuro-program/`  
**Framework**: Anchor  
**Program ID**: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

**Purpose**: On-chain state anchoring and governance

The Solana program manages governance manifests, validator attestations, and immutable state anchoring.

**Instructions**:
- `initialize` - Initialize program state
- `initManifest` - Create governance manifest
- `attest` - Validator attestation
- `finalizeManifest` - Mark manifest as finalized

**Accounts**:
- `ProgramState` - Global program state
- `Manifest` - Content manifest with attestations
- `Validator` - Validator registration and stake
- `Attestation` - Individual validator attestation

**Used For**:
- Governance transparency
- Immutable provenance
- Validator coordination
- On-chain verification

**Related Docs**: [neuro-program README](../neuro-program-README.md) | [Anchoring Guide](../Anchoring/readme.md)

---

## 📚 Configuration Files

### Port Assignments
**Location**: `neuroswarm/shared/ports.js`

**Complete port reference**: See [Port Configuration](../Ports.md) for all service ports, configuration notes, and troubleshooting.

---

### Docker Compose
**Location**: `neuroswarm/onboarding/docker-compose.yml`

Orchestrates all 6 services with health checks, dependency ordering, and volume management.

---

### Environment Variables

**Port Configuration**: See [Port Configuration](../Ports.md) for all default ports and overrides.

**NS-Server**:
- `PORT` - Server port
- `LOG_LEVEL` - Logging verbosity
- `NETWORK_ID` - Network identifier
- `MAX_PEERS` - Maximum peer connections

**Gateway Node**:
- `PORT` - Server port
- `NS_NODE_URL` - NS-Server endpoint
- `NS_CHECK_RETRIES` - Health check retries
- `NS_CHECK_EXIT_ON_FAIL` - Exit if NS unreachable

**VP Node**:
- `PORT` - Server port
- `NS_NODE_URL` - NS-Server endpoint
- `VALIDATOR_PRIVATE_KEY` - Path to validator key
- `IPFS_API_URL` - IPFS endpoint

---

## 🎯 Quick Reference

**For Developers**:
- Start here: [Quick Setup](../onboarding/Quick-Setup.md)
- Build plugins: [Plugin Development](../Getting-Started/Home.md#-plugin-development)
- Run nodes: [Run Node Tutorial](../Learning-Hub/Tutorials/Run-Node.md)

**For Validators**:
- Register: [Validator Guide](../Governance/Validator-Guide.md)
- Stake tokens: [Staking Guide](../Governance/Staking.md)
- Monitor: [Admin Dashboard](http://localhost:3000)

**For Users**:
- Submit data: [Gateway API](../API/Gateway-API.md)
- Browse chain: [NS-Web UI](http://localhost:3010)
- Vote on proposals: [Governance Guide](../Learning-Hub/Core-Concepts/Governance.md)

---

## 📖 Related Documentation

- [Architecture Overview](../Learning-Hub/Core-Concepts/Architecture.md) - Deep dive into system design
- [Data Flow](../Technical/data-flow-architecture.md) - Transaction lifecycle
- [Node Design](../Nodes/NODE-DESIGN.md) - Node responsibilities and communication
- [API Reference](../API/) - Complete API documentation
- [Contributor Guide](../Development/Contributor-Guide.md) - How to contribute

---

**Last Updated**: November 28, 2025  
**Questions?** See [FAQ](../FAQ.md) or join our [Discord](https://discord.gg/neuroswarm)
