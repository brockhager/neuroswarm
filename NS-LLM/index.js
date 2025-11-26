// Minimal, dependency-free prototype embedding backend
// - /embed: deterministic pseudo-embeddings (384 floats) for testing
// - /health: process and model status
// - /metrics: simple counters

const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 5555;

// Try to read a repo-level version file if present (two levels up from this file)
let VERSION = process.env.VERSION || 'dev';
try {
  const fs = require('fs');
  const path = require('path');
  const rootVersion = path.resolve(__dirname, '..', '..', 'version-id.txt');
  if (fs.existsSync(rootVersion)) {
    VERSION = fs.readFileSync(rootVersion, 'utf8').trim();
  }
} catch (e) {
  // ignore
}

let metrics = {
  requests_total: 0,
  requests_failed: 0,
  sum_latency_ms: 0,
  max_latency_ms: 0,
  cache_hits: 0,
  cache_misses: 0,
  memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
};

function pseudoHash(text) {
  // FNV-1a 32-bit hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    h = h >>> 0;
  }
  return h >>> 0;
}

function deterministicPRNG(seed) {
  // xorshift32-like
  let x = seed >>> 0;
  return function() {
    x ^= x << 13; x = x >>> 0;
    x ^= x >>> 17; x = x >>> 0;
    x ^= x << 5; x = x >>> 0;
    return (x / 0xFFFFFFFF) * 2 - 1; // range -1..1
  }
}

function makeEmbedding(text, dims = 384) {
  const seed = pseudoHash(text);
  const prng = deterministicPRNG(seed);
  const vec = new Array(dims).fill(0).map(() => Number(prng().toFixed(6)));
  return vec;
}

function sendJSON(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/embed') {
      metrics.requests_total++;
      let body = '';
      for await (const chunk of req) body += chunk;
      let start = Date.now();
      if (!body) {
        metrics.requests_failed++;
        return sendJSON(res, 400, { error: 'empty body' });
      }
      let json;
      try { json = JSON.parse(body); } catch (e) {
        metrics.requests_failed++;
        return sendJSON(res, 400, { error: 'invalid json' });
      }
      if (!json.text || typeof json.text !== 'string') {
        metrics.requests_failed++;
        return sendJSON(res, 400, { error: "missing 'text' string" });
      }

      // Simulated caching: short text < 64 chars => pretend cache hit
      const cacheHit = json.text.length < 64;
      if (cacheHit) metrics.cache_hits++;
      else metrics.cache_misses++;

      const dims = 384;
      const embedding = makeEmbedding(json.text, dims);
      const latency_ms = Math.max(1, Date.now() - start);
      metrics.sum_latency_ms += latency_ms;
      metrics.max_latency_ms = Math.max(metrics.max_latency_ms, latency_ms);
      metrics.memory_usage_mb = Math.round(process.memoryUsage().rss / 1024 / 1024);

      return sendJSON(res, 200, {
        embedding,
        model: json.model || 'all-MiniLM-L6-v2-prototype',
        dimensions: dims,
        tokens: Math.max(1, json.text.split(/\s+/).length),
        latency_ms
      });
    }

    if (req.method === 'GET' && req.url === '/health') {
      const uptime = Math.round(process.uptime());
      return sendJSON(res, 200, {
        status: 'healthy',
        model: 'all-MiniLM-L6-v2-prototype',
        backend: 'node-prototype',
        version: VERSION,
        memory_mb: metrics.memory_usage_mb,
        uptime_seconds: uptime,
        load: { cpu: os.loadavg()[0] || 0.0, gpu: 0.0 },
        active_requests: 0
      });
    }

    if (req.method === 'GET' && req.url === '/metrics') {
      const avg_latency_ms = metrics.requests_total ? Math.round(metrics.sum_latency_ms / metrics.requests_total) : 0;
      return sendJSON(res, 200, {
        requests_total: metrics.requests_total,
        requests_failed: metrics.requests_failed,
        avg_latency_ms,
        p50_latency_ms: avg_latency_ms, // prototype: treat avg as p50
        p95_latency_ms: metrics.max_latency_ms,
        cache_hits: metrics.cache_hits,
        cache_misses: metrics.cache_misses,
        memory_usage_mb: metrics.memory_usage_mb
      });
    }

    // default
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('not found');
  } catch (err) {
    metrics.requests_failed++;
    console.error('server error', err);
    sendJSON(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ns-llm-prototype listening on http://127.0.0.1:${PORT} — version=${VERSION}`);
});

module.exports = { server };
