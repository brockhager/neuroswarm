#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const opts = { dry: false };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dry-run') opts.dry = true;
}
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY || 'brockhager/neuro-infra';
if (!token && !opts.dry) { console.error('GITHUB_TOKEN required unless --dry-run is used'); process.exit(1); }
const [owner, name] = repo.split('/');
const wikiUrl = `https://x-access-token:${token}@github.com/${owner}/${name}.wiki.git`;
const tmpDir = path.join(process.cwd(), 'tmp', 'wiki-clone');
if (fs.existsSync(tmpDir)) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) { execSync(`rm -rf ${tmpDir}`); } }
fs.mkdirSync(tmpDir, { recursive: true });
if (!opts.dry) {
  console.log('Cloning wiki repo', wikiUrl);
  execSync(`git clone ${wikiUrl} ${tmpDir}`, { stdio: 'inherit' });
} else {
  console.log('Dry-run: will copy files into', tmpDir, 'but not clone/push');
}

const mapping = [
  { src: path.join(process.cwd(), 'neuroswarm', 'docs', 'run-nodes.md'), dst: 'Running-Nodes.md' },
  { src: path.join(process.cwd(), 'neuroswarm', 'docs', 'data-flow-architecture.md'), dst: 'Data-Flow-Architecture.md' },
  { src: path.join(process.cwd(), 'neuroswarm', 'docs', 'pnpm-policy.md'), dst: 'Contributor-Policy.md' },
  { src: path.join(process.cwd(), 'neuroswarm', 'docs', 'node-installation.md'), dst: 'Installation.md' },
  // Home page: canonical front page for the wiki
  { src: path.join(process.cwd(), 'neuroswarm', 'docs', 'wiki', 'Home.md'), dst: 'Home.md' },
  // Sync Updates page if present (changelog/Updates.md)
  { src: path.join(process.cwd(), 'neuroswarm', 'wiki', 'Updates.md'), dst: 'Updates.md' }
];

let changed = false;
for (const m of mapping) {
  if (!fs.existsSync(m.src)) { console.warn('Source doc missing', m.src); continue; }
  const dstPath = path.join(tmpDir, m.dst);
  console.log('Copying', m.src, '->', dstPath);
  fs.copyFileSync(m.src, dstPath);
  changed = true;
}

if (!changed) {
  console.log('No docs copied; exiting.');
  process.exit(0);
}

if (opts.dry) {
  console.log('Dry-run mode - no git commit or push will be performed. Files copied to:', tmpDir);
  process.exit(0);
}

try{
  execSync('git add --all', { cwd: tmpDir, stdio: 'inherit' });
  execSync(`git commit -m "docs(wiki): sync docs from repo"`, { cwd: tmpDir, stdio: 'inherit' });
  execSync('git push origin main', { cwd: tmpDir, stdio: 'inherit' });
  console.log('Published wiki updates');
} catch (e) {
  console.error('git commit/push failed', e.message);
}
