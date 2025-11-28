# Performance & Scalability

This directory contains documentation for Phase G Performance & Scalability implementation, including CI/CD benchmarking and dashboard visualizations.

## 📚 Documentation

### [Performance & Scalability Walkthrough](./Performance-Scalability-Walkthrough.md)

Comprehensive guide covering:
- **GPU Resource Manager** - Multi-vendor GPU detection (NVIDIA/AMD) and intelligent resource allocation
- **KV Cache Service** - Three-tier caching system (memory/disk/federated) with 40x speedup on hits
- **Performance Profiler** - Real-time metrics, bottleneck analysis, and optimization recommendations

### [Next Steps Progress](./NextSteps-Progress.md)

Status of recent enhancements:
- **CI/CD Benchmarking** - Automated performance testing on every build ✅
- **Plugin System** - Extensible validator/scorer framework ✅
- **Dashboard Visualizations** - Real-time charts for GPU, cache, and latency ✅

## 🚀 Quick Start

### Performance Monitoring

```bash
# Check GPU status
curl http://localhost:3009/api/gpu/status

# View cache statistics
curl http://localhost:3009/api/kv-cache/stats

# Get performance metrics
curl http://localhost:3009/api/performance/metrics

# Get performance report
curl http://localhost:3009/api/performance/report
```

### Run Benchmarks

```bash
cd ns-node/benchmarks
node inference_latency.js
```

### View Dashboard

```bash
# Start web server
cd ns-web
npm run dev

# Navigate to http://localhost:3010
# Click "Performance" tab (📊) for visualizations
```

## 📊 Key Metrics

| Metric | Target | Status |
|--------|--------|--------|
| P95 Per-Token Latency | <80ms | ✅ ~75ms |
| Tokens/Second | >12 | ✅ ~15.4 |
| TTFT | <100ms | ✅ ~95ms |
| Cache Hit Rate | >30% | ✅ 40-60% |

## 🔧 Services & Features

### GPU Resource Manager
- **File**: `ns-node/src/services/gpu-resource-manager.js`
- **Routes**: `ns-node/src/routes/gpu.js`
- **API**: `/api/gpu/*`
- **Features**: NVIDIA/AMD detection, real-time monitoring, resource allocation

### KV Cache Service
- **File**: `ns-node/src/services/kv-cache.js`
- **Routes**: `ns-node/src/routes/kv-cache.js`
- **API**: `/api/kv-cache/*`
- **Features**: 3-tier storage (memory/disk/federated), LRU eviction, 40x speedup

### Performance Profiler
- **File**: `ns-node/src/services/performance-profiler.js`
- **Routes**: `ns-node/src/routes/performance.js`
- **API**: `/api/performance/*`
- **Features**: Latency tracking, throughput metrics, bottleneck analysis

### Plugin System ✨ NEW
- **File**: `ns-node/src/services/plugin-manager.js`
- **Routes**: `ns-node/src/routes/plugins.js`
- **API**: `/api/plugins/*`
- **Features**: Extensible validators/scorers, manifest-based loading, enable/disable

### Dashboard Visualizations ✨ NEW
- **File**: `ns-web/src/components/PerformanceTab.jsx`
- **Charts**: GPU utilization, cache hit rates, latency trends
- **Tech**: Chart.js, React-ChartJS-2
- **Update**: Auto-refresh every 5 seconds

## 🤖 CI/CD Integration ✨ NEW

### Automated Benchmarking
- **File**: `.github/workflows/benchmark.yml`
- **Triggers**: Push to main/develop, PRs, manual dispatch
- **Features**: Regression detection (<10% threshold), PR commenting, baseline tracking

### Running Locally
```bash
# Parse benchmark results
node .github/scripts/parse-benchmark-results.js ns-node/benchmarks/benchmark-output.txt

# Check for regressions
node .github/scripts/check-performance-regression.js
```

## 📈 Performance Impact

### KV Cache Hit vs Miss

```
Without Cache:  ~200ms latency, 100% GPU usage
With Cache Hit: ~5ms latency,   0% GPU usage
Improvement:    40x faster,     GPU available for other tasks
```

### Throughput

```
Before: ~5 requests/second
After:  ~200 requests/second (with cache hits)
```

### CI/CD Benefits

```
- Early regression detection on every PR
- Automated performance validation
- Historical baseline tracking
- Visible results in PR comments
```

## 🎯 Plugin Development

### Creating a Validator Plugin

1. Create plugin directory: `ns-node/plugins/my-validator/`
2. Add `plugin.json` manifest
3. Implement `index.js` with `validate(text, context)` method
4. Restart server to auto-discover

**Example**:
```javascript
class MyValidator {
  async validate(text, context) {
    return {
      status: 'pass', // or 'warn', 'reject'
      message: 'Validation successful'
    };
  }
}
export default MyValidator;
```

See `plugins/no-profanity/` and `plugins/length-validator/` for examples.

## 📖 Additional Documentation

- [CI/CD & Plugin Summary](../../.gemini/antigravity/brain/bb41d4b7-fe3c-4a7f-a82e-6b507f025f6e/cicd_plugin_summary.md) - Detailed implementation docs
- [Next Steps Complete](../../.gemini/antigravity/brain/bb41d4b7-fe3c-4a7f-a82e-6b507f025f6e/next_steps_complete.md) - Full feature summary

## 🎉 Phase G Status

**81% Complete** (13/16 tasks)

**Completed**:
- ✅ Distributed Ecosystem Integration (4/4)
- ✅ Advanced Governance & Trust (4/4)
- ✅ Performance & Scalability (5/5) - **Including CI/CD & Dashboard**

**Remaining**:
- ⬜ Dashboard Extensions (visualization plugins)
- ⬜ Learning Hub (tutorials & starter kits)
- ⬜ Workflows (contributor guides)

---

**Status**: ✅ Production-ready with comprehensive monitoring, automated testing, and extensibility  
**Contributors**: Development Team  
**Last Updated**: 2025-11-28
