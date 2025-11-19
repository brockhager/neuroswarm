#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

function runAndLookFor(cmd, args, cwd, lookFor, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let matched = false;
    const timer = setTimeout(() => {
      proc.kill();
      if (!matched) reject(new Error(`Timeout waiting for ${lookFor} in ${cwd}`)); else resolve(true);
    }, timeout);
    proc.stdout.on('data', d => {
      const s = d.toString();
      process.stdout.write(s);
      if (!matched && s.includes(lookFor)) matched = true;
    });
    proc.stderr.on('data', d => process.stderr.write(d.toString()));
    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (!matched) reject(new Error(`Process exited without matching log: ${lookFor}`)); else resolve(true);
    });
    // If we detected the match, kill the process to avoid background processes lingering
    const interval = setInterval(() => {
      if (matched) {
        try { proc.kill(); } catch (e) {}
        clearInterval(interval);
      }
    }, 250);
  });
}

async function main() {
  const repoRoot = process.cwd();
  try {
    await runAndLookFor('node', ['server.js', '--status'], path.join(repoRoot, 'gateway-node'), 'Gateway node started');
    console.log('Gateway startup log detected');
  } catch (e) { console.error('Gateway startup failed:', e.message); process.exit(1); }
  try {
    await runAndLookFor('node', ['server.js', '--status'], path.join(repoRoot, 'ns-node'), 'NS node started');
    console.log('NS startup log detected');
  } catch (e) { console.error('NS startup failed:', e.message); process.exit(1); }
  try {
    await runAndLookFor('node', ['server.js', '--status'], path.join(repoRoot, 'vp-node'), 'VP node started');
    console.log('VP startup log detected');
  } catch (e) { console.error('VP startup failed:', e.message); process.exit(1); }
  console.log('All nodes emitted startup confirmation logs');
}

main().catch(e => { console.error('check-startup-logs failed:', e.message); process.exit(1); });
