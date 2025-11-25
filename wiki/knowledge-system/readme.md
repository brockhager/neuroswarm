# Knowledge Retrieval Pipeline Design

## Overview
This document outlines the design for the NeuroSwarm Knowledge Retrieval Pipeline. The system is designed to provide accurate, verifiable, and efficient answers by orchestrating multiple data sources: specialized adapters, decentralized knowledge storage (IPFS), and local Large Language Models (LLMs).

## Retrieval Order
The pipeline follows a strict hierarchy to ensure efficiency and accuracy:

1.  **Specialized Adapters (Deterministic)**
    *   **Purpose**: Handle queries with precise, real-time, or calculable answers.
    *   **Examples**: Math calculations, Crypto prices (CoinGecko), Weather, Sports scores.
    *   **Action**: If an adapter returns a high-confidence result, return immediately.

2.  **IPFS Knowledge Storage (Persistent)**
    *   **Purpose**: Retrieve previously validated answers and governance logs.
    *   **Mechanism**: Query Helia/IPFS using semantic embeddings or keyword hashes.
    *   **Action**: If a matching, high-confidence record is found, return the stored answer.

3.  **Local LLM (Reasoning & Synthesis)**
    *   **Purpose**: Synthesize information, handle complex reasoning, or provide fallback answers.
    *   **Inputs**: User query + Context from Adapters (if partial) + Context from IPFS.
    *   **Action**: Generate a coherent response based on available context.

4.  **Integration & Validation**
    *   **Purpose**: Combine sources into a final response.
    *   **Action**: The LLM formats the final output, citing sources (e.g., "According to CoinGecko...").

5.  **Storage (Learning)**
    *   **Purpose**: Improve future performance.
    *   **Action**: High-confidence, validated answers are stored back into IPFS.

## Query Classification
Queries are classified into three types to determine the routing:

*   **Type A: Deterministic** (e.g., "What is 2+2?", "Price of BTC") -> Route to **Adapters**.
*   **Type B: Historical/Governance** (e.g., "What was proposal 123?") -> Route to **IPFS**.
*   **Type C: Generative/Complex** (e.g., "Explain the impact of...") -> Route to **LLM** (with IPFS context).

## Integration Flow
```mermaid
graph TD
    A[User Query] --> B{Classifier}
    B -- Deterministic --> C[Adapters]
    B -- Historical --> D[IPFS Storage]
    B -- Complex --> E[Local LLM]
    
    C --> F{Result Found?}
    F -- Yes --> G[Return Result]
    F -- No --> E
    
    D --> H{Result Found?}
    H -- Yes --> G
    H -- No --> E
    
    E --> I[Synthesize Answer]
    I --> J[Validate Confidence]
    J -- High --> K[Store in IPFS]
    K --> G
    J -- Low --> G
```

## Storage & Logging
*   **Storage Engine**: Helia (IPFS implementation for JS).
*   **Data Structure**:
    ```json
    {
      "query_hash": "sha256...",
      "embedding": [0.1, 0.2, ...],
      "answer": "The answer text...",
      "source": "adapter_name" | "llm_model",
      "confidence": 0.95,
      "timestamp": "ISO8601",
      "validations": 0
    }
    ```
*   **Logging**: All retrieval attempts and their sources are logged to the local governance log for transparency.

## Testing Strategy

Before implementing Phase 2 enhancements, the current pipeline must be thoroughly tested:

### Test Suite 1: Deterministic Queries
**Purpose**: Validate adapter routing and response formatting.

| Query | Expected Adapter | Expected Result |
|-------|-----------------|-----------------|
| "What is 2+2?" | `math-calculator` | Instant calculation result |
| "Price of BTC" | `coingecko` | Current Bitcoin price |
| "NBA scores today" | `nba-scores` | Live/recent game scores |
| "Latest news" | `news-aggregator` | Top headlines |

**Success Criteria**: Each query routes to the correct adapter and returns a properly formatted response.

### Test Suite 2: IPFS Cache Performance
**Purpose**: Validate storage and retrieval from IPFS.

1. **Cache Miss**: Ask a novel question → Verify it's answered and stored to IPFS
2. **Cache Hit**: Ask the same question again → Verify it's retrieved from IPFS (faster response)
3. **Storage Validation**: Check IPFS logs to confirm high-confidence answers are stored
4. **Retrieval Speed**: Measure response time for cached vs. uncached queries

**Success Criteria**: Cache hits are significantly faster; storage only occurs for confidence ≥ 0.8.

### Test Suite 3: LLM Synthesis
**Purpose**: Validate context collection and LLM integration.

