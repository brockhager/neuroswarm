#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { ensureDirInRepoSync, safeJoinRepo } from './repoScopedFs.mjs';

// Copies neuroswarm/docs/wiki/* to neuroswarm/wiki/* for local wiki preview
const src = path.join(process.cwd(), 'neuroswarm', 'docs', 'wiki');
const dst = safeJoinRepo('wiki');
if (!fs.existsSync(src)) { console.error('Source wiki dir not found', src); process.exit(1); }
if (!ensureDirInRepoSync(dst)) process.exit(1);
const files = fs.readdirSync(src).filter(f => f.endsWith('.md'));
for (const f of files) {
  const s = path.join(src, f);
  const d = path.join(dst, f);
  fs.copyFileSync(s, d);
  console.log('Copied', s, '->', d);
}
console.log('Local wiki generation complete');
