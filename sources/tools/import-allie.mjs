#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Usage: node sources/tools/import-allie.mjs --repo <owner/repo> --dir adapters --token <GITHUB_TOKEN>
const argv = process.argv.slice(2);
let repo = 'brockhager/allie-ai';
let dir = 'adapters';
let token = process.env.GITHUB_TOKEN || null;
for (let i=0;i<argv.length;i++){
  if (argv[i] === '--repo') repo = argv[++i];
  if (argv[i] === '--dir') dir = argv[++i];
  if (argv[i] === '--token') token = argv[++i];
}

async function listFiles() {
  const api = `https://api.github.com/repos/${repo}/contents/${dir}`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const r = await fetch(api, { headers });
  if (!r.ok) throw new Error(`Failed to list repo contents: ${r.status}`);
  return await r.json();
}

async function run() {
  try {
    const files = await listFiles();
    const outDir = path.resolve(new URL('../adapters', import.meta.url).pathname);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    for (const f of files) {
      if (f.type !== 'file') continue;
      const rawUrl = f.download_url;
      const fn = path.basename(f.path);
      console.log('Downloading', rawUrl, '→', fn);
      const r = await fetch(rawUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!r.ok) { console.error('Failed to download', rawUrl, r.status); continue; }
      const text = await r.text();
      const target = path.join(outDir, fn);
      fs.writeFileSync(target, text, 'utf8');
      console.log('Saved', target);
    }
    console.log('Import complete. Inspect and adapt adapters under /sources/adapters');
  } catch (e) {
    console.error('Import failed', e.message);
  }
}

run();
