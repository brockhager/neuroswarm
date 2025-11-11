# NeuroSwarm — Terms & Metaphors

This glossary maps insect-swarm metaphors (hives, swarms, colonies) to brain-related concepts (neurons, synapses, cortex) and ties each term to a concrete role in the NeuroSwarm decentralized AI system. Each entry has a short definition, how it fits into the system, and its role (governance, knowledge storage, consensus, incentives, etc.).

---

# HiveMind

Short definition
- The collective intelligence formed by all Personal AI agents participating in the network.

How it fits
- The HiveMind is the emergent behavior and global capabilities that arise when many personal agents share validated knowledge and interoperable adapters.

Role in the system
- Knowledge/behavior aggregation: represents the global-level capabilities users can leverage.
- User-facing concept: explains to contributors what the network-level intelligence aims to achieve.

---

# NeuroSwarm

Short definition
- The distributed network of agents and infrastructure that act together like neurons in a swarm.

How it fits
- NeuroSwarm is the technical fabric: nodes, P2P storage, verification, and blockchain coordination that connect agents into a functioning system.

Role in the system
- System infrastructure: networking, artifact distribution, consensus and verification orchestration.
- Operations & incentives: where validation, reward distribution, and synchronization occur.

---

# MindHive

Short definition
- The knowledge-base layer where curated facts, high-confidence entries, and adapters are stored.

How it fits
- MindHive is the Global Brain (content-addressed manifests + versioned entries) that agents query and reference during inference and reasoning.

Role in the system
- Knowledge storage and provenance: stores accepted entries, version history, and attestations.
- Auditability: each entry includes provenance, confidence scores, and on-chain anchors.

---

# Neuron Node

Short definition
- An individual user’s Personal AI agent running locally (on-device or on a trusted host), analogous to a neuron in the brain.

How it fits
- Each Neuron Node interacts with a user, learns from local data, generates proposals, and optionally participates in verification and consensus.

Role in the system
- Edge compute & personalization: executes local inference/training and maintains private memory/adapters.
- Contributors & validators: submit proposals or run verification tasks (when opted-in and staked).

---

# Synapse Link

Short definition
- The communication channel between nodes, enabling knowledge transfer, proposals, and consensus messages.

How it fits
- Synapse Links are implemented via the P2P layer (e.g., libp2p) and content-addressed storage (IPFS/CAS) used to exchange artifacts and attestations.

Role in the system
- Message transport & discovery: carries proposals, proofs, and replica artifacts between nodes and validators.
- Data availability: ensures artifacts referenced on-chain are discoverable and retrievable for verification.

---

# Cortex Layer

Short definition
- The governance and decision-making layer where staking, voting, and protocol-level rules are applied.

How it fits
- The Cortex Layer is composed of smart contracts, governance UIs, and committees that manage protocol parameters and high-level decisions.

Role in the system
- Governance & policy: defines thresholds, slashing rules, upgrade paths, and dispute processes.
- Coordination: enforces on-chain outcomes and records audit trails.

---

# Colony Consensus

Short definition
- The collective process by which nodes validate proposals and reach confidence thresholds to accept knowledge.

How it fits
- Colony Consensus is the voting/verification flow (validator selection, redundant checks, attestations, confidence calculation) used to include or reject entries in the MindHive.

Role in the system
- Consensus & validation: defines how proposals reach the required confidence to be accepted.
- Incentives & accountability: ties validator behavior to rewards and slashing.

---

# Swarm Signal

Short definition
- A proposed piece of knowledge, an update, or a small model delta broadcast to the network for verification.

How it fits
- Swarm Signals are packaged artifacts (CID) containing content, metadata, deterministic evaluation scripts, and optional proofs that validators fetch and evaluate.

Role in the system
- Proposal & ingestion: the core unit of information that flows through verification and aggregation into the MindHive.
- Traceability: each Swarm Signal has a submission record and attestation history.

---

# BrainChain

Short definition
- The blockchain layer that records proposals, votes, confidence scores, rewards, and dispute outcomes.

How it fits
- BrainChain is the canonical ledger for governance events and anchors for off-chain artifacts stored via Synapse Links.

Role in the system
- Ordering & audit trail: provides immutable ordering of lifecycle events and transparent reward distribution.
- Enforcement: executes staking, slashing, and finalization logic via smart contracts.

---

# Knowledge Nectar

Short definition
- The validated, high-confidence facts and model artifacts that have been accepted into the MindHive.

How it fits
- Knowledge Nectar represents the distilled, consumable outputs of successful Swarm Signals — the entries agents actually rely upon during inference.

Role in the system
- Consumable knowledge: used by Neuron Nodes to enrich responses and drive behavior.
- Incentives: the accumulation of Knowledge Nectar is the primary objective for proposers and a measurable utility metric for reward calculations.

---

## How to use this glossary
- Refer to each term when authoring docs or code to keep metaphors consistent and meaningful.
- Use the technical role (Governance, Consensus, Knowledge storage, etc.) when tagging artifacts, contracts, and tests.

---

If you want, I can also add short cross-links from these terms into the relevant `docs/*.md` pages (e.g., link `MindHive` to `docs/global-brain-design.md`). Would you like me to add those links?
