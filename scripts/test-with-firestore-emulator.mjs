#!/usr/bin/env node
// Orchestrate running tests with Firestore emulator for local CI-like runs.
// Usage: node scripts/test-with-firestore-emulator.mjs --service vp-node

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function waitForPort(host, port, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      const s = net.createConnection({ host, port }, () => { s.end(); resolve(true); });
      s.on('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
        setTimeout(check, 250);
      });
    })();
  });
}

async function main() {
  const port = process.env.FIRESTORE_EMULATOR_PORT || 8080;
  const host = process.env.FIRESTORE_EMULATOR_HOST ? process.env.FIRESTORE_EMULATOR_HOST.split(':')[0] : '127.0.0.1';
  console.log('[tester] Starting Firestore emulator via npx/firebase-tools (this requires firebase-tools available via npx)...');

  const emu = spawn('npx', ['-y', 'firebase-tools', 'emulators:start', '--only', 'firestore', '--project', 'neuroswarm-test', '--host', '127.0.0.1', '--port', String(port)], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

  emu.stdout.on('data', d => process.stdout.write(`[emu] ${d}`));
  emu.stderr.on('data', d => process.stderr.write(`[emu] ${d}`));

  try {
    await waitForPort('127.0.0.1', port, 20000);
  } catch (e) {
    console.error('[tester] Firestore emulator failed to start in time');
    emu.kill('SIGTERM');
    process.exit(1);
  }

  console.log('[tester] Firestore emulator ready, setting FIRESTORE_EMULATOR_HOST and running tests');
  process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
  process.env.FIREBASE_PROJECT_ID = 'neuroswarm-test';

  // run the target test script
  const service = process.argv[2] || 'vp-node';
  const runner = spawn('npm', ['--prefix', service, 'run', 'test:integration'], { stdio: 'inherit', shell: true });

  runner.on('exit', (code) => {
    console.log('[tester] tests finished with code', code);
    // shut down emulator
    emu.kill('SIGTERM');
    process.exit(code || 0);
  });

  runner.on('error', (err) => {
    console.error('[tester] test runner failed', err.message);
    emu.kill('SIGTERM');
    process.exit(1);
  });
}

main().catch(e => { console.error(e); process.exit(1); });
