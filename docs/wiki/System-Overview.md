# System Overview

Overview

NeuroSwarm is a decentralized architecture comprised of multiple services and coordination nodes. The Admin Node is the canonical governance node and is responsible for timeline logging, governance actions, and blockchain anchoring to provide tamper-evident proof of admin configuration.

Key components
- Admin Node: Express-based service that exposes admin routes, observability endpoints, and manages the governance timeline.
- Indexer / Gateway Nodes: Responsible for decentralized content indexing and discovery.
- UI (Dashboard): Tools for founders, admins, and contributors to review and act on governance events.
- Anchoring (Blockchain): Periodic anchoring of the governance timeline to a blockchain (e.g., Solana) to provide cryptographic evidence and audit trails.

How-to
1. Install and run local services following the repository README
2. Use `admin-node` to serve a local admin dashboard; seed the timeline using scripts/seed-e2e-timeline.js
3. Use the observability endpoints to inspect the governance timeline and anchoring status

References
- `docs/general/neuro-infra-README.md`
- `docs/admin/admin-node-design.md`
- `admin-node` service folder in the repository

Last updated: 2025-11-15