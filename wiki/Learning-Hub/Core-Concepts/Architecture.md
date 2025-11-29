# Core Architecture Overview

**Learn the fundamentals** of NeuroSwarm's distributed AI platform.

This guide explains how NeuroSwarm nodes work together to create a decentralized, verifiable AI ecosystem.

---

## 🏗️ System Architecture

### High-Level Overview

NeuroSwarm is a **peer-to-peer network** of AI nodes that collaborate through a blockchain-anchored knowledge system.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Gateway    │────▶│   NS Node    │────▶│   VP Node    │
│  (Port 8080) │     │  (Port 3009) │     │  (Port 3002) │
│              │     │              │     │              │
│ • API Entry  │     │ • Consensus  │     │ • Blocks     │
│ • Validation │     │ • Mempool    │     │ • IPFS Pub   │
│ • Rate Limit │     │ • Blockchain │     │ • Solana     │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   Admin Node     │
                    │   (Port 3000)    │
                    │                  │
                    │ • Dashboard      │
                    │ • Governance     │
                    │ • Monitoring     │
                    └──────────────────┘
```

### Node Types

#### 1. **Gateway Node** (Entry Point)
- **Purpose**: Public-facing API, request validation
- **Responsibilities**:
  - Accept user transactions
  - Validate request format and signatures
  - Maintain local mempool
  - Forward validated transactions to NS Node
  - Rate limiting and DDoS protection

**Example API Call**:
```bash
curl -X POST http://localhost:8080/v1/tx \
  -H "Content-Type: application/json" \
  -d '{"type":"learn","payload":"New data","signedBy":"user123"}'
```

#### 2. **NS Node** (Brain/Consensus)
- **Purpose**: Core consensus engine, blockchain state
- **Responsibilities**:
  - Manage canonical blockchain
  - Coordinate validator consensus
  - Process transactions from mempool
  - Maintain global state (chain height, validators, learning scores)
  - Orchestrate tasks across network

**Key Endpoints**:
- `GET /health` — Node health status
- `GET /v1/mempool` — Pending transactions
- `POST /tx` — Submit transaction (from Gateway)
- `POST /blocks/produce` — Block production (from VP)
- `GET /v1/chain` — Blockchain state

#### 3. **VP Node** (Validator/Producer)
- **Purpose**: Block production, IPFS publication, Solana anchoring
- **Responsibilities**:
  - Poll NS mempool for transactions
  - Construct blocks with merkle roots
  - Sign block headers (cryptographic proof)
  - Publish payloads to IPFS
  - Anchor blocks to Solana blockchain

**Block Structure**:
```typescript
{
  version: 1,
  blockNumber: 42,
  previousHash: "0x...",
  timestamp: 1732800000,
  payloadCid: "Qm...",     // IPFS CID
  sourcesRoot: "0x...",    // Merkle root
  validatorSignature: "0x...",
  txCount: 15
}
```

#### 4. **Admin Node** (Governance)
- **Purpose**: Dashboard, governance, observability
- **Responsibilities**:
  - Web-based monitoring dashboard
  - Governance proposal management
  - Validator performance tracking
  - System health visualization

---

## 🔄 Data Flow

### Transaction Lifecycle

**Step-by-step walkthrough**:

1. **User → Gateway** (HTTP POST /v1/tx)
   ```
   User submits data with signature
   ```

2. **Gateway validates**:
   - Check signature authenticity
   - Validate JSON schema
   - Rate limit check
   - Query source adapters (Allie-AI integration)

3. **Gateway → NS Node** (POST /tx)
   ```
   Forwarded transaction includes:
   - Original payload
   - Signature
   - Source metadata
   - Correlation ID
   ```

4. **NS Node validates**:
   - Verify signature
   - Check canonicalization
   - Store in mempool
   - Return success/failure

5. **VP Node polls** (GET /v1/mempool)
   ```
   VP retrieves pending transactions
   Constructs block with:
   - Merkle root of transactions
   - Sources root (metadata validation)
   - Timestamp and block number
   ```

6. **VP signs and publishes**:
   - Signs block header with validator key
   - Publishes payload to IPFS → `payloadCid`
   - Submits block to NS Node (POST /blocks/produce)

7. **NS Node applies block**:
   - Validates header signature
   - Verifies merkle roots
   - Updates canonical chain
   - Broadcasts to gateways
   - Removes applied transactions from mempool

8. **Reorg handling** (if fork detected):
   - Find common ancestor
   - Rollback to ancestor
   - Replay blocks from new branch
   - Requeue removed transactions to Gateway

---

## 🧠 Global Brain Concept

### Collective Intelligence

The **Global Brain** is the emergent intelligence created when personal AI agents share verified knowledge.

**Key Principles**:

1. **Local First**: AI runs on your machine, no data leaves without permission
2. **Selective Sharing**: You choose what knowledge to contribute
3. **Verifiable Provenance**: Every contribution is cryptographically signed
4. **Auditable History**: Full blockchain record of knowledge evolution

### How It Works

```
┌─────────────────┐
│  Personal AI    │  (Your local agent learns from you)
│  (Local)        │
└────────┬────────┘
         │ 1. You approve sharing
         │
         ▼
