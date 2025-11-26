(async function(){
  // Simple micro-benchmark: POST /embed N times and measure latency distribution
  const N = parseInt(process.env.N || '200', 10);
  const base = `http://127.0.0.1:5555`;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Start server
  require('./index.js');
  await wait(100);

  async function post(text) {
    const t0 = Date.now();
    const res = await fetch(base + '/embed', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({text}) });
    const latency = Date.now() - t0;
    if (!res.ok) throw new Error('bad status ' + res.status);
    await res.json();
    return latency;
  }

  const latencies = [];
  console.log(`Running ${N} embed requests...`);
  for (let i=0;i<N;i++) {
    const text = (i % 3 === 0) ? 'short text' : ('benchmark message ' + i + ' ' + 'word '.repeat(i%50));
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

  latencies.sort((a,b) => a-b);
  const sum = latencies.reduce((s,x) => s+x, 0);
  const avg = sum / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || latencies[latencies.length-1];

  console.log(`requests: ${latencies.length}/${N}`);
  console.log(`avg: ${avg.toFixed(2)}ms p50: ${p50}ms p95: ${p95}ms p99: ${p99}ms`);
  process.exit(0);
})();