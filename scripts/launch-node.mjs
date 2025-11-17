#!/usr/bin/env node
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import open from 'open';
import path from 'path';
import fs from 'fs';

// Usage: node neuroswarm/scripts/launch-node.mjs --node gateway|ns|vp --port 8080 --ns http://localhost:3000 --open [--status]
const argv = process.argv.slice(2);
const opts = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--node') opts.node = argv[++i];
  else if (argv[i] === '--port') opts.port = Number(argv[++i]);
  else if (argv[i] === '--ns') opts.ns = argv[++i];
  else if (argv[i] === '--open') opts.open = true;
  else if (argv[i] === '--status') opts.status = true;
}

if (!opts.node || !opts.port) {
  console.error('Usage: launch-node --node [gateway|ns|vp] --port <n> [--ns <url>] [--open]');
  process.exit(1);
}

// Determine platform-specific subfolder (created by package:bins)
const osSub = process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'macos' : 'linux';
const BIN_DIR = path.join(process.cwd(), 'dist', `${opts.node}`, osSub);
let BIN_PATH = path.join(BIN_DIR, `${opts.node}${process.platform === 'win32' ? '.exe' : ''}`);
let isBinary = fs.existsSync(BIN_PATH);
let hasServerJs = fs.existsSync(path.join(BIN_DIR, 'server.js'));
if (!isBinary && !hasServerJs) {
  console.error('Cannot find binary or server script at', BIN_DIR);
  process.exit(2);
}

const env = { ...process.env };
if (opts.ns) env.NS_NODE_URL = opts.ns;
env.PORT = String(opts.port);
if (!env.NS_CHECK_EXIT_ON_FAIL) env.NS_CHECK_EXIT_ON_FAIL = 'false';
if (opts.status) env.STATUS = '1';

console.log(`Starting ${opts.node} from ${BIN_PATH} with PORT=${opts.port} ${opts.ns ? 'NS:' + opts.ns : ''}`);
let child;
if (isBinary) {
  child = spawn(BIN_PATH, [], { env, stdio: 'inherit' });
} else {
  const serverJsPath = path.join(BIN_DIR, 'server.js');
  child = spawn('node', [serverJsPath], { env, stdio: 'inherit' });
}

function closeAndExit(code = 0) {
  try { child.kill(); } catch (e) {}
  process.exit(code);
}

child.on('exit', (code) => {
  console.log('Child exited with', code);
  closeAndExit(code || 0);
});

(async () => {
  // Wait for health
  const url = `http://localhost:${opts.port}/health`;
  let ok = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) { ok = true; break; }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ok) {
    console.error('Node did not respond to /health in time:', url);
    closeAndExit(3);
  }
  console.log('Node is healthy:', url);
  if (opts.open && opts.node === 'gateway') {
    const openUrl = `http://localhost:${opts.port}`;
    console.log('Opening browser at', openUrl);
    try { await open(openUrl); } catch (e) { console.warn('open failed', e.message); }
  }
})();
