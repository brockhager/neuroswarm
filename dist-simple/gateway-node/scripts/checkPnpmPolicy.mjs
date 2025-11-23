#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function findLockFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...findLockFiles(full));
    } else if (e.isFile() && e.name === 'package-lock.json') {
      results.push(full);
    }
  }
  return results;
}

const root = process.cwd();
const locks = findLockFiles(root);
if (locks.length > 0) {
  console.error('package-lock.json detected in repository at:');
  locks.forEach(l => console.error(' -', path.relative(root, l)));
  console.error('\nPlease use pnpm and remove package-lock.json files from the repository.');
  process.exit(1);
}
console.log('No package-lock.json files found — pnpm policy is OK.');
