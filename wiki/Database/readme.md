# Database

Welcome to the NeuroSwarm Database section — reference documentation and architecture notes for the platform's operational and verifiable data layers.

Contents

- database-architecture.md — High-level architecture and where each type of data lives (operational vs. immutable ledger)
- (future) migrations.md — migration practices for database schema and recommended runners
- (future) backups.md — backup/restore and retention recommendations for the operational DB

See `database-architecture.md` to learn why NeuroSwarm uses a hybrid design (low-latency operational DB + blockchain/IPFS for immutable verification), and how that trade-off affects latency, fault tolerance, and security guarantees.

If you're contributing docs, follow the repo wiki conventions: keep operational runbooks concise in this folder and link to larger system documentation in the top-level wiki.
