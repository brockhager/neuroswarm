# NeuroSwarm Release Notes & Updates

This document tracks all important project updates, releases, and notable changes.

---

## Recent Updates

### November 24, 2025 - Learning System Release (v0.1.7)
**Major Feature: IPFS Knowledge Storage**

NeuroSwarm now learns from every interaction, building a decentralized knowledge base that makes the system smarter over time.

**Key Features:**
- Math calculator for instant arithmetic
- Embedded Helia IPFS (no daemon needed)
- Semantic search with keyword matching
- Automatic knowledge categorization
- Performance: Math < 1ms, Cache hits ~10-50ms

**See:** [CHANGELOG-2025-11.md](CHANGELOG-2025-11.md#v017---2025-11-24)

---

### November 22, 2025 - Desktop Application Release (v0.1.6)
**First Standalone Desktop Installers**

Cross-platform desktop applications now available for Windows, macOS, and Linux with zero configuration required.

**Downloads:** [GitHub Releases](https://github.com/brockhager/neuroswarm/releases)

**See:** [CHANGELOG-2025-11.md](CHANGELOG-2025-11.md#v016---2025-11-22)

---

### November 18, 2025 - Downloads Page Restored
**Wiki Update**

Restored and updated the Download page with current release links for all platforms, including checksum verification and GPG instructions.

**See:** [changelog-2025-11-18-download-restored.md](changelog-2025-11-18-download-restored.md)

---

### November 17, 2025 - Gateway/Mempool/IPFS Architecture
**Major Architectural Changes**

- Gateway now owns canonical mempool
- VP IPFS payload signatures
- NS lightweight behavior with requeue
- Allie-AI source adapters integration

**See:** [changelog-2025-11-17-gateway-mempool-ipfs.md](changelog-2025-11-17-gateway-mempool-ipfs.md)

---

### November 16, 2025 - Data Flow Architecture
**Documentation Update**

Added comprehensive data flow architecture documentation outlining ingress, consensus, and audit hooks.

---

### November 15, 2025 - Admin Node Stabilization
**Test & CI Improvements**

- Fixed Playwright e2e tests
- Resolved timeline seed data issues
- Improved observability for governance anchoring
- Enhanced CI/CD pipeline reliability

**See:** [changelog-112025.md](changelog-112025.md)

---

## Project Milestones

### Phase 16: Learning System ✅
- [x] Knowledge Miner
- [x] IPFS Storage Integration (Helia)
- [x] Semantic Search
- [x] Keyword Extraction & Categorization

### Phase 17: Top-Five Community Learning 🚧
- [ ] Question Pool & Voting
- [ ] Interval Settings
- [ ] Community Verification
- [ ] Governance Integration

### Desktop Application ✅
- [x] Electron-based standalone app
- [x] Cross-platform installers
- [x] System tray integration
- [x] Zero configuration setup

### P2P Network ✅
- [x] Universal peer discovery
- [x] Reputation system
- [x] Encrypted communication (HTTPS)
- [x] NAT traversal (STUN)

---

## How to Contribute

Updates are tracked automatically using `scripts/publishUpdate.mjs`. To propose changes:
1. Open a PR modifying `wiki/Changelogs/`
2. Use the `publishUpdate.mjs` script to append new entries
3. Follow the [Contributor Onboarding Guide](../Development/Contributor-Onboarding.md)

---

## Documentation

- **Changelogs:** [CHANGELOG-2025-11.md](CHANGELOG-2025-11.md)
- **Learning System:** [wiki/learning-system/readme.md](../learning-system/readme.md)
- **Peer Discovery:** [wiki/peer-discovery/README.md](../peer-discovery/README.md)
- **Downloads:** [wiki/Download.md](../Download.md)

---

**Last Updated:** 2025-11-24
