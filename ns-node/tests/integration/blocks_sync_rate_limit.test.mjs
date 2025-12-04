import test from 'node:test';
import assert from 'assert';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import fs from 'fs';
import os from 'os';
import path from 'path';

function waitForUrl(url, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      fetch(url).then(r => r.ok ? resolve(true) : setTimeout(poll, 100)).catch(() => setTimeout(poll, 100));
    })();
  });
}

function spawnNode(env) {
  const nodeBin = process.execPath || 'node';
  const child = spawn(nodeBin, ['server.js'], { cwd: process.cwd(), env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
  child.stdout.on('data', d => process.stdout.write(`[child] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[child ERR] ${d}`));
  return child;
}

test('REQUEST_BLOCKS_SYNC rate limiting (concurrency cap per peer)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-rate-'));
  const tmpDbPath = path.join(tmpDir, `ns_${Date.now()}.db`);
  const port = 7000 + Math.floor(Math.random() * 500);

  const nsEnv = { PORT: String(port), NS_NODE_DB_PATH: tmpDbPath, NODE_ENV: 'test', MAX_CONCURRENT_SYNC_PER_PEER: '2' };
  const nsProc = spawnNode(nsEnv);

  await waitForUrl(`http://127.0.0.1:${port}/health`, 10000);

  try {
    // send three near-simultaneous requests; the handler will delay each for 1500ms (test-only), concurrency cap is 2
    const payload = { id: `req-${Date.now()}`, type: 'REQUEST_BLOCKS_SYNC', payload: { fromHeight: 0, delayMs: 1500 }, originNodeId: 'test-origin' };

    const p1 = fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const p2 = fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: payload.id + '-2' }) });
    const p3 = fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: payload.id + '-3' }) });

    const results = await Promise.allSettled([p1, p2, p3]);
    const statuses = results.map(r => (r.status === 'fulfilled' ? (r.value.status || r.value.statusCode) : 'rejected'));
    // We expect at least one 429 (too many concurrent syncs). The exact ordering can vary.
    const bodies = await Promise.all(results.map(async r => {
      if (r.status !== 'fulfilled') return null;
      try { return await r.value.json().catch(() => null); } catch (e) { return null; }
    }));

    const got429 = results.some(r => r.status === 'fulfilled' && r.value.status === 429);
    assert.ok(got429, `expected at least one 429 response for concurrency cap; statuses=${JSON.stringify(statuses)} bodies=${JSON.stringify(bodies)}`);

    // Verify metrics were updated
    // Wait briefly for metrics to be flushed
    await new Promise(r => setTimeout(r, 200));
    const metricsResp = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.ok(metricsResp.ok, 'metrics endpoint reachable');
    const metricsText = await metricsResp.text();
    // Expect at least 3 requests attempted from origin=test-origin
    const hasRequests = metricsText.includes('sync_requests_total') && metricsText.includes('test-origin');
    const hasConcurrent = metricsText.includes('sync_too_many_concurrent_total') && metricsText.includes('test-origin');
    assert.ok(hasRequests, `missing sync_requests_total metric for test-origin. Metrics:\n${metricsText}`);
    // Expect a too-many-concurrent entry
    assert.ok(hasConcurrent, `missing too_many_concurrent metric for test-origin. Metrics:\n${metricsText}`);

    nsProc.kill();
  } catch (e) {
    nsProc.kill();
    throw e;
  }
});