| Query Type | Test Query | Expected Behavior |
|------------|-----------|-------------------|
| Ambiguous | "Explain quantum computing" | LLM synthesizes answer |
| With Context | "What's the ROI of BTC?" (after price query) | LLM uses CoinGecko context |
| Uncertain | "Will it rain tomorrow?" | LLM admits uncertainty or uses weather adapter |

**Success Criteria**: LLM receives collected context; answers are coherent and cite sources when applicable.

### Test Suite 4: Fallback Chain
**Purpose**: Ensure graceful degradation when services fail.

1. **Local LLM Offline**: Stop Ollama → Verify fallback to OpenAI
2. **Both LLMs Offline**: Stop both → Verify generic fallback message
3. **Adapter Failure**: Simulate CoinGecko timeout → Verify LLM fallback
4. **Network Failure**: Disconnect internet → Verify IPFS cache still works

**Success Criteria**: No crashes; users always receive a response (even if it's "service unavailable").

### Test Documentation
After each test suite, document:
- ✅ Pass/Fail status
- Response times
- Error logs (if any)
- Unexpected behaviors
- Recommendations for improvement

## Safeguards
1.  **Redundancy Check**: Check IPFS before calling expensive external APIs or LLM generation.
2.  **Stale Data Prevention**: IPFS records include a TTL (Time To Live) or validity timestamp. Expired records trigger a fresh fetch.
3.  **Hallucination Mitigation**: The LLM is instructed to prioritize provided context (Adapters/IPFS) over its internal training data.
4.  **Rate Limiting**: External adapter calls are rate-limited to prevent API bans.

## Embedding Workflow

The semantic embedding integration enhances the knowledge retrieval pipeline with vector-based similarity search for improved cache hit rates on paraphrased queries.

### Embedding Generation
- **Model**: Llama 3.2 via local Ollama instance (`http://localhost:11434/api/embeddings`)
- **Vector Dimensions**: 3072 (model-dependent)
- **Storage**: Embeddings stored in `knowledge-index.json` alongside traditional metadata
- **Trigger**: Automatic generation during high-confidence answer storage (confidence ≥ 0.8)

### Semantic Cache Lookup
- **Position**: Executed before adapter processing in the chat route
- **Algorithm**: Cosine similarity comparison between query embedding and stored embeddings
- **Threshold**: Default 0.8 similarity score (configurable)
- **Fallback**: If no semantic match found, proceeds to adapter-based retrieval

### Schema Compatibility
- **Backward Compatibility**: Entries without embeddings are ignored in semantic search
- **Index Structure**: Maintains existing hash-based lookup while adding vector search capability
- **Performance**: Semantic search adds ~3-5 seconds latency (Ollama embedding generation time)

### Testing Outcomes
- **Verified**: Embedding generation works locally with consistent 3072-dimension vectors
- **Schema**: Existing entries without embeddings maintain full functionality
- **Cache Hits**: Semantic matches detected for paraphrased queries ("Bitcoin value" → "price of btc")
- **Threshold Tuning**: 0.8 similarity provides good balance between precision and recall

## Hybrid Retrieval & Scoring

The hybrid retrieval system combines semantic similarity with confidence scoring for optimal cache performance.

### Dynamic Threshold Adjustment
- **Deterministic Queries** (math, prices, scores, news): Similarity threshold = 0.9 (higher precision)
- **Fuzzy Queries** (general knowledge, complex reasoning): Similarity threshold = 0.7 (higher recall)
- **Default**: 0.8 for unclassified queries

### Confidence Integration
- **Hybrid Score**: Similarity × Confidence (normalized)
- **Storage Filter**: Only answers with confidence ≥ 0.8 are stored and cached
- **Retrieval Priority**: High-confidence cached answers preferred over adapter calls

### Hybrid Retrieval Workflow Diagram

```mermaid
graph TD
    A[User Query] --> B{Is Question?}
    B -->|No| C[Statement Response]
    B -->|Yes| D[Classify Query Type]

    D --> E[Deterministic Query?]
    E -->|Yes| F[High Threshold 0.9]
    E -->|No| G[Low Threshold 0.7]

    F --> H[Generate Query Embedding]
    G --> H

    H --> I[Semantic Similarity Search]
    I --> J{Similarity ≥ Threshold?}
    J -->|No| K[Adapter Processing]
    J -->|Yes| L[Retrieve Cached Answer]

    L --> M{Confidence ≥ 0.8?}
    M -->|No| K
    M -->|Yes| N[Return Cached Result<br/>+ Similarity Score]

    K --> O[Process Adapters]
    O --> P[Generate Response]
    P --> Q{Store to IPFS?}
    Q -->|Confidence ≥ 0.8| R[Generate Answer Embedding<br/>+ Store with Metadata]
    Q -->|No| S[Skip Storage]

    R --> T[Response]
    S --> T
    N --> T
    C --> T
```

### Performance Characteristics
- **Embedding Generation**: ~3.32 seconds (Ollama llama3.2)
- **Vector Dimensions**: 3072
- **Similarity Algorithm**: Cosine similarity
- **Cache Hit Latency**: < 100ms (post-embedding)
- **Threshold Dynamics**: 0.9 deterministic, 0.7 fuzzy queries

### Test Results
- **Deterministic Query** ("BTC price"): Threshold 0.9, similarity 0.92, confidence 0.9 → Cache hit
- **Fuzzy Query** ("Bitcoin value"): Threshold 0.7, similarity 0.89, confidence 0.9 → Cache hit
- **Paraphrase Detection**: "BTC worth today" → 0.85 similarity (cache hit with fuzzy threshold)

## Known Issues

### Server Stability
- **Issue**: Node.js server crashes on startup when semantic cache imports are present
- **Cause**: Import dependencies in `knowledge-store.js` causing module resolution failures
- **Impact**: Prevents testing of semantic features in live environment
- **Workaround**: Comment out semantic imports for basic functionality
- **Resolution**: Added graceful import handling with try-catch blocks. Server now starts with semantic features disabled if imports fail. Check `/health` endpoint for semantic status.

### Ollama Dependency
- **Issue**: Semantic features require running Ollama instance
- **Impact**: Offline operation falls back to keyword-only search
- **Mitigation**: Added health check function `checkOllamaHealth()` that verifies Ollama availability before embedding requests. Graceful degradation to basic search if unavailable.

### Embedding Latency
- **Issue**: 3-5 second delay for embedding generation impacts real-time responses
- **Impact**: Semantic cache adds latency to first query in session
- **Mitigation**: Implemented retry logic with exponential backoff (up to 3 attempts). Added 30-second timeout per request. Batch embedding script available for pre-processing existing entries.

## Contributor Guide

### Understanding Hybrid Retrieval Logic

The NeuroSwarm knowledge retrieval system uses a two-tier scoring mechanism to determine the best cached response:

#### 1. Semantic Similarity (0.0 - 1.0)
- **What it measures**: How semantically close the user's query is to stored answers
- **How it's calculated**: Cosine similarity between query embedding and cached answer embeddings
- **Model**: Llama 3.2 via Ollama (3072-dimension vectors)
- **Thresholds**:
  - Deterministic queries (math, prices, scores): ≥ 0.9 (strict matching)
  - Fuzzy queries (general knowledge): ≥ 0.7 (loose matching)

#### 2. Confidence Score (0.0 - 1.0)
- **What it measures**: Reliability of the cached answer based on source and validation
- **How it's calculated**: Weighted combination of:
  - Source reliability (30%): Adapter vs LLM source
  - Answer completeness (25%): Response quality metrics
  - Cross-validation (10%): Multiple source agreement
  - Response quality (15%): Formatting and citation
  - Context utilization (10%): How well context was used
- **Storage threshold**: Only answers with confidence ≥ 0.8 are cached

#### 3. Hybrid Scoring
- **Formula**: `Similarity × Confidence`
- **Purpose**: Balances semantic relevance with answer quality
- **Decision logic**:
  ```javascript
  if (similarity >= threshold && confidence >= 0.8) {
      return cachedAnswer; // Cache hit
  } else {
      processAdapters(); // Fresh lookup
  }
  ```

#### 4. Query Classification
Queries are automatically classified as deterministic or fuzzy:
- **Deterministic**: Math calculations, crypto prices, sports scores, news headlines
- **Fuzzy**: General knowledge, explanations, complex reasoning

#### 5. Development Workflow
1. **Add new adapters**: Update classification regex in `chat.js`
2. **Tune thresholds**: Modify similarity thresholds based on query type
3. **Monitor performance**: Check `/health` endpoint for semantic feature status
4. **Batch embed existing data**: Run `node batch-embed.js` for legacy entries

#### 6. Testing Semantic Features
- Use `/health` endpoint to verify Ollama and IPFS status
- Test with paraphrased queries to validate similarity thresholds
- Monitor logs for cache hit rates and confidence breakdowns
- Run batch embedding to ensure all entries have vectors

## Roadmap

    - Weight adapter contributions based on relevance

- [ ] **Governance Logging**:
    - Log all retrieval decisions to governance logs
    - Track which adapters were queried and why
    - Record confidence scores and storage decisions
    - Enable audit trail for transparency
    - Anchor critical decisions to blockchain

### Phase 4: Optimization
- [ ] Add feedback mechanism for users to validate/invalidate IPFS records
- [ ] Implement TTL (Time To Live) for time-sensitive data
- [ ] Add rate limiting and caching for external APIs
- [ ] Optimize LLM context window usage

