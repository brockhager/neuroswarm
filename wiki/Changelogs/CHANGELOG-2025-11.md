# NeuroSwarm Changelog - November 2025

This is the master changelog for all November 2025 releases and updates.

## Quick Links
- [Phase 4 Detailed Changes (Nov 25)](docs/changelog/changelog-112025.md) - Advanced contributor tools, governance, and performance optimization
- [Detailed November 15-21 Changes](changelog-112025.md) - Comprehensive changelog including Gateway/Mempool, Downloads, and all architectural changes

---

## [v0.1.7] - 2025-11-24

### 🧠 Major Feature: Learning System with IPFS Knowledge Storage

Implemented a layered knowledge system that makes NeuroSwarm smarter over time by caching verified answers to IPFS.

### Added
- **Math Calculator Adapter** - Instant arithmetic evaluation without LLM calls
  - Handles expressions like `23523 * 2048 = 48,175,104`
  - Supports basic operators: `+`, `-`, `*`, `/`, `()`, `^`
  - Deterministic and instant (no network calls)

- **Helia IPFS Integration** - Embedded IPFS node (no external daemon required)
  - Runs IPFS directly in the application
  - Persistent blockstore and datastore
  - Automatic peer discovery and content sharing
  - Zero configuration for end users

- **Knowledge Storage System** (`knowledge-store.js`)
  - Automatically stores high-confidence answers (≥0.8) to IPFS
  - Keyword extraction for semantic search
  - Topic categorization (geography, history, science, mathematics, general)
  - Time-based expiry (news: 1 day, prices: 1 hour, facts: 30 days)
  - Local index for fast lookups

- **IPFS Knowledge Adapter** - Layer 2 cache retrieval
  - Checks IPFS cache before web search or LLM
  - Semantic search with keyword matching (2+ matching keywords)
  - Works with different phrasings ("capital france" matches "what is the capital of France?")
  - Fuzzy matching for better recall

- **Learning System Design Document** (`wiki/learning-system/readme.md`)
  - Comprehensive architecture documentation
  - Community-driven learning (Top-Five) roadmap
  - Independent learning system design
  - Phase 16 and 17 implementation plan

### Changed
- **Adapter Priority System** - Layered knowledge retrieval
  1. Deterministic adapters (math, scores) - Instant
  2. IPFS knowledge cache - Fast retrieval
  3. Web search / LLM - New answers
  4. Store to IPFS - Build knowledge base

- **Removed Allie Adapters** - Cleaned up non-functional adapters
  - Removed `allie-weather`, `allie-price`, `allie-news`, `allie-eth`, `allie-oracle`
  - Simplified adapter registry

### Fixed
- **Web Search Adapter** - Improved HTML parsing for DuckDuckGo results
- **Chat.js Integration** - Added IPFS storage after successful answers
- **Sources Registry** - Fixed JSON syntax and added new adapters

### Technical Details
- Helia v4.0.0 (embedded IPFS)
- @helia/unixfs v3.0.0
- blockstore-fs v1.0.0 for persistent storage
- datastore-fs v2.0.0 for metadata
- Keyword extraction with stop word filtering
- SHA-256 hashing for question normalization

### Testing
- `test-math-calculator.js` - Arithmetic evaluation tests
- `test-ipfs-knowledge.js` - IPFS storage and retrieval
- `test-cache-scenarios.js` - Cache hit/miss verification
- `test-semantic-search.js` - Keyword matching and fuzzy search

### Performance
- Math queries: < 1ms (instant)
- IPFS cache hits: ~10-50ms (fast)
- Web search fallback: 1-3s (when needed)
- Knowledge grows automatically with usage

---

## [v0.1.8] - 2025-11-25

### 🚀 Major Release: Phase 4 - Advanced Contributor Experience & Governance

Implemented comprehensive Phase 4 features focusing on enhanced contributor tools, decentralized governance, and performance optimization.

