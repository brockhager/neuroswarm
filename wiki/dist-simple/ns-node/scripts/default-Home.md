# NeuroSwarm Wiki

Welcome to the NeuroSwarm project wiki.

## Quick Links
- [Download](Download) - Official release artifacts and installers
- [Running Nodes](Running-Nodes) - Start and monitor ns-node, gateway-node, vp-node
- [Contributor Policy](Contributor-Policy) - Development workflow and guidelines
- [Updates / Changelog](Updates) - Release notes and breaking changes

## Getting Started

### For Operators
1. Download platform-specific installers from the [Download](Download) page
2. Extract and run the provided start scripts (`start-windows.bat` or `start.sh`)
3. Verify health endpoints return OK status
4. Follow the [Running Nodes](Running-Nodes) guide for detailed operations

### For Contributors
1. Clone the repository and run `pnpm install -w`
2. Read the [Contributor Policy](Contributor-Policy) for workflow conventions
3. Make changes and run tests before opening PRs
4. All documentation changes sync automatically to this wiki

## Architecture
NeuroSwarm is a decentralized consensus network with:
- **NS Node** - Network state verification and chain management
- **Gateway Node** - Transaction admission and mempool curation
- **VP Node** - Block production with validator rotation

See [Data Flow Architecture](Data-Flow-Architecture) for detailed system design.

## Support
- GitHub Issues: https://github.com/brockhager/neuroswarm/issues
- GitHub Discussions: https://github.com/brockhager/neuroswarm/discussions

---
*This page is auto-maintained. Do not edit directly via automation.*
*Last updated: 2025-11-18*
