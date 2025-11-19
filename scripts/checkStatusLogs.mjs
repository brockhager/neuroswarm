#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

function runAndCheck(cmd, args, cwd, match, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: true });
    let matched = false;
    const timer = setTimeout(() => {
      p.kill();
      reject(new Error('Timeout waiting for expected log: ' + match));
    }, timeout);
    p.stdout.on('data', (d) => {
      const s = d.toString();
      process.stdout.write(s);
      if (!matched && s.indexOf(match) !== -1) matched = true;
    });
    p.stderr.on('data', (d) => process.stderr.write(d.toString()));
    p.on('exit', (code) => {
      clearTimeout(timer);
      if (matched) resolve({ ok: true, code }); else reject(new Error('Process exited without matching log'));
    });
  });
}

async function main() {
  // Quick checks for all three services
  const repoRoot = path.join(process.cwd(), '..');
  try {
    console.log('Checking Gateway heartbeat...');
    await runAndCheck('node', ['server.js', '--status'], path.join(process.cwd(), '..', 'gateway-node'), 'heartbeat');
    console.log('Gateway heartbeat OK');
  } catch (e) { console.error('Gateway check failed:', e.message); }
  try {
    console.log('Checking NS heartbeat...');
    await runAndCheck('node', ['server.js', '--status'], path.join(process.cwd(), '..', 'ns-node'), 'heartbeat');
    console.log('NS heartbeat OK');
  } catch (e) { console.error('NS check failed:', e.message); }
  try {
    console.log('Checking VP heartbeat...');
    await runAndCheck('node', ['server.js', '--status'], path.join(process.cwd(), '..', 'vp-node'), 'heartbeat');
    console.log('VP heartbeat OK');
  } catch (e) { console.error('VP check failed:', e.message); }
  console.log('Done status checks');
}

main().catch(e => { console.error('checkStatusLogs failed:', e.message); process.exit(1); });