### Added

#### Phase 4a: Enhanced Contributor Tools
- **Query History & Replay System** - Complete implementation of query logging and historical analysis
  - Real-time query logging with comprehensive metadata (response time, cache hits, confidence scores, adapter usage)
  - REST API endpoints for query history retrieval (`/api/query-history`, `/api/query-history/stats`)
  - Interactive query replay system for debugging and performance analysis
  - 24-hour activity metrics integration with live dashboard updates

- **Enhanced Contributor Dashboard** - Major UI overhaul with professional multi-tab interface
  - Tabbed navigation: Overview, Query History, Analytics, Governance tabs
  - Real-time auto-refresh capabilities (30-second intervals)
  - Interactive query history browser with replay buttons
  - Live activity metrics from actual system usage data

#### Phase 4b: Governance & Trust Framework
- **Decentralized Governance System** - Community-driven parameter management
  - Voting system for system parameters (confidence thresholds, similarity settings, adapter limits)
  - Proposal creation and community voting mechanism with majority rule
  - Automatic parameter updates when proposals pass voting
  - REST API for governance operations (`/api/governance`, `/api/governance/proposals`)

- **Dashboard Governance Integration** - Full governance UI in contributor dashboard
  - Current parameter display with governance status
  - Interactive proposal creation form with parameter selection
  - Real-time voting interface for active proposals
  - Active proposal tracking and status monitoring

#### Phase 4c: Performance Optimization Framework
- **Automated Performance Benchmarking** - Comprehensive optimization testing suite
  - Baseline performance measurement for embedding generation (~3.32s average)
  - Quantized model testing and comparison framework
  - GPU acceleration benchmarking capabilities
  - Batch processing optimization analysis

- **Performance Analysis Tools** - Advanced monitoring and reporting
  - Detailed speedup calculations and success rate tracking
  - Memory usage and response time analytics
  - Model comparison and optimization recommendations
  - Automated performance regression testing

### Changed
- **Dashboard Architecture** - Complete redesign with modular tabbed interface
  - Responsive design with mobile compatibility
  - Real-time data updates and comprehensive error handling
  - Interactive forms and voting interfaces
  - Professional styling and enhanced user experience

- **API Architecture** - Extended REST API with 10+ new endpoints
  - Query history endpoints for activity logging and analytics
  - Governance endpoints for community decision-making
  - Enhanced health endpoint with activity metrics
  - Consistent JSON request/response formats

### Technical Details
- **QueryHistoryService** - New service for comprehensive query logging and analytics
  - Persistent JSON storage with configurable retention (1000 queries max)
  - Metadata-rich logging (timing, caching, confidence, adapters)
  - Statistical analysis and reporting capabilities

- **GovernanceService** - Complete governance framework implementation
  - Parameter management with validation and constraints
  - Proposal lifecycle management (creation, voting, implementation)
  - Voter tracking and audit trail integrity
  - Community decision-making transparency

- **PerformanceOptimizer** - Automated benchmarking and optimization tools
  - Multi-strategy performance testing (baseline, quantized, GPU, batch)
  - Statistical analysis and reporting with speedup calculations
  - Model comparison and recommendation engine

### Files Added/Modified
- `src/services/query-history.js` - Query logging and replay service
- `src/services/governance.js` - Community governance system
- `src/services/performance-optimizer.js` - Performance benchmarking suite
- `server.js` - Added Phase 4 API endpoints and services
- `public/dashboard.html` - Enhanced with tabs and Phase 4 features
- `phase-4-demo.js` - Demonstration script for all new features
- `docs/changelog/changelog-112025.md` - Detailed Phase 4 changelog
- `phase-4-roadmap.md` - Comprehensive Phase 4 development roadmap

### Testing
- **Phase 4 Testing Suite** - Comprehensive testing of new features
  - API endpoint testing and validation
  - UI component testing and integration
  - Performance benchmarking validation
  - Governance workflow testing

