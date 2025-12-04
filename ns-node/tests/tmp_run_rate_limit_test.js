import { spawn } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import os from 'os';

function waitForUrl(url, timeout = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      if (Date.now() - start > timeout) return reject(new Error('timeout'));
      fetch(url).then(r => r.ok ? resolve(true) : setTimeout(poll, 100)).catch(() => setTimeout(poll, 100));
    })();
  });
}

function spawnNode(cwd, env) {
  const child = spawn('node', ['server.js'], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => process.stdout.write(`[child ${cwd}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[child ${cwd} ERR] ${d}`));
  return child;
}

(async () => {
  const cwd = process.cwd();
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-rate-'));
  const dbpath = path.join(tmpdir, `ns_${Date.now()}.db`);
  const port = 7011;

  const env = { PORT: String(port), NS_NODE_DB_PATH: dbpath, NODE_ENV: 'test', MAX_CONCURRENT_SYNC_PER_PEER: '2' };
  const proc = spawnNode(cwd, env);

  await waitForUrl(`http://127.0.0.1:${port}/health`);
  console.log('server ready');

  try {
    const payload = { id: `req-${Date.now()}`, type: 'REQUEST_BLOCKS_SYNC', payload: { fromHeight: 0, delayMs: 1500 }, originNodeId: 'test-origin' };
    const p1 = fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const p2 = fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: payload.id + '-2' }) });
    const p3 = fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id: payload.id + '-3' }) });

    const results = await Promise.allSettled([p1, p2, p3]);
    console.log('results', results.map(r => (r.status === 'fulfilled' ? r.value.status : 'rejected')));
    const bodies = await Promise.all(results.map(async r => r.status === 'fulfilled' ? r.value.text().then(t => t) : null));
    console.log('bodies', bodies);

    const metricsResp = await fetch(`http://127.0.0.1:${port}/metrics`);
    console.log('metrics status', metricsResp.status);
    const mt = await metricsResp.text();
    console.log('metrics body:\n', mt);
  } catch (e) {
    console.error(e);
  } finally {
    proc.kill();
  }
})();
