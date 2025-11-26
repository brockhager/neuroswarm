# NS-LLM: Self-Contained AI Backend

## Vision
Build a fully decentralized, self-contained AI system where NeuroSwarm nodes run their own lightweight LLM backends without requiring external dependencies like Ollama or cloud APIs.

## Core Principles
1. **Zero External Dependencies** - Everything packaged and ready to run
2. **Transparent Governance** - Community decides on models and parameters
3. **Graceful Degradation** - Falls back to search adapters if LLM unavailable
4. **Cross-Platform** - Works on Windows, Mac, and Linux out of the box
5. **Contributor-Friendly** - No complex setup or configuration required

---

## Development Phases

### [Phase A: Embedding Backend](Phase-A-Embedding-Backend.md)
Create a native embedding service that runs locally on each node using ONNX Runtime and all-MiniLM-L6-v2 (23MB). This replaces external Ollama for semantic search and enables knowledge graph traversal.

**Key Deliverables:**
- `/embed` API endpoint for text embeddings
- ONNX Runtime backend (cross-platform)
- Integration with semantic cache
- Dashboard health monitoring

---

### [Phase B: Generative Backend](Phase-B-Generative-Backend.md)
Add text generation capabilities using TinyLlama-1.1B-Chat (~637MB quantized). Enable chat responses without external LLM services while maintaining strict resource limits.

**Key Deliverables:**
- `/generate` API endpoint with resource limits
- Quantized GGUF model packaging
- Fallback logic to search adapters
- Performance benchmarks

---

### [Phase C: Integration](Phase-C-Integration.md)
Seamless integration between NS Node and NS-LLM backend with robust error handling, retries, and circuit breaker patterns.

**Key Deliverables:**
- `ns-llm-client.js` orchestrator library
- Connection pooling and retry logic
- Health monitoring and auto-recovery
- Dashboard status display

---

### [Phase D: Packaging](Phase-D-Packaging.md)
Bundle everything into single-click installers for Windows, Mac, and Linux. Zero-configuration setup for contributors with automated builds and updates.

**Key Deliverables:**
- Platform-specific installers (< 2GB total)
- Automated CI/CD pipeline
- Auto-update mechanism
- Signed binaries

---

### [Phase E: Governance](Phase-E-Governance.md)
Community control over model selection and parameters through transparent governance. Model manifests stored in IPFS with voting mechanisms.

**Key Deliverables:**
- Model adoption proposals
- Parameter tuning votes
- IPFS model manifests
- Dashboard transparency metrics

---

### [Phase F: Optimization](Phase-F-Optimization.md)
Maximize performance through GPU acceleration, batching, KV-cache reuse, and explore multi-node federation for distributed AI.

**Key Deliverables:**
- GPU acceleration support
- Advanced inference optimizations
- 2-3x performance improvements
- Federation prototype

---

## Implementation Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| **Phase A** | 2-3 weeks | Embedding backend functional |
| **Phase B** | 2-3 weeks | Generation working locally |
| **Phase C** | 1-2 weeks | Client library integrated |
| **Phase D** | 2-3 weeks | Packaged and distributed |
| **Phase E** | 1-2 weeks | Governance implemented |
| **Phase F** | 3-4 weeks | Optimized and scaled |
| **Total** | ~3-4 months | Full self-contained AI system |

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

## Technical Architecture

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
│  │   Embedding: all-MiniLM-L6-v2     │   │
│  │   Generation: TinyLlama-1.1B      │   │
│  │   Runtime: ONNX + GGUF            │   │
│  │   Health monitoring               │   │
│  └───────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

---

## Next Steps

1. Review [Phase A: Embedding Backend](Phase-A-Embedding-Backend.md) in detail
2. Prototype minimal working version
3. Test integration with semantic cache
4. Gather contributor feedback
5. Iterate before proceeding to Phase B

---

## Prototyping app (local)

There is a lightweight prototype implementation you can run locally inside the repository at `neuroswarm/NS-LLM/`. It provides a deterministic embedding server used for development and integration tests.

Quick start (from repo root):

```powershell
cd neuroswarm/NS-LLM
node index.js
```

## Full Roadmap Reference
See [ROADMAP.md](ROADMAP.md) for the complete consolidated document.