┌─────────────────┐
│  Gateway Node   │  (Validates and signs)
│  (Your or Public)│
└────────┬────────┘
         │ 2. Validated transaction
         │
         ▼
┌─────────────────┐
│  NS Node        │  (Consensus and blockchain)
│  (Network)      │
└────────┬────────┘
         │ 3. Block production
         │
         ▼
┌─────────────────┐
│  IPFS + Solana  │  (Permanent, verifiable storage)
│  (Distributed)  │
└────────┬────────┘
         │ 4. Available to network
         │
         ▼
┌─────────────────┐
│  Other AIs      │  (Benefit from shared knowledge)
│  (Global)       │
└─────────────────┘
```

### Privacy Guarantees

- **End-to-end encryption** for private data
- **Zero-knowledge proofs** (planned) for privacy-preserving validation
- **Opt-in sharing** — nothing leaves your machine without explicit consent
- **Right to be forgotten** — request removal of contributed data

---

## 🔐 Security Model

### Multi-Layer Validation

1. **Gateway Layer**: Format, rate limits, basic signature check
2. **NS Node Layer**: Canonical signature verification, consensus rules
3. **VP Layer**: Block header signing, merkle proof construction
4. **Blockchain Layer**: Immutable anchoring to Solana

### Cryptographic Guarantees

**Signatures**: Ed25519 (fast, secure)
**Hashing**: SHA-256 for merkle trees
**Blockchain**: Solana (high throughput, low latency)

**Example Signature Verification**:
```javascript
const verified = verifySignature(
  message,
  signature,
  publicKey
);
// Returns true if signature matches, false otherwise
```

---

## 📊 Performance Characteristics

### Target Metrics (Phase G)

| Metric | Target | Purpose |
|--------|--------|---------|
| **Per-Token Latency (P95)** | <80ms | Real-time AI inference |
| **Throughput** | >12 tokens/sec | Smooth generation |
| **Cache Hit Rate** | >70% | Reduce redundant computation |
| **Consensus Latency** | <500ms | Fast block production |
| **Block Time** | <2s | Quick finality |

### Scalability

**Current**: ~100 transactions/sec per node  
**Planned**: Horizontal scaling to 10,000+ TPS

**Bottlenecks**:
- IPFS publish latency (mitigated with caching)
- Solana RPC rate limits (mitigated with batching)
- Semantic cache misses (mitigated with warmup)

---

## 🔌 Extensibility

### Plugin System

NeuroSwarm supports three plugin types:

1. **Validators**: Custom content validation rules
2. **Scorers**: Reputation and quality scoring algorithms
3. **Visualizations**: Dashboard extensions

**Example Validator**:
```javascript
class SpamValidator {
  async validate(entry) {
    // Check for spam patterns
    if (entry.payload.includes('spam')) {
      return { valid: false, reason: 'Spam detected' };
    }
    return { valid: true };
  }
}
```

See [Plugin System](./Plugins.md) for full guide.

---

## 🚀 Getting Started

### Run Your Own Node

**Quickest way** (Docker Compose):
```powershell
cd neuroswarm
.\onboarding\onboard.ps1
```

**Native development**:
```powershell
pnpm install -w
cd neuroswarm
pnpm --filter ns-node start
```

### Next Steps

1. **[Governance Model](./Governance.md)** — Learn voting and validation
2. **[Plugin Development](./Plugins.md)** — Build custom validators
3. **[Running a Node](../Tutorials/Run-Node.md)** — Production setup guide

---

## 📚 Further Reading

- **[Technical Architecture](../../Technical/Architecture.md)** — Deep dive into system design
- **[Data Flow Architecture](../../Technical/data-flow-architecture.md)** — Complete dataflow diagrams
- **[NODE-DESIGN](../../Nodes/NODE-DESIGN.md)** — Node implementation details
- **[Global Brain Design](../../Technical/GLOBAL-BRAIN.md)** — Collective intelligence architecture

---

**Questions?** Join the [Discord community](../../../README.md#community) or check [Troubleshooting](../../Support/Troubleshooting.md).

**Last Updated**: 2025-11-28  
**Maintainers**: NeuroSwarm Core Team
