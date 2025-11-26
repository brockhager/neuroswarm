# NS-LLM Roadmap: Self-Contained AI Backend

## Vision
Build a fully decentralized, self-contained AI system where NeuroSwarm nodes run their own lightweight LLM backends without requiring external dependencies like Ollama or cloud APIs.

## Core Principles
1. **Zero External Dependencies** - Everything packaged and ready to run
2. **Transparent Governance** - Community decides on models and parameters
3. **Graceful Degradation** - Falls back to search adapters if LLM unavailable
4. **Cross-Platform** - Works on Windows, Mac, and Linux out of the box
5. **Contributor-Friendly** - No complex setup or configuration required

---

## Phase A: Embedding Backend

### Objectives
- Create a native embedding service that runs locally on each node
- Replace dependency on external Ollama for semantic search
- Enable knowledge graph traversal and similarity matching
- Integrate with existing semantic cache infrastructure

### API Contract

#### `/embed` - Generate text embeddings
```http
POST /embed
Content-Type: application/json

{
  "text": "What is the world population?",
  "model": "all-MiniLM-L6-v2"  // optional, uses default if omitted
}

Response:
{
  "embedding": [0.123, -0.456, ...],  // 384-dimensional vector
  "model": "all-MiniLM-L6-v2",
  "tokens": 7,
  "latency_ms": 45
}
```

#### `/health` - Backend health check
```http
GET /health

Response:
{
  "status": "healthy",
  "model": "all-MiniLM-L6-v2",
  "backend": "onnxruntime",
  "memory_mb": 125,
  "uptime_seconds": 3600
}
```

#### `/metrics` - Performance metrics
```http
GET /metrics

Response:
{
  "requests_total": 1547,
  "requests_failed": 3,
  "avg_latency_ms": 42,
  "cache_hits": 823,
  "cache_misses": 724,
  "memory_usage_mb": 125
}
```

### Model Selection

#### Criteria
- **Size**: < 100MB for embedding model
- **Quality**: Decent performance on semantic similarity tasks
- **Format**: ONNX (cross-platform, well-supported)
- **License**: Permissive (Apache 2.0, MIT)

#### Recommended Models
1. **all-MiniLM-L6-v2** (Primary choice)
   - Size: ~23MB (quantized ONNX)
   - Dimensions: 384
   - Performance: Good balance of speed/quality
   - License: Apache 2.0

2. **all-MiniLM-L12-v2** (Higher quality alternative)
   - Size: ~45MB (quantized ONNX)
   - Dimensions: 384
   - Performance: Better accuracy, slightly slower
   - License: Apache 2.0

### Technology Stack

#### Backend Runtime
- **ONNX Runtime** - Cross-platform inference engine
- **Language**: C++ for performance, thin Node.js wrapper
- **Process**: Standalone binary, communicates via HTTP/stdio

#### Node.js Integration
- **Client Library**: `ns-llm-client.js` 
- **Features**: Connection pooling, retries, circuit breaker
- **Fallback**: Degrades to keyword search if backend unavailable

### Architecture

```
┌─────────────────────────────────────────┐
│           NS Node (Port 3009)           │
│  ┌───────────────────────────────────┐  │
│  │   Semantic Cache & Search Layer   │  │
│  │   - Hybrid scoring                │  │
│  │   - Cache hits/misses             │  │
│  │   - Embedding queries             │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │      ns-llm-client.js             │  │
│  │   - Connection management         │  │
│  │   - Retries & timeouts            │  │
│  │   - Circuit breaker               │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼────────────────────────┘
                  │ HTTP/stdio
┌─────────────────▼────────────────────────┐
│      NS-LLM Backend (Port 5555)          │
│  ┌───────────────────────────────────┐   │
│  │     ONNX Runtime + Model          │   │
│  │   - all-MiniLM-L6-v2 (23MB)       │   │
│  │   - Inference engine              │   │
│  │   - Health monitoring             │   │
│  └───────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

### Integration with Existing Systems

#### Semantic Cache Enhancement
```javascript
// ns-node/src/services/knowledge-store.js
async function getSemanticMatches(query) {
  // 1. Generate embedding via NS-LLM backend
  const embedding = await nsLlmClient.embed(query);
  
  // 2. Search knowledge store
  const matches = await searchByEmbedding(embedding);
  
  // 3. Apply hybrid scoring (semantic + keyword)
  const scored = applyHybridScoring(matches, query);
  
  return scored;
}
```

#### Fallback Strategy
```javascript
// ns-node/src/services/semantic-service.js
async function search(query) {
  try {
    // Try NS-LLM backend first
    return await semanticSearch(query);
  } catch (err) {
    console.warn('NS-LLM unavailable, falling back to keyword search');
    // Fall back to keyword-based search
    return await keywordSearch(query);
  }
}
```

### Packaging Strategy

#### Directory Structure
```
neuroswarm/
├── dist/
│   └── ns-llm-backend/
│       ├── windows/
│       │   ├── ns-llm-backend.exe
│       │   └── models/
│       │       └── all-MiniLM-L6-v2.onnx
│       ├── macos/
│       │   ├── ns-llm-backend
│       │   └── models/
│       │       └── all-MiniLM-L6-v2.onnx
│       └── linux/
│           ├── ns-llm-backend
│           └── models/
│               └── all-MiniLM-L6-v2.onnx
└── ns-node/
    └── src/
        └── services/
            └── ns-llm-client.js
