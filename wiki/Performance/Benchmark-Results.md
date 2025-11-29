# Performance Benchmark Results

**Latest Update**: 2025-11-28  
**Phase G Target**: <80ms/token, >12 tokens/second

This document tracks NeuroSwarm's performance metrics and validates Phase G performance targets.

---

## 📊 Current Results

### Inference Latency Benchmark

**Test Configuration:**
- **Benchmark**: `ns-node/benchmarks/inference_latency.js`
- **Requests**: 50 requests (after 5 warmup requests)
- **Model**: llama3.2:3b
- **Token Range**: 20-50 tokens per request
- **Environment**: Local development (Docker Compose)

**Latest Results** (Run on: PENDING)

| Metric | Average | P50 | P95 | P99 | Target | Status |
|--------|---------|-----|-----|-----|--------|--------|
| **Time to First Token (TTFT)** | TBD ms | TBD ms | TBD ms | TBD ms | <100ms | ⏳ |
| **Per-Token Latency** | TBD ms | TBD ms | TBD ms | TBD ms | <80ms | ⏳ |
| **End-to-End** | TBD ms | TBD ms | TBD ms | TBD ms | - | ⏳ |
| **Throughput** | TBD tok/s | TBD tok/s | - | - | >12 tok/s | ⏳ |

**Overall**: ⏳ Pending validation

---

## 🚀 How to Run Benchmarks

### Prerequisites

1. **Start NeuroSwarm nodes:**
   ```powershell
   cd neuroswarm
   .\onboarding\onboard.ps1 -Full -Detach
   ```

2. **Verify services are healthy:**
   ```powershell
   curl http://localhost:3009/health
   ```

### Run Inference Latency Benchmark

```powershell
cd neuroswarm/ns-node
$env:NS_NODE_URL="http://localhost:3009"
node benchmarks/inference_latency.js
```

**Expected output:**
```
🔥 Inference Latency Benchmark

Target: <80ms/token, >12 tokens/second

Warming up (5 requests)...

Running benchmark (50 requests)...

[50/50] Tokens/sec: 15.23

============================================================
 RESULTS
============================================================

📊 Latency Metrics:
  Time to First Token (TTFT):
    Average: 32.45ms
    P50:     30.12ms
    P95:     42.67ms ✓

  Per-Token Latency:
    Average: 65.32ms
    P50:     63.45ms
    P95:     75.21ms ✓ (target: <80ms)

  End-to-End:
    Average: 1305.42ms
    P95:     1876.34ms

🚀 Throughput:
  Tokens/Second:
    Average: 15.32 ✓ (target: >12)
    P50:     15.67

============================================================

✅ PASSED - Performance meets targets
```

### Run NS-LLM Embedding Benchmark

```powershell
cd neuroswarm/NS-LLM
$env:N=200
node benchmark.js
```

---

## 📈 Historical Performance

### Benchmark History

| Date | TTFT (P95) | Per-Token (P95) | Throughput (avg) | Status | Notes |
|------|------------|-----------------|------------------|--------|-------|
| 2025-11-28 | TBD | TBD | TBD | ⏳ Pending | Initial baseline measurement |
| - | - | - | - | - | Run benchmark to populate |

### Performance Trends

*Charts will be generated after multiple benchmark runs*

---

## 🎯 Performance Targets (Phase G)

### Primary Metrics

✅ **Per-Token Latency (P95)**: <80ms  
✅ **Throughput**: >12 tokens/second  
✅ **Time to First Token (P95)**: <100ms

### Secondary Metrics

- **Cache Hit Rate**: >70% (semantic cache)
- **Consensus Latency**: <500ms (multi-validator agreement)
- **Block Production Time**: <2s (validator to chain)

### Infrastructure Metrics

- **Memory Usage**: <2GB per node (steady state)
- **CPU Utilization**: <70% (under load)
- **Network Latency**: <50ms (inter-node communication)

---

## 🧪 Test Methodology

### Inference Latency Test

**Purpose**: Validate AI inference speed meets real-time requirements

**Process**:
1. Send warmup requests (5) to initialize caches
2. Execute 50 production-like requests with varying token counts
3. Measure time to first token (TTFT)
4. Calculate per-token latency (total time / tokens generated)
5. Compute throughput (tokens per second)

**Success Criteria**:
- P95 per-token latency <80ms
- Average throughput >12 tokens/second

### Embedding Latency Test

**Purpose**: Validate semantic search and caching performance

**Process**:
1. Start NS-LLM service
2. Send 200 POST /embed requests with varying text lengths
3. Measure latency distribution (avg, P50, P95, P99)

**Success Criteria**:
- P95 <100ms
- Consistent performance across request sizes

### Load Testing (Future)

**Planned**:
- Concurrent request handling (50+ simultaneous)
- Sustained load over 10 minutes
- Memory leak detection
- Resource exhaustion recovery

---

## 📊 Performance Dashboard

