# Phase A: Embedding Backend

## Objectives
- Create a native embedding service that runs locally on each node
- Replace dependency on external Ollama for semantic search
- Enable knowledge graph traversal and similarity matching
- Integrate with existing semantic cache infrastructure

## API Contract

### `/embed` - Generate text embeddings
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

### `/health` - Backend health check
Response:
{
  "status": "healthy",
  "model": "all-MiniLM-L6-v2",
  "backend": "onnxruntime",
  "memory_mb": 125,
  "uptime_seconds": 3600
}
```

### `/metrics` - Performance metrics
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

## Model Selection

### Criteria
- **Size**: < 100MB for embedding model
- **Quality**: Decent performance on semantic similarity tasks
- **Format**: ONNX (cross-platform, well-supported)
- **License**: Permissive (Apache 2.0, MIT)

### Recommended Models
1. **all-MiniLM-L6-v2** (Primary choice)
   - License: Apache 2.0

2. **all-MiniLM-L12-v2** (Higher quality alternative)
   - Performance: Better accuracy, slightly slower
   - License: Apache 2.0

### Backend Runtime

### Node.js Integration
- **Features**: Connection pooling, retries, circuit breaker
- **Fallback**: Degrades to keyword search if backend unavailable

## Architecture

```
┌─────────────────────────────────────────┐
│           NS Node (Port 3009)           │
│  ┌───────────────────────────────────┐  │
│  │   Semantic Cache & Search Layer   │  │
│  │   - Hybrid scoring                │  │
│  │   - Cache hits/misses             │  │
│  │   - Embedding queries             │  │
│  └──────────────┬────────────────────┘  │
│  ┌──────────────▼────────────────────┐  │
│  │      ns-llm-client.js             │  │
│  │   - Connection management         │  │
│  │   - Circuit breaker               │  │
│  └──────────────┬────────────────────┘  │
│      NS-LLM Backend (Port 5555)          │
│  ┌───────────────────────────────────┐   │
│  │   - all-MiniLM-L6-v2 (23MB)       │   │
│  │   - Inference engine              │   │
```

## Integration with Existing Systems

### Semantic Cache Enhancement
  const embedding = await nsLlmClient.embed(query);
  
  // 2. Search knowledge store
  const matches = await searchByEmbedding(embedding);
  
  // 3. Apply hybrid scoring (semantic + keyword)
  const scored = applyHybridScoring(matches, query);
  
  return scored;
}
```

### Fallback Strategy
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

## Packaging Strategy

### Directory Structure
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

### Binary Packaging
- Bundle ONNX Runtime + model in single executable
- Use UPX compression for smaller distribution size
- Include in ZIP/Electron installer alongside NS Node
- Auto-start on node initialization

## Health Check Integration

### Dashboard Updates
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

Note: Completed — `ns-node` now includes an `nsLlm` object in the `/health` response and the dashboard renders an NS‑LLM status card. A smoke test script (`ns-node/scripts/test-smoke-ns-llm.js`) was added to validate end‑to‑end integration.

CI Integration: the Phase A native build workflow now includes an integration job that starts the NS‑LLM prototype (or the native binary artifact when available) and the NS Node server, runs the health smoke test and an end‑to‑end `/embed` test. This ensures both health and embedding paths are exercised in CI and prevents regressions.

Multi-OS CI: To validate actual shipping artifacts we extended the integration job into a matrix across Ubuntu, macOS and Windows. For each runner the workflow attempts to download the per-platform `ns-llm-native-<runner>` artifact produced by the native build step and starts it (or falls back to the Node prototype). After running the smoke and non-strict E2E tests the workflow also runs a strict embed check (STRICT_EMBED_DIM=1) to validate the native execution path.

