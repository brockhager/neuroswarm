# Database Architecture & Data Integrity Overview

Welcome to the NeuroSwarm data architecture documentation. This platform uses a hybrid data model that combines a low-latency operational database for real-time operations and a decentralized ledger for immutable verification. Understanding the role of each system is key to understanding NeuroSwarm's performance, fault tolerance, and security guarantees.

---

## 1) Operational Database: Firestore (real-time layer)

We use Google Cloud Firestore as our operational, low-latency data layer for volatile, frequently accessed state. Firestore is optimized for high-throughput reads/writes and low latency which makes it ideal for state that needs to change quickly and be read in real time by UIs and internal services.

What Firestore is used for

- VP Node Checkpoints: last processed job ID, stake, peer list (quick recovery & resuming)
- Reconciliation & Metrics: reconciliation success rate, retry counters, job queue depth used by the Control Center for sub-100ms dashboards
- Incident Management: deduplicated alert history and incident state used by the alert-sink to prevent notification spam
- Pending/Short-Lived Queues: ephemeral coordination like pending job queues and in-flight claims

Why not put this data on-chain or in IPFS?

Using the blockchain or IPFS for fast operational state would introduce crippling latency and poor developer ergonomics. Querying the ledger or IPFS for high-frequency operations can take seconds or minutes which is incompatible with real-time monitoring and interactive admin tools.

---

## 2) Decentralized Ledger: Blockchain & IPFS (verifiable layer)

NeuroSwarm relies on a decentralized ledger (private-managed network akin to Ethereum/Bitcoin for this project) and IPFS for storing immutable artifacts. These are the systems of record for any data that must be cryptographically verifiable and censorship-resistant.

What the ledger + IPFS are used for

- Immutable job results and proofs — final, verified outcomes of decentralized computations stored as manifests and anchored on-chain
- Financial transactions and refunds — signed refund and payout transactions recorded with cryptographic proofs
- Smart contracts — platform governance logic, staking rules, and dispute resolution executed and enforced on-chain
- Large immutable blobs — raw compute output or manifests stored on IPFS with a content-addressable CID linked from on-chain metadata

---

## Key Differences and How We Use Both Together

| Feature | Firestore (Operational) | Blockchain / IPFS (Verifiable) |
|---|---:|---:|
| Primary goal | Fast reads/writes, low latency, operational state | Immutable history, cryptographic verification, censorship resistance |
| Data type | Volatile, frequently updated (counters, timestamps, UI state) | Permanent, static, cryptographically secured (transactions, proofs, manifests) |
| Latency | Milliseconds | Seconds — minutes (depends on chain finality and indexing) |
| Security mechanism | Role-based access, auth rules (fast revocation) | Cryptographic hashing, consensus, PKI |

By combining the two systems, NeuroSwarm achieves the best of both worlds: a highly responsive platform for operations and observability (Firestore) built on a foundation of trustless verifiability for critical proofs and financial flows (Blockchain/IPFS).

---

## Fault Tolerance & Backups

- Firestore handles transient failures via automatic replication and strong consistency guarantees for single-region instances. We provide guidance for backup snapshots, local caches, and replay patterns in `migrations.md` and `backups.md` (coming soon).
- The blockchain provides immutability and canonical history. IPFS content should be pinned to resilient clusters and optionally anchored on external verifiers for long-term availability.

## Operational Notes & Runbook Links

- For local development and CI we use durable Postgres / migration runners (see `router-api/migrations/`) for the relational pieces of the Router API. These are intentionally separate from Firestore which is used in production for #1 above.
- Monitoring & alerting: Reconciliation (T22) and alert sink (T19) are designed to operate against the operational DB (Firestore + side-store) while critical anchors and mentions are verifiable via chain logs.

## Contributing

If you update these docs, please also add a short developer runbook that explains how to test any change locally (migrations, seed data, developer sandbox settings). See `neuroswarm/wiki/Development/Contributor-Onboarding.md` for general guidance.
