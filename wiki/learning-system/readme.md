# NeuroSwarm Learning System

## Overview
The NeuroSwarm Learning System is designed to evolve the network's collective intelligence through a hybrid approach of community-driven consensus and autonomous verification. By combining the "Top-Five" community voting mechanism with independent autonomous learning engines, the system creates a robust, decentralized "brain" that gets smarter over time.

Crucially, all knowledge is persisted using **Helia (IPFS)**, ensuring that the network's intelligence is:
- **Decentralized**: Not reliant on any single server.
- **Transparent**: All Q&A history and voting logs are public.
- **Permanent**: Knowledge survives individual node churn.

---

## Community-Driven Learning (Top-Five)
The "Top-Five" system leverages the wisdom of the crowd to curate high-quality answers for complex or subjective questions.

### Question Pool
- **Submission**: Contributors with sufficient reputation can submit questions to the pool.
- **Prioritization**: Questions are ranked by community interest (upvotes) and urgency.
- **Moderation**: A reputation-weighted flagging system prevents spam and malicious content.

### Interval Voting
To prevent noise and ensure thoughtful consensus, voting occurs in defined intervals:
- **Hourly**: For rapidly changing information (e.g., "What is the current sentiment on X?").
- **Daily**: For general knowledge and fact-checking.
- **Weekly**: For complex strategic decisions or governance proposals.
*The cadence is adjustable via community governance.*

### Active Posting & Voting
1. **Selection**: The top-ranked question from the pool becomes "Active".
2. **Proposals**: Nodes submit potential answers.
3. **Top-Five Display**: The system aggregates similar answers and displays the top 5 distinct options.
4. **Consensus**: Nodes vote on the best answer. The option with the majority (or supermajority, depending on configuration) wins.
5. **Finalization**: The winning answer is cryptographically signed and stored.

### Storage
- **Results**: Finalized Q&A pairs are written to IPFS.
- **Retrieval**: Helia APIs allow any node to instantly retrieve the consensus answer for a given question CID.

---

## Independent Learning System
While the community handles complex queries, the Independent Learning System automates the acquisition of factual knowledge.

### Knowledge Miner
- **Function**: Autonomously identifies gaps in the knowledge base by analyzing failed queries and chat logs.
- **Generation**: Formulates specific questions to fill these gaps (e.g., "What is the population of X?").
- **Sourcing**: Uses deterministic adapters (Math, Weather, Stocks) and web search to find candidate answers.

### Adaptive Interval Controller
- **Function**: Optimizes the frequency of learning activities to balance network load and knowledge freshness.
- **Learning**: Uses reinforcement learning to adjust posting cadence based on user engagement and system performance metrics.

### Self-Check Validator
- **Function**: Continuously verifies stored knowledge against new data.
- **Anchoring**: Compares community answers against "anchors" (trusted external data sources or historical facts).
- **Flagging**: Inconsistencies trigger a "Review" status, sending the question back to the Community Pool for re-evaluation.

### Storage
- **Insights**: Autonomous findings are logged to IPFS with a specific metadata tag (`source: autonomous`).
- **Retrieval**: These insights are accessible via Helia, providing a fast-path for factual queries.

---

## Knowledge Base
The Knowledge Base is the unified repository of all confirmed intelligence.

- **Structure**: A content-addressed graph of Q&A pairs, linked by topic and relevance.
- **Search**: Nodes use local indices and Helia's DHT to find answers by keywords or semantic similarity.
- **Audit Trail**: Every entry includes a link to its Governance Log (IPFS CID), proving *who* voted for it and *when* it was finalized.

---

## Integration with Helia & IPFS
The system relies on **Helia**, a modern, lightweight IPFS implementation, to function without centralized servers.

### Data Flow
1. **Submission**: A new question is hashed and announced to the swarm via Helia's PubSub.
2. **Voting**: Votes are signed messages, aggregated and stored as IPFS DAG objects.
3. **Finalization**: The consensus result is pinned by participating nodes, ensuring availability.
4. **Retrieval**: When a user asks a question, the system first checks the IPFS Knowledge Base using the question's hash.

### Benefits
- **Decentralization**: No central database to hack or censor.
- **Transparency**: Every piece of knowledge has a verifiable cryptographic history.
- **Persistence**: Popular knowledge is replicated across many nodes, making it resilient.
- **Interoperability**: Data stored in IPFS can be easily shared with other dApps and services.

---

## UI/UX Design
The Learning System is managed via a dedicated section in the NeuroSwarm Dashboard.

### Dashboard Tabs
1. **Question Pool**: View, submit, and upvote pending questions.
2. **Active Question**: Participate in the current voting round.
3. **Knowledge Base**: Search and browse confirmed facts.
4. **Interval Settings**: (Admin/Governance) Adjust voting cadence.

### Visualizations
- **Vote Distribution**: Bar charts showing real-time voting status for the Top-Five.
- **Timeline**: History of answer revisions and validations.
- **Activity**: Graphs showing learning rate (new facts/day).

### Notifications
- Alerts for new Active Questions.
- Notifications when a user's submitted question is selected or answered.

---

## Roadmap (Phase 16)
- **Phase 16a: Knowledge Miner**: Implement autonomous question generation and adapter sourcing.
- **Phase 16b: Adaptive Interval Controller**: Develop the logic for dynamic cadence adjustment.
- **Phase 16c: Self-Check Validator**: Build the verification engine and anchoring system.
- **Phase 16d: IPFS Integration**: Fully integrate Helia for storage and retrieval of all learning data.
- **Phase 17: Launch Top-Five**: Enable the community voting interface and governance mechanisms.

---