Multi-OS ONNX validation: The CI now performs ONNX inference validation for Ubuntu, macOS and Windows. For each platform the build job will attempt to:

  - Attempts to download a prebuilt ONNX Runtime package for the runner and places it under `neuroswarm/NS-LLM/native/onnxruntime` so CMake can link to it.
  - Installs `model-pipeline/requirements.txt` and runs `download_and_export.py` to produce a quantized `all-MiniLM-L6-v2.onnx` under `neuroswarm/NS-LLM/models/`.
  - Re-configures and builds the native binary with `-DPROTOTYPE_ONLY=OFF` so the produced binary is capable of real ONNX inference.
  - The build job uploads the platform-specific artifact (e.g. `ns-llm-native-ubuntu-latest`, `ns-llm-native-macos-latest`, `ns-llm-native-windows-latest`) for integration jobs to test.

Strict numeric checks: The E2E embed test supports additional runtime checks for numeric values if `CHECK_EMBED_RANGE=1` is set — and will fail CI if `STRICT_EMBED_RANGE=1` is enabled. This is useful for ensuring embeddings from the native ONNX binary are sane (not NaN/Inf and within expected ranges).

Strict enforcement baseline: CI integration jobs now enable `STRICT_EMBED_DIM=1`, `CHECK_EMBED_RANGE=1`, and `STRICT_EMBED_RANGE=1` by default for all integration jobs. Dimension or numeric-range mismatches will fail the job (no longer warn-only). This guarantees all artifacts across Ubuntu, macOS and Windows produce embeddings of the correct shape and sane numeric ranges before being accepted.

## Metrics & Monitoring

### Learning Score Enhancement
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

## Success Criteria

### Phase A Complete When:
- [ ] NS-LLM embedding backend binary built for all platforms
- [ ] Model packaged and tested (< 100MB total size)
- [ ] API endpoints (`/embed`, `/health`, `/metrics`) functional
- [ ] Node.js client library with retries and fallback
- [ ] Integration with semantic cache verified
- [ ] Health checks visible in dashboard
- [ ] Documentation complete with setup instructions
- [ ] Zero external dependencies required

## Production‑Ready (Phase A)

This project has reached Phase A production readiness when all of the following are satisfied:

- Native artifacts for Ubuntu, macOS and Windows are built and validated in CI.
- CI enforces strict shape and numeric checks for embeddings (shape: 384 dims, no NaN/Inf, values within expected numeric ranges).
- Each native artifact is uploaded as a platform-named artifact (e.g. `ns-llm-native-ubuntu-latest`).
- A manifest and checksums are produced and uploaded alongside each artifact; where a signing key is available in CI secrets the checksums are also signed.
- Integration tests (smoke + E2E embed + strict checks) pass against the uploaded artifacts.

All of those checks are now enforced by CI across Ubuntu, macOS and Windows; artifacts accepted by CI are considered validated for Phase A.

If you maintain the repository, you can now promote Phase A to production-ready and proceed to Phase B with confidence that we have cross-platform validated native inference artifacts.

Dashboard confirmation
----------------------
The dashboard (`ns-node/public/dashboard.html`) now shows NS‑LLM status, `model` and `backend` fields. A sample dashboard screenshot is included at `ns-node/public/assets/ns-llm-dashboard-screenshot.svg` showing the NS‑LLM card, model name and backend type.

Publishing artifacts & checksums
-------------------------------
CI build jobs upload per-platform artifacts as `ns-llm-native-<runner>` and generate `checksums.txt` and `manifest.json` alongside them. If a `GPG_PRIVATE_KEY` and `GPG_PASSPHRASE` are configured in repository secrets the CI will sign checksums and upload `checksums.txt.sig` as well. A manual `workflow_dispatch` publish job is available to create a GitHub Release and attach the artifacts (or set `PUBLISH_ARTIFACTS=1` in your CI to auto-publish).


## Production tasks (current work)

The following items are being implemented now to transition Phase A from prototype → production. All artifacts are CI-friendly and support a `--stub` mode so CI and contributors can run tests without ONNX runtime or large model files.

- Native runtime scaffold (stdio-mode)
  - Location: `neuroswarm/NS-LLM/native/`
  - Description: C++ scaffold with `CMakeLists.txt` and `--stub` support. This lets us exercise the native code path in CI without ONNX libs or models.

