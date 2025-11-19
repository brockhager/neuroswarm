#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// repo root is always the neuroswarm folder inside the monorepo
const REPO_ROOT = path.join(process.cwd(), 'neuroswarm');

function normalize(p) {
  try { return path.resolve(p); } catch (e) { return p; }
}

export function getRepoRoot() { return REPO_ROOT; }

export function isInsideRepo(absPath) {
  if (!absPath) return false;
  const normRepo = normalize(REPO_ROOT).toLowerCase();
  const norm = normalize(absPath).toLowerCase();
  return norm === normRepo || norm.startsWith(normRepo + path.sep);
}

export function ensureDirInRepoSync(dirPath) {
  const abs = path.isAbsolute(dirPath) ? dirPath : path.resolve(dirPath);
  if (!isInsideRepo(abs)) {
    console.error('ERROR: Attempted to create folder outside repo root. Operation blocked.');
    console.error('  Requested path:', abs);
    return false;
  }
  if (!fs.existsSync(abs)) {
    fs.mkdirSync(abs, { recursive: true });
    console.log('Created folder:', abs);
  }
  return true;
}

export function safeRmInRepoSync(dirPath) {
  const abs = path.isAbsolute(dirPath) ? dirPath : path.resolve(dirPath);
  if (!isInsideRepo(abs)) {
    console.error('ERROR: Attempted to remove folder outside repo root. Operation blocked.');
    console.error('  Requested path:', abs);
    return false;
  }
  // Guard: Protect wiki Home.md from accidental removal by automation
  const wikiHome = path.join(REPO_ROOT, 'wiki', 'Home.md');
  const wikiDir = path.join(REPO_ROOT, 'wiki');
  const allowHomeRemove = process.env.ALLOW_WIKI_HOME_OVERWRITE === '1';
  if (!allowHomeRemove) {
    if (normalize(abs).toLowerCase() === normalize(wikiHome).toLowerCase()) {
      console.error('ERROR: Attempted overwrite or removal of Home.md blocked. Set ALLOW_WIKI_HOME_OVERWRITE=1 to allow.');
      return false;
    }
    if (normalize(abs).toLowerCase().startsWith(normalize(wikiDir).toLowerCase() + path.sep)) {
      // Removing a path inside neuroswarm/wiki/ could remove Home.md; block unless explicit allow
      console.error('ERROR: Attempted removal of paths inside neuroswarm/wiki blocked (to protect Home.md). Set ALLOW_WIKI_HOME_OVERWRITE=1 to allow.');
      return false;
    }
  }
  try {
    fs.rmSync(abs, { recursive: true, force: true });
    console.log('Removed folder:', abs);
    return true;
  } catch (e) {
    console.error('Failed removing folder:', abs, e && e.message);
    return false;
  }
}

export function safeJoinRepo(...parts) {
  const joined = path.join(REPO_ROOT, ...parts);
  if (!isInsideRepo(joined)) throw new Error('Join resulted in path outside repo root');
  return joined;
}

// Get a tmp directory for helper tasks. If NEUROSWARM_TMP is set, use it.
// Otherwise default to neuroswarm/tmp in the repo.
export function getTmpDir(...parts) {
  const tmpEnv = process.env.NEUROSWARM_TMP || process.env.TMP_DIR || process.env.TMP || process.env.TEMP;
  let base;
  if (tmpEnv) {
    base = path.isAbsolute(tmpEnv) ? tmpEnv : path.join(process.cwd(), tmpEnv);
  } else {
    base = path.join(REPO_ROOT, 'tmp');
  }
  const joined = path.join(base, ...parts);
  try { fs.mkdirSync(joined, { recursive: true }); } catch (e) { /* ignore */ }
  return joined;
}

export default { getRepoRoot, isInsideRepo, ensureDirInRepoSync, safeJoinRepo, getTmpDir };