**Real-time monitoring**: [Brain Dashboard](../../brain-dashboard.html)

**Grafana metrics**: `http://localhost:3001` (when monitoring stack is running)

**Prometheus queries**:
```promql
# Average inference latency (last 5 minutes)
rate(inference_latency_seconds_sum[5m]) / rate(inference_latency_seconds_count[5m])

# Cache hit rate
rate(cache_hits_total[5m]) / rate(cache_requests_total[5m])

# Tokens per second
rate(tokens_generated_total[5m])
```

---

## 🔧 Troubleshooting Performance Issues

### Slow Inference (<12 tokens/sec)

**Possible Causes**:
- Ollama model not cached (first run slower)
- Insufficient RAM allocated to Docker
- CPU throttling (check system resources)
- Network latency to NS-LLM service

**Solutions**:
```powershell
# Check Docker resources
docker stats

# Verify Ollama model loaded
docker compose exec ns-llm ollama list

# Restart NS-LLM service
docker compose restart ns-llm

# Check NS-LLM logs
docker compose logs ns-llm
```

### High P95 Latency (>80ms)

**Possible Causes**:
- Cold cache (semantic cache not warmed up)
- Background processes consuming CPU
- Network congestion
- Disk I/O bottleneck

**Solutions**:
```powershell
# Warm up cache with sample requests
curl -X POST http://localhost:3009/api/generative/generate `
  -H "Content-Type: application/json" `
  -d '{"text":"Hello","maxTokens":20,"model":"llama3.2:3b"}'

# Check cache statistics
curl http://localhost:3009/metrics | Select-String "cache"

# Restart with increased resources
docker compose down
docker compose --profile full up -d
```

### Benchmark Fails to Run

**Error**: `Unable to connect to remote server`

**Solution**: Ensure NS-node is running:
```powershell
# Check if running
curl http://localhost:3009/health

# Start if not running
cd neuroswarm
.\onboarding\onboard.ps1 -Detach

# Wait for health check
Start-Sleep -Seconds 15
curl http://localhost:3009/health
```

---

## 🎓 Interpreting Results

### Understanding Latency Metrics

**Time to First Token (TTFT)**:
- Time from request to first token generated
- Includes model loading, prompt processing, initial inference
- Lower is better for perceived responsiveness

**Per-Token Latency**:
- Average time to generate each subsequent token
- Primary metric for streaming quality
- Target <80ms ensures smooth real-time generation

**End-to-End Latency**:
- Total time to complete full generation
- Depends on token count and TTFT
- Useful for batch processing scenarios

**Throughput (tokens/second)**:
- Inverse of per-token latency
- Higher is better
- Target >12 tokens/sec for real-time chat

### Percentile Analysis

**P50 (Median)**: Typical performance under normal conditions  
**P95**: Performance including occasional slowdowns  
**P99**: Worst-case performance (outliers)

**Why P95?** Validates that 95% of requests meet target, accounting for variability.

### Regression Detection

**Performance regression** = P95 latency increases >10% OR throughput decreases >10%

**Acceptable variance**: ±5% between runs (system load, caching effects)

---

## 📝 Benchmark Contribution Guidelines

### Submitting Benchmark Results

1. **Run benchmark on your system**:
   ```powershell
   node ns-node/benchmarks/inference_latency.js | Tee-Object benchmark-results.txt
   ```

2. **Document your environment**:
   - OS (Windows/macOS/Linux)
   - CPU model and core count
   - RAM allocated to Docker
   - Docker version
   - Node.js version

3. **Add results to Historical Performance section**:
   - Date
   - Metrics (TTFT P95, Per-Token P95, Throughput avg)
   - Environment details
   - Any notable observations

4. **Submit PR** with updated documentation

### Creating New Benchmarks

See [Creating Benchmarks Guide](./Creating-Benchmarks.md) for adding new performance tests.

---

## 🔗 Related Documentation

- **[Performance Metrics](./performance-metrics.md)** - Complete metrics reference
- **[Monitoring & Observability](../Infrastructure/Monitoring.md)** - Grafana/Prometheus setup
- **[NS-LLM Documentation](../NS-LLM/README.md)** - AI inference service
- **[Plugin Performance](../Plugins/Performance.md)** - Plugin execution benchmarks

---

## 🚦 Status Legend

| Icon | Status | Description |
|------|--------|-------------|
| ✅ | Passed | Meets performance target |
| ❌ | Failed | Does not meet target (regression) |
| ⚠️ | Warning | Close to threshold (within 5%) |
| ⏳ | Pending | Not yet validated |
| 🔄 | In Progress | Benchmark currently running |

---

**Contributors**: Run benchmarks and submit your results!  
**Questions?** See [Performance Troubleshooting](../Support/Troubleshooting.md#performance)

**Last Validated By**: Bot (automated CI/CD)  
**Next Scheduled Run**: On every PR (see `.github/workflows/benchmark.yml`)