- Node shim (safe fallback)
  - Location: `neuroswarm/NS-LLM/native-shim.js`
  - Description: Attempts to spawn and talk to the native stdio binary; if binary missing or fails, it falls back to the existing HTTP prototype at `127.0.0.1:5555`. This keeps local development simple and safe.

- CI-friendly build scripts
  - Location: `neuroswarm/NS-LLM/native/build.sh` (and eventual `build.bat`)
  - Purpose: build prototype-only binary in CI quickly so the shim and tests can be exercised.

- Tests & benchmarks
  - Tests added to `neuroswarm/NS-LLM/` (integration + shim tests). Benchmarks live in `benchmark.js` and are used to measure embed latency for phase validation.

Note: after the team verifies the stubbed native binary and shim in CI we will add model packaging (quantized ONNX), checksums/IPFS manifests, and the real ONNX inference path inside the native code.

## JSON handling strategy

The native scaffold uses a lightweight, dependency-free JSON strategy to stay self-contained for CI and early packaging:

- Parsing: use simple string scanning for flat input fields (e.g., {"cmd":"embed","text":"..."}). This is robust for the small command set we expose and avoids bundling a JSON library into the binary for Phase A.
- Emission: use small helper builders for health/metrics/embed to produce predictable flat JSON strings. These builders return only the keys consumers need, keeping the surface area intentionally small.

Why this approach?
- Keeps the native binary small and cross-compile friendly (no heavy header dependencies).
- Sufficient for Phase A where inputs and outputs are flat, predictable structures.
- If Phase B requires richer nested JSON (chat sessions, context lists), we'll adopt a full JSON library such as `nlohmann/json.hpp`.

Tests: integration tests (`test-shim.js`, `test-native-inference.js`) validate the expected JSON keys and schemas for health, metrics and embed responses so we detect regressions early in CI.
## Native integration: ONNX Runtime (build requirements)

To compile the native inference path you need the ONNX Runtime C++ development libs and headers available to CMake. Two common options:

- Set `ONNXRUNTIME_DIR` environment variable pointing at a local ONNX Runtime install (root folder containing include/ and lib/). Example:

  - Linux/macOS: /opt/onnxruntime
  - Windows: C:\\onnxruntime

- Install a platform-appropriate ONNX Runtime distribution and make headers and libs available to the build host (CI reproducible via download step).

If ONNX Runtime cannot be located, CMake will still build the binary but without inference support; the binary will continue to support `--stub` mode for development or CI. The `native-shim.js` will detect the presence of the binary and prefer it. If the binary is missing or crashes, the shim will fall back to the HTTP prototype.

### Example local build (stub mode)

```bash
mkdir -p neuroswarm/NS-LLM/native/build
cd neuroswarm/NS-LLM/native/build
cmake .. -DPROTOTYPE_ONLY=ON
cmake --build . --config Release
./ns-llm-native --stub
```

### Example local build (with ONNX Runtime installed)

```bash
export ONNXRUNTIME_DIR=/opt/onnxruntime
mkdir -p neuroswarm/NS-LLM/native/build
cd neuroswarm/NS-LLM/native/build
cmake .. -DPROTOTYPE_ONLY=OFF
cmake --build . --config Release
./ns-llm-native
```


## Packaging placeholders added

To make packaging and verification work straightforward later we added placeholder tooling and manifests under `neuroswarm/NS-LLM/models/`:

- `models/manifest.example.json` — example model manifest format (IPFS CID, sha256, size)
- `models/checksums.example.txt` — example list format
- `compute-checksums.js` — small helper script that computes sha256 checksums for files under `models/` and writes `models/checksums.txt` (used by CI and packaging).

- `verify-models.js` — validation script to verify `models/checksums.txt` entries match files on disk (CI friendly, returns non‑zero on failure).

These files are intentionally examples/placeholder artifacts so we can integrate model packaging and verification without reworking the repo later.

## Next Steps After Phase A
1. Measure embedding quality vs. external Ollama
2. Benchmark performance across platforms
3. Gather contributor feedback on installation experience
4. Prepare for Phase B: Generative Backend
