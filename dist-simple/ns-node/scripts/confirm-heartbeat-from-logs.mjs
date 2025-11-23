#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

async function watchFileForString(file, match, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      try {
        if (!fs.existsSync(file)) return;
        const content = fs.readFileSync(file, 'utf8');
        if (content.indexOf(match) !== -1) {
          clearInterval(interval); resolve(true); return;
        }
        if (Date.now() - start > timeout) { clearInterval(interval); reject(new Error('Timeout waiting for ' + match + ' in ' + file)); }
      } catch (e) { clearInterval(interval); reject(e); }
    }, 1000);
  });
}

async function main() {
  const root = process.cwd();
  const files = [{path: path.join(root, 'ns.log'), label: 'NS'}, {path: path.join(root, 'gw.log'), label: 'GW'}, {path: path.join(root, 'vp.log'), label: 'VP'}];
  try {
    for (const f of files) {
      process.stdout.write(`Checking ${f.path} for heartbeat...`);
      await watchFileForString(f.path, 'heartbeat');
      console.log(' OK');
    }
    console.log('All heartbeat logs detected');
  } catch (e) { console.error('Heartbeat check failed:', e.message); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