```

#### Binary Packaging
- Bundle ONNX Runtime + model in single executable
- Use UPX compression for smaller distribution size
- Include in ZIP/Electron installer alongside NS Node
- Auto-start on node initialization

### Health Check Integration

#### Dashboard Updates
```javascript
// brain-dashboard.html
async function loadNSLLMStatus() {
  try {
    const res = await fetch('http://localhost:5555/health');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('ns-llm-status').textContent = 'Online';
      document.getElementById('ns-llm-model').textContent = data.model;
      document.getElementById('ns-llm-memory').textContent = data.memory_mb + ' MB';
    }
  } catch (err) {
    document.getElementById('ns-llm-status').textContent = 'Offline';
  }
}
```

### Metrics & Monitoring

#### Learning Score Enhancement
```javascript
// Enhance learning score with embedding backend metrics
function calculateLearningScore(healthData) {
  let score = 100;
  
  // Existing cache hit/miss scoring
  score += healthData.activity.cacheHits * 1;
  score -= (healthData.activity.totalQueries - healthData.activity.cacheHits) * 2;
  
  // NEW: Bonus for NS-LLM backend availability
  if (healthData.nsLlm?.status === 'healthy') {
    score += 50; // Significant bonus for self-contained AI
  }
  
  // NEW: Penalty for high embedding latency (> 100ms)
  if (healthData.nsLlm?.avg_latency_ms > 100) {
    score -= 10;
  }
  
  return Math.max(1, Math.min(1000, Math.round(score)));
}
```

### Success Criteria

#### Phase A Complete When:
- [ ] NS-LLM embedding backend binary built for all platforms
- [ ] Model packaged and tested (< 100MB total size)
- [ ] API endpoints (`/embed`, `/health`, `/metrics`) functional
- [ ] Node.js client library with retries and fallback
- [ ] Integration with semantic cache verified
- [ ] Health checks visible in dashboard
- [ ] Documentation complete with setup instructions
- [ ] Zero external dependencies required

### Next Steps After Phase A
1. Measure embedding quality vs. external Ollama
2. Benchmark performance across platforms
3. Gather contributor feedback on installation experience
4. Prepare for Phase B: Generative Backend

---

## Phase B: Generative Backend

### Objectives
- Add text generation capabilities to NS-LLM backend
- Enable chat responses without external LLM services
- Implement strict resource limits for safety
- Maintain fallback to search adapters

### API Contract

#### `/generate` - Generate text completions
```http
POST /generate
Content-Type: application/json

{
  "prompt": "What is the world population?",
  "model": "tinyllama-1.1b",  // optional
  "max_tokens": 256,
  "temperature": 0.7,
  "stop": ["\n\n", "User:"]
}

Response:
{
  "text": "The world population is approximately 8 billion people as of 2024...",
  "model": "tinyllama-1.1b",
  "tokens_generated": 24,
  "latency_ms": 1850,
  "stop_reason": "eos_token"
}
```

### Model Selection

#### Criteria
- **Size**: 1-3GB (quantized to ~1GB)
- **Quality**: Reasonable for basic Q&A
- **Speed**: < 10 tokens/sec on CPU acceptable
- **Format**: GGUF (best quantization support)
- **License**: Permissive

#### Recommended Models
1. **TinyLlama-1.1B-Chat-v1.0** (Primary)
   - Size: ~637MB (Q4_K_M quantized)
   - Speed: ~15-20 tokens/sec on CPU
   - Quality: Good for simple queries
   - License: Apache 2.0

2. **Phi-2-2.7B** (Higher quality alternative)
   - Size: ~1.6GB (Q4_K_M quantized)
   - Speed: ~8-12 tokens/sec on CPU
   - Quality: Better reasoning
   - License: MIT

### Resource Limits

#### Hard Limits (Safety)
- **Max tokens per request**: 512
- **Max concurrent requests**: 2
- **Request timeout**: 30 seconds
- **Memory limit**: 2GB RAM
- **Queue size**: 5 requests

#### Graceful Degradation
```javascript
// If limits exceeded, fall back to search adapters
if (generationQueueFull() || memoryExceeded()) {
  return searchAdapterResponse(query);
}
```

### Integration Architecture

```
User Query → NS Node → Decision Tree:
                        ├─ Cache hit? → Return cached
                        ├─ Search adapter match? → Return search result
                        └─ Otherwise → NS-LLM generate (with timeout)
                            ├─ Success → Cache & return
                            └─ Failure → Return "LLM unavailable" message
