#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const nodes = ['gateway-node', 'ns-node', 'vp-node'];
const base = path.join(process.cwd());
const issues = [];
for (const n of nodes) {
  const dir = path.join(base, n);
  const bat = path.join(dir, `run-${n.replace('-node','')}.bat`);
  const sh = path.join(dir, `run-${n.replace('-node','')}.sh`);
  [bat, sh].forEach((p) => {
    try {
      if (!fs.existsSync(p)) return;
      const txt = fs.readFileSync(p, 'utf8');
      if (!/node\s+server\.js|node\s+"%%~dp0\\server\.js"|node\s+"\$\(dirname \"\$0\"\)\/server\.js"/.test(txt)) {
        issues.push({ file: p, msg: 'Run script does not call server.js explicitly. Use server.js as the entrypoint to ensure CLI runs actual server.' });
      }
    } catch (e) {
      issues.push({ file: p, msg: `Failed to read run script: ${e.message}` });
    }
  });
}
if (issues.length > 0) {
  console.error('Run script checks detected issues:');
  for (const it of issues) console.error(it.file, '->', it.msg);
  process.exit(1);
}
console.log('All run scripts point to server.js and look OK.');
process.exit(0);
