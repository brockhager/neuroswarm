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

test('RESPONSE_BLOCKS_SYNC ancestry mismatch increments metric', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-sync-metrics-'));
  const tmpDb = path.join(tmpDir, `ns_${Date.now()}.db`);
  const port = 7200 + Math.floor(Math.random() * 500);

  const nsEnv = { PORT: String(port), NS_NODE_DB_PATH: tmpDb, NODE_ENV: 'test' };
  const nsProc = spawnNode(nsEnv);

  await waitForUrl(`http://127.0.0.1:${port}/health`, 10000);

  try {
    // Build a RESPONSE_BLOCKS_SYNC with a first prevHash that does NOT equal the server's local tip (which is 0..0 by default)
    const badPrev = 'deadbeef'.padEnd(64, '0');
    const fakeBlock = { header: { prevHash: badPrev, height: 1, version: '1.0.0', chainId: 'test' }, blockHash: '00'.repeat(32) };
    const msg = { id: `resp-${Date.now()}`, type: 'RESPONSE_BLOCKS_SYNC', payload: { requestId: 'r1', blocks: [fakeBlock] }, originNodeId: 'metric-peer' };

    const r = await fetch(`http://127.0.0.1:${port}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) });
    assert.strictEqual(r.status, 400, 'Expected 400 response for ancestry mismatch');

    // wait for metrics to be updated
    await new Promise(r => setTimeout(r, 200));

    const metricsResp = await fetch(`http://127.0.0.1:${port}/metrics`);
    assert.ok(metricsResp.ok, 'metrics endpoint reachable');
    const metricsText = await metricsResp.text();

    const hasAncestryMismatch = metricsText.includes('sync_ancestry_mismatch_total') && metricsText.includes('metric-peer');
    assert.ok(hasAncestryMismatch, `missing ancestry mismatch metric for metric-peer. Metrics:\n${metricsText}`);

    nsProc.kill();
  } catch (e) {
    nsProc.kill();
    throw e;
  }
});