```

### Success Criteria

#### Phase B Complete When:
- [ ] NS-LLM backend supports `/generate` endpoint
- [ ] Quantized generative model packaged (< 1.5GB)
- [ ] Resource limits enforced (tokens, memory, timeout)
- [ ] Fallback logic tested and working
- [ ] Response quality acceptable for basic queries
- [ ] Dashboard shows generation metrics
- [ ] Performance benchmarks documented

---

## Phase C: Node Orchestrator Integration

### Objectives
- Seamless integration between NS Node and NS-LLM backend
- Robust error handling and retries
- Circuit breaker pattern for backend failures
- Health monitoring and auto-recovery

### Client Library: `ns-llm-client.js`

#### Features
- **Connection pooling** - Reuse HTTP connections
- **Retry logic** - 3 attempts with exponential backoff
- **Circuit breaker** - Stop calling unhealthy backend
- **Timeout handling** - Prevent hanging requests
- **Metrics collection** - Track success/failure rates

#### API
```javascript
const nsLlm = require('./ns-llm-client');

// Embedding
const embedding = await nsLlm.embed('query text', { timeout: 5000 });

// Generation
const response = await nsLlm.generate('prompt', { 
  maxTokens: 256,
  timeout: 30000 
});

// Health check
const healthy = await nsLlm.isHealthy();
```

### Health Check Integration

#### Dashboard Updates
- Add NS-LLM status card to brain dashboard
- Show backend health, model info, latency
- Display circuit breaker state
- Real-time metrics updates

### Success Criteria

#### Phase C Complete When:
- [ ] `ns-llm-client.js` library implemented and tested
- [ ] Retry and circuit breaker logic verified
- [ ] Health checks integrated into NS Node startup
- [ ] Dashboard displays NS-LLM backend status
- [ ] Graceful fallback when backend unavailable
- [ ] Metrics visible in `/health` endpoint

---

## Phase D: Packaging & Distribution

### Objectives
- Bundle everything into single installer
- Support Windows, Mac, and Linux
- Zero-configuration setup for contributors
- Automated builds and updates

### Packaging Strategy

#### Distribution Formats
- **Windows**: ZIP with batch scripts + optional Electron installer
- **Mac**: DMG with app bundle
- **Linux**: AppImage or tar.gz

#### Contents
```
NeuroSwarm-v0.2.0/
├── start-all-nodes.bat (Windows)
├── start-all-nodes.sh (Mac/Linux)
├── ns-node/
│   └── server.js + dependencies
├── gateway-node/
│   └── server.js + dependencies
├── vp-node/
│   └── server.js + dependencies
├── ns-llm-backend/
│   ├── ns-llm-backend.exe (or binary)
│   └── models/
│       ├── all-MiniLM-L6-v2.onnx (23MB)
│       └── tinyllama-1.1b-q4.gguf (637MB)
├── dashboards/
│   ├── brain-dashboard.html
│   └── monitor-dashboard.html
└── README.md
```

### CI/CD Pipeline

#### Build Process
1. Compile NS-LLM backend for each platform
2. Download and quantize models
3. Package all components into installer
4. Sign binaries (Windows/Mac)
5. Generate checksums
6. Upload to GitHub Releases

### Auto-Update Mechanism
- Check for updates on startup
- Download delta updates (models skip if unchanged)
- Prompt user before updating
- Rollback capability if update fails

### Success Criteria

#### Phase D Complete When:
- [ ] Automated builds for Windows, Mac, Linux
- [ ] Single-click installers tested on all platforms
- [ ] Total package size < 2GB
- [ ] Setup time < 5 minutes on clean system
- [ ] Auto-update mechanism functional
- [ ] Signed binaries for security
- [ ] Installation documentation complete

---

## Phase E: Governance & Transparency

### Objectives
- Community control over model selection
- Transparent decision-making process
- Version control for models
- Contributor visibility into AI performance

### Governance Hooks

#### Model Selection Proposals
```javascript
// Proposal structure
{
  type: "model-adoption",
  model: "phi-2-2.7b",
  reason: "Better reasoning, worth the extra size",
  size_mb: 1600,
  benchmark_results: { ... },
  proposed_by: "contributor_address",
  voting_period_days: 7
}
```

#### Parameter Tuning Votes
```javascript
// Vote on runtime parameters
{
  type: "parameter-change",
  parameter: "max_tokens_per_request",
  current_value: 256,
  proposed_value: 512,
  reason: "Enable longer responses",
  proposed_by: "contributor_address"
}
```

### Model Manifests in IPFS

#### Manifest Format
```json
{
  "model_name": "tinyllama-1.1b-chat-v1.0",
  "version": "v1.0.0",
  "format": "gguf",
  "quantization": "Q4_K_M",
  "size_bytes": 668346368,
  "sha256": "abc123...",
  "ipfs_cid": "bafybei...",
  "license": "Apache-2.0",
  "approved_by_governance": true,
  "adoption_date": "2025-11-25",
  "metrics": {
    "avg_tokens_per_sec": 18.5,
    "memory_usage_mb": 1200,
    "quality_score": 7.2
  }
}
```

### Dashboard Transparency

#### Metrics Exposed
- Model version and size
- Inference latency (p50, p95, p99)
- Memory usage
- Success/failure rates
- Cache hit rates
- Cost per query (in compute resources)

### Success Criteria

#### Phase E Complete When:
- [ ] Governance proposals for models implemented
- [ ] Model manifests stored in IPFS with hashes
- [ ] Dashboard shows model version and metrics
- [ ] Contributors can propose and vote on changes
- [ ] Audit trail for all model adoptions
- [ ] Transparent performance metrics visible

---

## Phase F: Optimization & Scaling

### Objectives
- Maximize performance on available hardware
- Enable GPU acceleration when available
- Implement advanced inference optimizations
- Explore multi-node federation

### Performance Optimization

#### Quantization Strategies
- **Q4_K_M**: Best balance (current)
- **Q5_K_M**: Higher quality, slightly larger
- **Q8_0**: Near-fp16 quality, 2x size

#### Batching
- Group multiple embed requests
- Reduces overhead for high-traffic nodes
- Trade latency for throughput

#### KV-Cache Reuse
- Cache key-value states for chat sessions
- Reduces redundant computation
- Speeds up follow-up questions

### GPU Acceleration

#### When Available
- Detect CUDA/ROCm/Metal GPU
- Offload layers to GPU
- Hybrid CPU+GPU for large models
- Fall back to CPU-only if no GPU

### Federation Exploration

#### Multi-Node AI
- Nodes share model inferences
- Reputation-based result weighting
- Distributed caching across network
- Load balancing for popular queries

### Success Criteria

#### Phase F Complete When:
- [ ] GPU acceleration working when available
- [ ] Batching and KV-cache optimizations tested
- [ ] Performance benchmarks show 2-3x improvement
- [ ] Federation prototype demonstrates value
- [ ] Documentation covers optimization tuning
- [ ] Contributor guide for performance profiling

---

## Implementation Timeline

### Estimated Duration
- **Phase A (Embedding Backend)**: 2-3 weeks
- **Phase B (Generative Backend)**: 2-3 weeks
- **Phase C (Integration)**: 1-2 weeks
- **Phase D (Packaging)**: 2-3 weeks
- **Phase E (Governance)**: 1-2 weeks
- **Phase F (Optimization)**: 3-4 weeks

**Total**: ~3-4 months for full implementation

### Milestones
1. **M1**: Embedding backend functional (End of Phase A)
2. **M2**: Generation working locally (End of Phase B)
3. **M3**: Integrated and packaged (End of Phase D)
4. **M4**: Governed and optimized (End of Phase F)

---

## Design Principles

### Move Slowly, Detail Each Phase
- Document every decision before implementation
- Review alternatives and trade-offs
- Get contributor feedback at each milestone
- Iterate on design before writing code

### Zero-Setup Contributor Experience
- No manual dependency installation
- Single download, double-click to run
- Works offline after initial setup
- Clear error messages with fixes

### Transparent Governance
- All decisions go through proposals
- Model choices voted on by contributors
- Performance metrics publicly visible
- Audit trail for accountability

### Graceful Degradation
- System works even if NS-LLM backend fails
- Falls back to search adapters
- Clear messaging when features unavailable
- No silent failures

---

## Next Steps

1. **Expand Phase A Details**: Define exact API contracts, select embedding model, design packaging
2. **Prototype Embedding Backend**: Build minimal working version
3. **Test Integration**: Verify semantic cache works with NS-LLM
4. **Document Findings**: Share results with contributors
5. **Get Feedback**: Iterate on design before Phase B

This roadmap provides a clear path to a fully self-contained, decentralized NeuroSwarm AI system. Each phase builds on the previous, ensuring steady progress toward the goal of zero-dependency, contributor-friendly deployment.
