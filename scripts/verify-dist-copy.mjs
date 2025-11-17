#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
let distDir = path.join(process.cwd(), 'dist');
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dist' && argv[i+1]) { distDir = argv[++i]; }
}

function fail(msg) {
  console.error('VERIFY FAILED:', msg);
  process.exit(2);
}

console.log('Verifying copied dist at', distDir);
if (!fs.existsSync(distDir)) fail(`dist directory not found: ${distDir}`);

const expectedNodes = ['ns-node', 'gateway-node', 'vp-node'];
const expectedOS = ['linux', 'macos', 'win'];

for (const node of expectedNodes) {
  const nodeDir = path.join(distDir, node);
  if (!fs.existsSync(nodeDir) || !fs.statSync(nodeDir).isDirectory()) continue; // skip missing packages
  for (const os of expectedOS) {
    const osDir = path.join(nodeDir, os);
    if (!fs.existsSync(osDir) || !fs.statSync(osDir).isDirectory()) continue; // skip non-built platforms
    const sh = path.join(osDir, 'start.sh');
    const bat = path.join(osDir, 'start.bat');
    // At least one of start scripts should exist depending on platform (linux/macos -> start.sh; win -> start.bat)
    if (os === 'win') {
      if (!fs.existsSync(bat)) fail(`Missing start.bat for ${node}/${os} in ${distDir}`);
    } else {
      if (!fs.existsSync(sh)) fail(`Missing start.sh for ${node}/${os} in ${distDir}`);
    }
  }
}

console.log('Verification passed');
