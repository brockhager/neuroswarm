// NS-LLM prototype HTTP backend (ESM)
// - Provides minimal /embed, /health and /metrics endpoints used by CI smoke tests
// - Emulates __filename / __dirname correctly for ESM using fileURLToPath(import.meta.url)
// - Designed to be safe when imported (no duplicate variable declarations)

import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Derive __filename / __dirname exactly once from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5555;

let VERSION = process.env.VERSION || 'dev';
try {
  const rootVersion = path.resolve(__dirname, '..', '..', 'version-id.txt');
  if (fs.existsSync(rootVersion)) VERSION = fs.readFileSync(rootVersion, 'utf8').trim();
} catch (e) {
  // intentionally ignored — prototype should not crash on version lookup
}

const metrics = {
  requests_total: 0,
  requests_failed: 0,
  sum_latency_ms: 0,
  max_latency_ms: 0,
  cache_hits: 0,
  cache_misses: 0,
  memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
};

function pseudoHash(text) {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    h = h >>> 0;
  }
  return h >>> 0;
}

function deterministicPRNG(seed) {
  let x = seed >>> 0;
  return function () {
    x ^= x << 13; x = x >>> 0;
    x ^= x >>> 17; x = x >>> 0;
    x ^= x << 5; x = x >>> 0;
    return (x / 0xFFFFFFFF) * 2 - 1; // -1 .. 1
  };
}

function makeEmbedding(text, dims = 384) {
  const seed = pseudoHash(text);
  const prng = deterministicPRNG(seed);
  return new Array(dims).fill(0).map(() => Number(prng().toFixed(6)));
}

function sendJSON(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/embed') {
      metrics.requests_total++;
      let body = '';
      const start = Date.now();
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          if (!body) { metrics.requests_failed++; return sendJSON(res, 400, { error: 'empty body' }); }
          let json;
          try { json = JSON.parse(body); } catch (e) { metrics.requests_failed++; return sendJSON(res, 400, { error: 'invalid json' }); }
          if (!json.text || typeof json.text !== 'string') { metrics.requests_failed++; return sendJSON(res, 400, { error: "missing 'text' string" }); }

          const cacheHit = json.text.length < 64;
          if (cacheHit) metrics.cache_hits++; else metrics.cache_misses++;

          const dims = 384;
          const embedding = makeEmbedding(json.text, dims);
          const latency_ms = Math.max(1, Date.now() - start);
          metrics.sum_latency_ms += latency_ms;
          metrics.max_latency_ms = Math.max(metrics.max_latency_ms, latency_ms);
          metrics.memory_usage_mb = Math.round(process.memoryUsage().rss / 1024 / 1024);

          sendJSON(res, 200, {
            embedding,
            model: json.model || 'all-MiniLM-L6-v2-prototype',
            dimensions: dims,
            tokens: Math.max(1, json.text.split(/\s+/).length),
            latency_ms
          });
        } catch (err) {
          metrics.requests_failed++; sendJSON(res, 500, { error: 'server error' });
        }
      });
      return;
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
        p50_latency_ms: avg_latency_ms,
        p95_latency_ms: metrics.max_latency_ms,
        cache_hits: metrics.cache_hits,
        cache_misses: metrics.cache_misses,
        memory_usage_mb: metrics.memory_usage_mb
      });
    }

    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end('not found');
  } catch (err) {
    metrics.requests_failed++;
    try { sendJSON(res, 500, { error: 'server error' }); } catch (e) { res.end('server error'); }
  }
});

// Track active sockets so we can destroy them during shutdown. This prevents
// lingering sockets/handles on Windows which can cause libuv assertion failures
// when a process exits while handles are in closing state.
const _connections = new Set();
server.on('connection', (socket) => {
  _connections.add(socket);
  socket.on('close', () => _connections.delete(socket));
});

server.on('error', (err) => console.error('Server error:', err));

server.on('listening', () => {
  const addr = server.address();
  console.log(`ns-llm-prototype listening on http://0.0.0.0:${PORT} — version=${VERSION}`);
  console.log('Server address:', JSON.stringify(addr));
});

server.listen(PORT, '0.0.0.0', () => {
  // no-op; listening event above handles logs
});

function shutdown(code) {
  try {
    // Attempt graceful socket shutdown, then forcibly destroy any that remain.
    try {
      for (const s of Array.from(_connections)) {
        try { s.end(); } catch (e) {}
      }
    } catch (e) {}

    // Wait briefly so sockets that will naturally close get a chance to do so.
    const WAIT_MS = 120;
    const start = Date.now();
    while (Date.now() - start < WAIT_MS) {
      // no-op busy-wait; avoids async complication in shutdown path
    }

    try {
      for (const s of Array.from(_connections)) {
        try { s.destroy(); } catch (e) {}
      }
    } catch (e) {}

    server.close(() => process.exit(code || 0));
    setTimeout(() => process.exit(code || 1), 5000);
  } catch (e) { process.exit(1); }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// If executed directly ensure we log so tests/CI know this ran as main
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  console.log('Running NS-LLM prototype index.js as main module');
}

// Export server for tests that import this module. Keep only ONE implementation to
// avoid duplicate-import/identifier errors under ESM.
export { server };
