(async function () {
  // Benchmark with robust startup
  const N = parseInt(process.env.N || '200', 10);
  const PORT = process.env.PORT || 3015;
  const base = `http://127.0.0.1:${PORT}`;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Start the server (in-process)
  console.log(`Starting benchmark on port ${PORT}...`);
  // Set env var for index.js
  process.env.PORT = PORT;
  // Dynamic import to start server
  await import('./index.js');

  // Robust poll for readiness
  async function waitForHealth() {
    const start = Date.now();
    while (Date.now() - start < 10000) { // 10s timeout
      try {
        const res = await fetch(base + '/health');
        if (res.ok) return true;
      } catch (e) { /* ignore connection refused */ }
      await wait(500);
    }
    return false;
  }

  console.log('Waiting for server readiness...');
  if (!await waitForHealth()) {
    console.error('TIMED OUT: Server did not become ready at ' + base);
    process.exit(1);
  }
  console.log('Server ready. Starting requests...');

  async function post(text) {
    const t0 = Date.now();
    const res = await fetch(base + '/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const latency = Date.now() - t0;
    if (!res.ok) throw new Error(`bad status ${res.status}`);
    await res.json();
    return latency;
  }

  const latencies = [];
  console.log(`Running ${N} embed requests...`);
  for (let i = 0; i < N; i++) {
    const text = (i % 3 === 0) ? 'short text' : ('benchmark message ' + i + ' ' + 'word '.repeat(i % 50));
    try {
      const l = await post(text);
      latencies.push(l);
    } catch (err) {
      console.error('request failed', err.message);
    }
  }

  if (latencies.length === 0) {
    console.error('no successful requests');
    process.exit(2);
  }

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((s, x) => s + x, 0);
  const avg = sum / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length - 1];

  console.log(`requests: ${latencies.length}/${N}`);
  console.log(`avg: ${avg.toFixed(2)}ms p50: ${p50}ms p95: ${p95}ms p99: ${p99}ms`);
  process.exit(0);
})();