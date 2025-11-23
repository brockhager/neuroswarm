#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Usage: node scripts/verifyEntry.mjs <entryFile> <role>
// role: gw|vp|ns
const argv = process.argv.slice(2);
const entry = argv[0] || 'server.js';
const role = (argv[1] || 'gw').toLowerCase();
const fullPath = path.resolve(process.cwd(), entry);

function die(msg) { console.error(msg); process.exit(1); }
if (!fs.existsSync(fullPath)) die(`ERROR: Entry file not found: ${fullPath}`);
const content = fs.readFileSync(fullPath, 'utf8');

// Detect a server startup by simple heuristics
const heuristics = {
  gw: [ 'app.listen(', 'server.listen(', 'startServer(', "logGw('Gateway node started" ],
  vp: [ 'produceLoop(', 'setInterval(produceLoop', 'logVp(', 'app.listen(', 'server.listen(' ],
  ns: [ 'app.listen(', 'server.listen(', 'logNs(' ]
};

function looksLikeStartup(roleKey, text) {
  const hs = heuristics[roleKey] || [];
  for (const h of hs) if (text.indexOf(h) !== -1) return true;
  return false;
}

if (!looksLikeStartup(role, content)) {
  // If the file exports something (module.exports or export default), warn that this is a module file
  const exportsPattern = /module\.exports\s*=|export\s+default\s+/;
  if (exportsPattern.test(content)) {
    die(`ERROR: ${entry} looks like an export module and not a startup file. Use server.js as the entry point.`);
  }
  die(`ERROR: ${entry} does not appear to be a startup file for role ${role}. Expected code that starts an HTTP server or production loop.`);
}
console.log(`OK: ${entry} appears to be a startup file for role ${role}`);
process.exit(0);
