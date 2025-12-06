#!/usr/bin/env node
// Node-based cross-platform health test for NS-LLM (ES Module)
// Starts node index.js in this folder, polls /health until success or timeout, then stops process.

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.js');
const PORT = process.env.PORT || 5555;
// timeout is configurable via TEST_HEALTH_TIMEOUT (seconds)
const DEFAULT_TIMEOUT = 120;
const TIMEOUT_SECONDS = parseInt(process.env.TEST_HEALTH_TIMEOUT || process.argv[2], 10) || DEFAULT_TIMEOUT;

function wait(ms) { return new Promise(res => setTimeout(res, ms)); }

async function pollHealth(timeoutSeconds = 15, childRef) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    if (childRef && childRef.exited) {
      throw new Error('child exited before health became available');
    }
    try {
      const status = await new Promise((resolve, reject) => {
        const req = http.get({ hostname: '127.0.0.1', port: PORT, path: '/health', timeout: 2000 }, (res) => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => resolve({ code: res.statusCode, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('timeout')); });
      });
      if (status && status.code === 200) return status.body;
    } catch (err) {
      // console.error('health poll error', err && err.message);
    }
    await wait(500);
  }
  throw new Error('health check timed out');
}

async function run() {
  console.log('Starting ns-llm child process:', INDEX);
  const child = spawn(process.execPath, [INDEX], { cwd: ROOT, stdio: ['ignore','pipe','pipe'] });
  console.log('Child pid:', child.pid);

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  // Keep small buffers so we can dump them on failure for diagnostics
  let lastStdout = '';
  let lastStderr = '';
  child.stdout.on('data', d => {
    lastStdout += d;
    if (lastStdout.length > 16 * 1024) lastStdout = lastStdout.slice(-16 * 1024);
    process.stdout.write(`[child stdout] ${d}`);
  });
  child.stderr.on('data', d => {
    lastStderr += d;
    if (lastStderr.length > 16 * 1024) lastStderr = lastStderr.slice(-16 * 1024);
    process.stderr.write(`[child stderr] ${d}`);
  });

  let exited = false;
  let exitCode = null;
  let exitSignal = null;
  child.on('exit', (code, signal) => {
    exited = true;
    exitCode = code;
    exitSignal = signal;
    console.log(`child exited code=${code}, signal=${signal}`);
  });
  child.on('error', (err) => { exited = true; console.error('child process error', err); });

  // let the process mature a little before probing (helps slower CI runners)
  const initialDelayMs = 1500;
  console.log(`Waiting ${initialDelayMs}ms before first health probe`);
  await wait(initialDelayMs);

  try {
    const body = await pollHealth(TIMEOUT_SECONDS, child);
    console.log('Health endpoint success. Response:', body);
  } catch (err) {
    console.error('Health check failed:', err && err.message ? err.message : err);
    // Extra diagnostics to help CI (print node version, env and folder contents)
    try {
      console.error('Runtime: node exec=', process.execPath, 'version=', process.version);
      console.error('TEST_HEALTH_TIMEOUT=', process.env.TEST_HEALTH_TIMEOUT, 'TIMEOUT_SECONDS=', TIMEOUT_SECONDS);
      console.error('PORT=', process.env.PORT || PORT);
      const files = fs.readdirSync(ROOT);
      console.error('Root files:', files.join(', '));
      if (fs.existsSync(path.join(ROOT, 'node_modules'))) {
        const sub = fs.readdirSync(path.join(ROOT, 'node_modules')).slice(0, 20);
        console.error('node_modules (first 20):', sub.join(', '));
      } else {
        console.error('node_modules: MISSING');
      }
    } catch (diagErr) {
      console.error('Diagnostics error:', diagErr && diagErr.stack ? diagErr.stack : diagErr);
    }
    // if child died we should surface its exit status
    if (exited) {
      console.error('Child had exited before success — ensure dependencies installed and process did not crash');
      console.error('Child exitCode=', exitCode, 'signal=', exitSignal);
      if (lastStdout) console.error('--- last child stdout (truncated) ---\n' + lastStdout + '\n---');
      if (lastStderr) console.error('--- last child stderr (truncated) ---\n' + lastStderr + '\n---');
    }
    if (!exited) child.kill();
    process.exit(1);
  }

  // Stop the child
  if (!exited) {
    console.log('Stopping child process...');
    child.kill();
    // wait for exit
    const waitDeadline = Date.now() + 5000;
    while (!exited && Date.now() < waitDeadline) {
      // spin
      await wait(100);
    }
  }

  if (!exited) {
    console.warn('Child did not exit in time; forcing');
    try { child.kill('SIGKILL'); } catch (e) {}
  }

  console.log('Test complete — exiting');
  process.exit(0);
}

// In ESM this file may be evaluated as a module. If invoked directly, process.argv[1]
// will point to this file. Run the test when invoked directly.
try {
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
  const self = fileURLToPath(import.meta.url);
  if (invoked && path.resolve(invoked) === path.resolve(self)) await run();
} catch (err) {
  // best-effort: if anything goes wrong here, attempt to run anyway
  await run();
}