### Performance Baseline
- **Current Metrics**: Established baseline for future optimizations
  - Embedding generation: ~3.32 seconds average
  - Memory usage: ~44MB heap usage
  - Response time: 2-3 seconds for adapter queries
  - Cache hit potential: Framework ready for implementation

### Future Roadmap
- **Phase 4a.2**: Advanced analytics and cache visualization
- **Phase 4b.1**: Expanded governance with model selection voting
- **Phase 4c.1**: Production deployment of optimizations and GPU acceleration

### Impact
- **Contributor Experience**: Powerful dashboard and analytics capabilities with complete transparency
- **Community Governance**: Active role in system evolution through voting and proposal systems
- **Performance Foundation**: Framework for enterprise-grade performance optimizations
- **Architecture Maturity**: Modular, scalable design ready for advanced features

---

## [v0.1.6] - 2025-11-22

### 🎉 Major Release: Desktop Installers Available

First release with standalone desktop applications for Windows, macOS, and Linux!

### Added
- **Desktop Application** - Electron-based standalone app with system tray integration
- **Cross-Platform Installers** - Windows `.exe`, macOS `.dmg`, Linux `.AppImage`
- **Zero Configuration** - No Node.js installation required
- **Portable Builds** - Run from anywhere without installation

### Fixed
- **CI/CD Pipeline** - Fixed GitHub Actions workflows for automated builds
- **Linting Errors** - Resolved TypeScript linting issues in website portal
- **Build System** - Fixed npm dependency installation and semantic versioning
- **Cross-Compilation** - Removed Wine dependency by using native platform builds
- **Security Workflow** - Fixed malformed `security.yml` structure

### Changed
- **GitHub Actions** - Upgraded all actions from v3 to v4
- **Build Script** - Removed hardcoded `--win` flag for native builds
- **Workflow Strategy** - Disabled optional workflows to reduce CI noise

### Technical Details
- Electron v28.3.3
- electron-builder v24.9.1
- Node.js v18.20.8 (bundled)

### Downloads
Available on the [Releases page](https://github.com/brockhager/neuroswarm/releases)

---

## Earlier November Releases

For detailed information about earlier November releases and architectural changes, see:
- [changelog-112025.md](changelog-112025.md) - Comprehensive November 15-21 changes including:
  - Admin Node improvements and test fixes
  - Universal Peer Discovery System
  - Enhanced P2P Security (Reputation, Encryption, NAT Traversal)
  - Consensus Finality & Fork Resolution
  - Gateway/Mempool/VP/NS architectural changes

---

## Version History Summary

| Version | Date | Status | Key Changes |
|---------|------|--------|-------------|
| v0.1.8 | Nov 25 | ✅ **Success** | Phase 4: Contributor tools, governance, performance optimization |
| v0.1.7 | Nov 24 | ✅ **Success** | Learning system, Helia IPFS, semantic search |
| v0.1.6 | Nov 22 | ✅ **Success** | Desktop installers, CI/CD fixes |
| v0.1.5 | Nov 22 | ❌ Failed | Wine dependency issues |
| v0.1.4 | Nov 22 | ❌ Failed | SemVer compliance |
| v0.1.3 | Nov 22 | ❌ Failed | npm issues |
| v0.1.2 | Nov 22 | ❌ Failed | Deprecated actions |
| v0.1.1 | Nov 20 | ⚠️ Manual | Initial Electron setup |

---

**For detailed technical documentation, see:**
- [Phase 4: Advanced Contributor Experience & Governance (Nov 25)](docs/changelog/changelog-112025.md)
- [Gateway/Mempool/IPFS Changes (Nov 17)](changelog-2025-11-17-gateway-mempool-ipfs.md)
- [Downloads Page Restored (Nov 18)](changelog-2025-11-18-download-restored.md)
- [Comprehensive November Changes (Nov 15-21)](changelog-112025.md)
