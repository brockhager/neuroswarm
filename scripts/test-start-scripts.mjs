#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
let distDir = path.join(process.cwd(), 'dist');
let expectKeepOpen = false;
let expectStatus = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dist' && argv[i+1]) { distDir = argv[++i]; }
  else if (argv[i] === '--expect-keep-open') expectKeepOpen = true;
  else if (argv[i] === '--expect-status') expectStatus = true;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERT FAILED:', msg);
    process.exitCode = 2;
  }
}

function checkFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

console.log('Validating start scripts in', distDir, `expectKeepOpen=${expectKeepOpen}`, `expectStatus=${expectStatus}`);

if (!fs.existsSync(distDir)) {
  console.error('dist directory not found:', distDir);
  process.exit(1);
}

const expectedNodes = ['ns-node', 'gateway-node', 'vp-node'];
const nodes = expectedNodes.filter(n => fs.existsSync(path.join(distDir, n)) && fs.statSync(path.join(distDir, n)).isDirectory());
for (const nodeName of nodes) {
  const nodeDir = path.join(distDir, nodeName);
  const osDirs = fs.readdirSync(nodeDir).filter(d => fs.statSync(path.join(nodeDir, d)).isDirectory());
  for (const osDir of osDirs) {
    const folder = path.join(nodeDir, osDir);
    const startBat = path.join(folder, 'start.bat');
    const startSh = path.join(folder, 'start.sh');
    const name = `${nodeName}/${osDir}`;
    console.log('Checking', name);
    // Windows start.bat
    if (fs.existsSync(startBat)) {
      const content = checkFileContent(startBat);
      assert(content !== null, `Missing start.bat for ${name}`);
      // STATUS env var should be present when expected
      if (expectStatus) assert(/set STATUS=1/i.test(content), `STATUS not present in start.bat ${name}`);
      else assert(!/set STATUS=1/i.test(content), `Unexpected STATUS in start.bat ${name}`);
      // pause should be present only if keep-open is expected
      if (expectKeepOpen) assert(/pause/i.test(content), `pause not found in start.bat ${name} when keep-open expected`);
      else assert(!/pause/i.test(content), `pause found in start.bat ${name} when keep-open not expected`);
      // should forward args via %* or pass to node
      assert(/%\*/.test(content) || /"%~dp0\\server.js" %\*/.test(content) || /%~dp0\\node/.test(content), `start.bat missing arg forwarding in ${name}`);
    }
    // Unix start.sh
    if (fs.existsSync(startSh)) {
      const content = checkFileContent(startSh);
      assert(content !== null, `Missing start.sh for ${name}`);
      if (expectStatus) assert(/export STATUS=1/i.test(content), `STATUS not present in start.sh ${name}`);
      else assert(!/export STATUS=1/i.test(content), `Unexpected STATUS in start.sh ${name}`);
      if (expectKeepOpen) assert(/read -n 1 -s -r -p|read -n|read -p/i.test(content), `keep-open read not found in start.sh ${name}`);
      else assert(!/read -n 1 -s -r -p|read -n|read -p/i.test(content), `keep-open read found in start.sh ${name} when not expected`);
      // arg forwarding
      assert(/\"\$\@\"|\$\@/.test(content), `start.sh missing arg forwarding in ${name}`);
    }
  }
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('Script found failures');
  process.exit(process.exitCode);
}
console.log('All checks passed');
