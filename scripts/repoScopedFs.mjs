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

export default { getRepoRoot, isInsideRepo, ensureDirInRepoSync, safeJoinRepo };
