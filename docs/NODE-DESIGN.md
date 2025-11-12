# NeuroSwarm Node Design

## Overview
NeuroSwarm is designed to run like Bitcoin Core: a downloadable binary that each node can run independently. Nodes connect to each other over the internet, sync catalogs and artifacts, and verify provenance via Solana anchoring. No central service is required.

---

## Node Architecture

### Components
- **Daemon**
  - Core peer process: storage, validation, sync
  - Interfaces: gRPC/HTTP RPC, P2P sockets
  - Modules: Gateway, Indexer, IPFS client, Solana client, Peer manager

- **CLI**
  - Control the daemon (start/stop, status, peer ops, prune, snapshot)
  - Example commands: `nsd start`, `nsd stop`, `ns peer add`, `ns prune`, `ns snapshot`

- **GUI (optional)**
  - Desktop UI for non‑technical users
  - Shows sync progress, provenance, search, settings

- **Config & Data**
  - Config: `~/.neuroswarm/ns.conf` (TOML/YAML)
  - Data: `~/.neuroswarm/data` (DB, caches, IPFS pins)
  - Logs: `~/.neuroswarm/logs`

### Modules
- **Peer Manager**
  - Discovery: DNS seeds, static peers, DHT/gossip
  - Connectivity: TCP/QUIC, TLS/Noise
  - Policies: banlist, reputation, rate limiting

- **Sync Engine**
  - Initial sync, incremental updates, resumable downloads
  - Modes: full, pruned, archival

- **Validation & Provenance**
  - Verify manifests/attestations via Solana RPC
  - Cache proofs locally
  - Offline mode: validate against last snapshot

- **Storage Layer**
  - Catalog DB (SQLite/RocksDB)
  - Artifacts pinned via IPFS
  - Optional Filecoin persistence

- **APIs**
  - RPC/gRPC: node status, peer list, search/resolve, submit manifest, attest
  - Gateway: local HTTP endpoints
  - Indexer: local search/index service

---

## Networking Model

### Peer Discovery
- **DNS seeds**: bootstrap peers
- **DHT + gossip**: decentralized peer discovery
- **Static peers**: private/test networks

### Message Types
- Peer: hello, version, capabilities
- Catalog: manifest headers, attestation summaries
- Artifact: CID availability, pin requests
- Governance: registry snapshots, confidence thresholds

### Integrity
- All messages signed
- Content verified by CID + on‑chain proofs
- Rate limits and backpressure

---

## Node Types

1. **Full Node (Anchored)**
   - Runs Gateway + Indexer + IPFS client
   - Syncs catalogs/artifacts from peers
   - Verifies provenance against Solana
   - Keeps complete history

2. **Light Node**
   - Minimal disk footprint
   - Fetches catalogs/artifacts on demand
   - Prunes aggressively
   - Ideal for laptops or casual users

3. **Standalone / Offline Node**
   - Runs locally without connecting to peers
   - Serves from cached snapshots only
   - Useful for testing or restricted environments

4. **Peer‑Only Node**
   - Connects to other NeuroSwarm nodes via P2P
   - Relies on gossip + IPFS for sync
   - May skip Solana anchoring except periodically

5. **Validator Node**
   - Submits attestations to Solana
   - Holds signing keys and contributes confidence scores
   - Anchors trust and governance

6. **Indexer Node**
   - Builds catalogs, lineage graphs, and search APIs
   - Ingests events from Solana and peers
   - Provides discovery services

7. **Gateway Node**
   - Provides HTTP/GraphQL APIs for NS Web clients
   - Acts as a bridge between users and the swarm
   - Handles caching, rate limiting, provenance injection

---

## Operating Modes
- **Standalone offline**: serve from local cache/snapshots
- **Peer‑only**: decentralized, optional on‑chain checks
- **Anchored**: P2P + IPFS + Solana verification
- **Light client**: minimal disk, prunes aggressively
- **Validator node**: adds signing keys and attestation capacity

---

## Distribution & Install
- **Binaries**: Linux, macOS, Windows
- **Packages**: .deb/.rpm/Homebrew/Scoop; Docker image
- **First run wizard**: choose mode, set data dir, select discovery sources
- **Snapshots & pruning**: signed catalogs for fast bootstrap; CLI prune

---

## Security & Trust
- **Identity**: Ed25519 keys for node identity; separate attestation keys
- **Transport**: TLS or Noise; PFS; certificate pinning
- **Verification**: validate manifests against Solana program
- **Hardening**: sandboxing, seccomp, DoS protection

---

## Build Plan (Ordered Tasks)

1. Define node spec (roles, modes, RPC surface, config schema, message types)
2. Initialize repos and scaffolds (daemon skeleton, CLI, config loader)
3. Peer networking MVP (DNS seeds, static peers, QUIC transport, handshake)
4. Local storage + index (catalog DB, artifact cache, IPFS pin/unpin)
5. Sync engine (initial sync, resumable, incremental updates)
6. Solana anchoring integration (verify manifests/attests, cache provenance)
7. Gateway API (local HTTP/GraphQL endpoints, auth, audit logs)
8. Indexer integration (event ingestion, faceted search, lineage graphs)
9. CLI commands (`nsd start/stop/status`, `ns peer add/list/ban`, `ns prune`, `ns snapshot`, `ns verify`)
10. GUI (optional first‑pass: sync progress, peers list, provenance viewer)
11. Operating modes (config flags for standalone/light/anchored)
12. Security hardening (transport encryption, key management, sandboxing)
13. Observability (logs, metrics, Prometheus exporter, tracing IDs)
14. Installers and Docker (cross‑compiled binaries, packages, Docker image)
15. Snapshots and bootstrap (signed catalogs, downloader, integrity verification)
16. E2E and failure drills (integration tests, chaos tests)
17. Docs and release (operator, validator, developer guides; reproducible bootstrap)

---

## Config Essentials (example keys)

```yaml
network:
  dns_seeds: ["seed1.neuroswarm.org", "seed2.neuroswarm.org"]
  static_peers: []
  enable_quic: true
  max_connections: 64

storage:
  data_dir: "~/.neuroswarm/data"
  logs_dir: "~/.neuroswarm/logs"
  prune_policy: "finalized-only"
  snapshot_auto: true
  ipfs_gateway_url: "https://ipfs.io"
  pinning_enabled: true

solana:
  rpc_url: "https://api.mainnet-beta.solana.com"
  program_id: "NeuroSwarmProgramIDHere"
  verify_interval_secs: 60
  finalize_only: true

security:
  identity_key_path: "~/.neuroswarm/keys/node.key"
  attestation_key_path: "~/.neuroswarm/keys/attest.key"
  api_tokens: []
  rbac_roles: []