## Safeguards
- **Sybil Resistance**: Voting power is weighted by **Reputation Score**, earned through helpful contributions and accurate answers.
- **Spam Control**: Minimum reputation required to submit questions or post comments.
- **Revision Cycles**: A "Challenge" mechanism allows the community to propose corrections to existing answers.
- **Audit Logs**: All actions are immutable and linked to IPFS CIDs, ensuring full accountability.

---

## Getting Started (Phase 16 - Current Implementation)

### ✅ What's Working Now (v0.1.7)

The following components are **fully implemented and ready to test**:

#### 1. Math Calculator (Deterministic - Layer 1)
- **Status**: ✅ Production Ready
- **Test**: Ask "what is 23523 * 2048" or "calculate 100 + 50"
- **Response Time**: < 1ms
- **No IPFS storage**: Math results are deterministic, not cached

#### 2. Helia IPFS Integration (Embedded)
- **Status**: ✅ Production Ready
- **Features**: 
  - Runs automatically when app starts
  - No external daemon needed
  - Persistent storage in `ns-node/data/ipfs-repo/`
  - Local index in `ns-node/data/knowledge-index.json`

#### 3. Knowledge Storage (Automatic)
- **Status**: ✅ Production Ready
- **Triggers**: Automatically stores answers with confidence ≥ 0.8
- **Metadata**: Keywords, categories, expiry dates
- **Storage Location**: IPFS + local index

#### 4. Semantic Search (Layer 2)
- **Status**: ✅ Production Ready
- **Features**:
  - Exact question matching (normalized)
  - Keyword matching (2+ keywords)
  - Fuzzy search (different phrasing)
- **Response Time**: ~10-50ms for cache hits

---

## Testing Guide

### Quick Test Scenarios

#### Test 1: Math Calculator (Instant)
```
You: "what is 23523 * 2048"
Expected: Instant answer (48,175,104)
Verify: No IPFS storage (deterministic)
```

#### Test 2: First-Time Question (Cache Miss → Store)
```
You: "when was peru independent?"
Expected: Web search → Answer → Stored to IPFS
Check: ns-node/data/knowledge-index.json for new entry
```

#### Test 3: Repeated Question (Cache Hit)
```
You: "when was peru independent?"
Expected: Fast answer from IPFS cache (~10-50ms)
Verify: Log shows "Retrieved knowledge from IPFS"
```

#### Test 4: Semantic Search (Different Phrasing)
```
You: "peru independence date"
Expected: Finds cached answer via keyword matching
Verify: Answer matches previous query
```

#### Test 5: Expiry Test (Time-Sensitive)
```
You: "what is the latest news?"
Expected: Stored with 1-day expiry
Check: expiresAt field in knowledge-index.json
```

### Monitoring Knowledge Growth

**View Stored Knowledge:**
```powershell
# View local index
Get-Content ns-node\data\knowledge-index.json | ConvertFrom-Json | Format-List

# Count stored entries
(Get-Content ns-node\data\knowledge-index.json | ConvertFrom-Json).PSObject.Properties.Count
```

**IPFS Storage Location:**
```
ns-node/data/ipfs-repo/blocks/  # IPFS blocks
ns-node/data/knowledge-index.json  # Fast lookup index
```

### Expected Behavior

**Layer 1 (Deterministic):**
- Math queries → Instant answer
- NBA scores → Real-time data
- No IPFS storage

**Layer 2 (IPFS Cache):**
- First query → Cache miss → Web search → Store
- Repeat query → Cache hit → Fast retrieval
- Similar query → Keyword match → Found

**Layer 3 (Web/LLM):**
- New questions → Web search
- High confidence → Auto-store to IPFS
- Builds knowledge over time

### Troubleshooting

**If IPFS isn't working:**
1. Check logs for "Helia IPFS node started"
2. Verify `ns-node/data/ipfs-repo/` exists
3. Check `knowledge-index.json` for entries

**If cache isn't hitting:**
1. Verify question normalization (lowercase, no punctuation)
2. Check keyword extraction (2+ matching keywords needed)
3. Ensure answer was stored (confidence ≥ 0.8)

**Performance Benchmarks:**
- Math: < 1ms
- Cache hit: 10-50ms
- Web search: 1-3s
- IPFS storage: ~100ms (background)

---

## Roadmap Status

### Phase 16: Independent Learning ✅ COMPLETE
- [x] **16a: Knowledge Miner** - Math calculator, web search adapters
- [x] **16b: Adaptive Interval Controller** - Time-based expiry system
- [x] **16c: Self-Check Validator** - Confidence scoring, keyword validation
- [x] **16d: IPFS Integration** - Helia embedded node, semantic search

### Phase 17: Top-Five Community Learning 🚧 PLANNED
- [ ] Question Pool UI
- [ ] Voting mechanism
- [ ] Interval settings
- [ ] Community verification
- [ ] Governance integration

---

## Safeguards
- **Sybil Resistance**: Voting power is weighted by **Reputation Score**, earned through helpful contributions and accurate answers.
- **Spam Control**: Minimum reputation required to submit questions or post comments.
- **Revision Cycles**: A "Challenge" mechanism allows the community to propose corrections to existing answers.
- **Audit Logs**: All actions are immutable and linked to IPFS CIDs, ensuring full accountability.

---

## Next Steps (Phase 17)
1. ~~**Finalize Helia Integration**~~: ✅ Complete - Embedded `helia` node running
2. **Build APIs**: Create internal APIs for `submitQuestion`, `castVote`, and `getAnswer`
3. **Connect Dashboard**: Wire up the Electron frontend to the Helia backend for real-time updates
4. **Document Anchoring**: Detail the exact schema for storing governance logs on IPFS
