#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ensureDirInRepoSync, safeJoinRepo, safeRmInRepoSync, getTmpDir } from './repoScopedFs.mjs';

const argv = process.argv.slice(2);
const opts = { dry: false };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--dry-run') opts.dry = true;
}
// Prefer GH_PAT if provided, fallback to GITHUB_TOKEN
const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
// Hard-code the target repo to the neuroswarm project per user request
const repo = process.env.GITHUB_REPOSITORY || 'brockhager/neuroswarm';
if (!token && !opts.dry) { console.error('GH_PAT or GITHUB_TOKEN required unless --dry-run is used'); process.exit(1); }
const [owner, name] = repo.split('/');
const wikiUrl = `https://x-access-token:${token}@github.com/${owner}/${name}.wiki.git`;
const wikiUrlRedacted = wikiUrl.replace(/(x-access-token:)([^@]+)(@)/, (m, p1, p2, p3) => `${p1}***REDACTED***${p3}`);

function redact(str) {
  if (!str) return str;
  return String(str).replace(new RegExp(token, 'g'), '***REDACTED***');
}
const tmpDir = getTmpDir('wiki-clone');
if (fs.existsSync(tmpDir)) { try { safeRmInRepoSync(tmpDir); } catch(e) { execSync(`rm -rf ${tmpDir}`); } }
if (!ensureDirInRepoSync(tmpDir)) process.exit(1);
  if (!opts.dry) {
  console.log('Cloning wiki repo', wikiUrlRedacted);
  try {
    execSync(`git clone ${wikiUrl} ${tmpDir}`, { stdio: 'inherit' });
  } catch (e) {
    console.error('git clone failed:', redact(e.message));
    process.exit(1);
  }
} else {
  console.log('Dry-run: will copy files into', tmpDir, 'but not clone/push');
}

function findSrc(relPathParts) {
  // Only consider files under the 'neuroswarm' folder. Do not fallback to the repo root.
  const candidates = [
    path.join(process.cwd(), 'neuroswarm', ...relPathParts)
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return path.join(process.cwd(), 'neuroswarm', ...relPathParts); // fallback (non-existing) so caller logs missing file
}

function timestamp() { return new Date().toISOString(); }
function wikiLog(level, ...args) { console.log(`[WIKI][${timestamp()}] ${level}:`, ...args); }

const allowHomeOverwrite = process.env.ALLOW_WIKI_HOME_OVERWRITE === '1' || argv.includes('--allow-home-overwrite');

const mapping = [
  { src: findSrc(['docs', 'run-nodes.md']), dst: 'Running-Nodes.md' },
  { src: findSrc(['docs', 'data-flow-architecture.md']), dst: 'Data-Flow-Architecture.md' },
  { src: findSrc(['docs', 'pnpm-policy.md']), dst: 'Contributor-Policy.md' },
  { src: findSrc(['docs', 'download.md']), dst: 'Download.md' },
  // Home page: canonical front page for the wiki
  { src: findSrc(['docs', 'wiki', 'Home.md']), dst: 'Home.md' },
  // Sync Updates page if present (changelog/Updates.md)
  { src: findSrc(['wiki', 'Updates.md']), dst: 'Updates.md' }
];

// Also sync any docs in neuroswarm/docs/wiki/ and neuroswarm/wiki/ automatically
const extraCandidates = [
  path.join(process.cwd(), 'neuroswarm', 'docs', 'wiki'),
  path.join(process.cwd(), 'neuroswarm', 'wiki')
];
for (const lc of extraCandidates) {
  try {
    if (fs.existsSync(lc) && fs.lstatSync(lc).isDirectory()) {
      const files = fs.readdirSync(lc).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const src = path.join(lc, f);
        // only add if not already mapped
        if (!mapping.some(m => path.resolve(m.src) === path.resolve(src))) {
          mapping.push({ src, dst: f });
        }
      }
    }
  } catch(e) { /* ignore */ }
}

let changed = false;
let blockedHomeAttempt = false;
for (const m of mapping) {
  if (!fs.existsSync(m.src)) { console.warn('Source doc missing', m.src); continue; }
  const dstPath = path.join(tmpDir, m.dst);
  // Protect Home.md: only allow if explicitly allowed via env or CLI flag
  if (m.dst === 'Home.md') {
    // if wiki repo has an existing Home.md, compare contents
    let dstExists = fs.existsSync(dstPath);
    let dstContent = dstExists ? fs.readFileSync(dstPath, 'utf8') : null;
    let srcContent = fs.readFileSync(m.src, 'utf8');
    if (dstExists && dstContent === srcContent) {
      // nothing to do
      console.log('Home.md is identical; skipping overwrite.');
      continue;
    }
    if (!allowHomeOverwrite) {
      // Block automated overwrite
      console.error('ERROR: Attempted overwrite of Home.md blocked.');
      wikiLog('WARN', 'Unauthorized attempt to modify Home.md', `src=${m.src}`, `dst=${dstPath}`);
      blockedHomeAttempt = true;
      continue; // do not copy
    }
    // if we reach here, allow overwrite (explicit permission)
    console.log('Home.md overwrite allowed (explicit flag present). Copying', m.src, '->', dstPath);
    fs.copyFileSync(m.src, dstPath);
    changed = true;
    continue;
  }
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
  // Determine remote default branch (main or master) to push correctly
  let remoteDefaultBranch = 'main';
  try {
    const remShow = execSync('git remote show origin', { cwd: tmpDir }).toString();
    const m = remShow.match(/HEAD branch: (\S+)/);
    if (m && m[1]) remoteDefaultBranch = m[1];
  } catch (e) { /* ignore and fallback to main */ }
  execSync(`git push origin ${remoteDefaultBranch}`, { cwd: tmpDir, stdio: 'inherit' });
  console.log('Published wiki updates');
} catch (e) {
  // Redact any token present in the error message
  console.error('git commit/push failed', redact(e.message));
}
if (blockedHomeAttempt && (process.env.CI === 'true' || process.env.GITHUB_ACTIONS)) {
  console.error('CI detected unauthorized Home.md overwrite attempt; failing the job to prevent automation from modifying the wiki home page.');
  process.exit(2);
}
