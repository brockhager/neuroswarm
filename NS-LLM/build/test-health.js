#!/usr/bin/env node
// Cross-platform health check helper for CI
// Starts index.js (NS-LLM prototype), polls /health, exits 0 if healthy within timeout

import { spawn } from 'child_process';

const PORT = process.env.PORT || '3015';
const HOST = '127.0.0.1';
const URL = `http://${HOST}:${PORT}/health`;
const TIMEOUT_SECS = Number(process.env.TEST_HEALTH_TIMEOUT || 180);
const RETRIES = TIMEOUT_SECS; // 1 check per second

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function main() {
  const proc = spawn(process.execPath, ['index.js'], {
    env: { ...process.env, PORT },
    stdio: ['ignore', 'inherit', 'inherit']
  });

  // Ensure child is cleaned up on exit
  const cleanup = () => {
    try { proc.kill(); } catch (e) { }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => process.exit(1));
  process.on('SIGTERM', () => process.exit(1));

  for (let i = 0; i < RETRIES; i++) {
    try {
      const res = await fetch(URL, { method: 'GET' });
      if (res.ok) {
        console.log('Server healthy');
        cleanup();
        process.exit(0);
      }
    } catch (err) {
      // ignore and retry
    }

    console.log(`Waiting for health (${i + 1}/${RETRIES})`);
    await sleep(1000);
  }

  console.error('Health check timed out');
  cleanup();
  process.exit(1);
}

// Node 20 supports top-level await and global fetch
main().catch((err) => {
  console.error('Health check script failed', err);
  process.exit(1);
});
