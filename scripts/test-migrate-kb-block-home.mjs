#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Simulate a KB with index.md and a target wiki Home.md to ensure the script blocks conversion in CI
const repoRoot = process.cwd();
const srcDir = path.join(repoRoot, 'website', 'kb');
const tmpOut = path.join(repoRoot, 'tmp', 'neuroswarm-wiki-export');
const wikiHome = path.join(repoRoot, 'tmp', 'wiki-clone', 'Home.md');

try { fs.rmSync(tmpOut, { recursive: true, force: true }); } catch(e) {}
try { fs.rmSync(path.join(repoRoot, 'tmp', 'wiki-clone'), { recursive: true, force: true }); } catch(e) {}
fs.mkdirSync(srcDir, { recursive: true });
fs.writeFileSync(path.join(srcDir, 'index.md'), '# KB Index' , 'utf8');
fs.mkdirSync(path.dirname(wikiHome), { recursive: true });
fs.writeFileSync(wikiHome, '# Existing Home', 'utf8');

// Run migrate command: expect exit code non-zero when CI=true and no ALLOW set
try {
  execSync('node neuroswarm/scripts/migrate-kb-to-wiki.js --src=website/kb --out=tmp/neuroswarm-wiki-export', { stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  console.error('Expected migrate script to fail due to blocked Home.md migration; it did not.');
  process.exit(1);
} catch (e) {
  console.log('Migrate script blocked Home.md conversion as expected');
}

// Now allow it and verify it works
try {
  execSync('node neuroswarm/scripts/migrate-kb-to-wiki.js --src=website/kb --out=tmp/neuroswarm-wiki-export --allow-home-overwrite --push=false', { stdio: 'inherit', env: { ...process.env, CI: 'true', ALLOW_WIKI_HOME_OVERWRITE: '1' } });
  console.log('Migrate script allowed Home.md when permission set - PASS');
} catch (e) {
  console.error('Migrate script failed unexpectedly when ALLOW_WIKI_HOME_OVERWRITE=1');
  process.exit(1);
}

console.log('test passed');
