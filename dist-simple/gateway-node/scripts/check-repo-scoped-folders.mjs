#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.join(process.cwd(), 'neuroswarm');
function isInRepo(p) {
  try { return path.resolve(p).toLowerCase().startsWith(root.toLowerCase() + path.sep) || path.resolve(p).toLowerCase() === root.toLowerCase(); } catch (e) { return false; }
}

function scanFiles() {
  const files = walk(path.join(process.cwd(), 'neuroswarm'));
  const violations = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const trimmed = ln.trim();
      if (trimmed.includes('fs.mkdirSync(') || trimmed.includes('fs.rmSync(')) {
        // If this line already uses the repoScoped helper, skip
        if (trimmed.includes('ensureDirInRepoSync') || trimmed.includes('safeJoinRepo')) continue;
        // This is a potential violation but we also ignore ones inside dist/ or node_modules
        if (f.includes('/dist/') || f.includes('node_modules') || f.includes('/.cache/')) continue;
        violations.push({ file: f, line: i + 1, content: trimmed });
      }
    }
  }
  return violations;
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'dist' || ent.name === 'dist-status' || ent.name === 'node_modules' || ent.name === '.cache' || ent.name === '.next' || ent.name === 'website') continue;
      out.push(...walk(p));
    } else {
      if (p.endsWith('.js') || p.endsWith('.mjs') || p.endsWith('.ts')) {
        // Skip scanning ourselves
        if (p.includes(path.join('scripts', 'check-repo-scoped-folders.mjs'))) continue;
        const basename = path.basename(p).toLowerCase();
        if (basename.includes('reposcopedfs')) continue; // ignore our helper file which intentionally uses raw fs calls
        out.push(p);
      }
    }
  }
  return out;
}

const violations = scanFiles();
if (violations.length > 0) {
  console.error('Found potential repo-scoped directory creation violations:');
  for (const v of violations) console.error(`${v.file}:${v.line} -> ${v.content}`);
  console.error('\nPlease use ensureDirInRepoSync() or safeJoinRepo() from neuroswarm/scripts/repoScopedFs.* to create directories.');
  process.exit(2);
}

console.log('No repo-scoped folder creation violations found.');
