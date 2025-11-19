#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Test to ensure pushDocsToWiki.mjs blocks Home.md overwrite in CI when ALLOW_WIKI_HOME_OVERWRITE not set
const repoRoot = process.cwd();
const tmpDir = path.join(repoRoot, 'tmp', 'wiki-clone');
const docsDir = path.join(repoRoot, 'neuroswarm', 'docs', 'wiki');
const wikiDir = path.join(repoRoot, 'neuroswarm', 'wiki');

function ensure(file, content) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

// Clean previous tmp
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(e) {}
ensure(path.join(tmpDir, 'Home.md'), 'Existing wiki home');
ensure(path.join(docsDir, 'Home.md'), 'New docs home');

try {
  console.log('Simulating CI run - expect script to fail when Home.md would be overwritten without permission');
  execSync('node neuroswarm/scripts/pushDocsToWiki.mjs --dry-run', { stdio: 'inherit', env: { ...process.env, CI: 'true', GITHUB_REPOSITORY: 'brockhager/neuroswarm' } });
  console.error('Expected script to exit with non-zero due to blocked Home.md overwrite; it did not. Failing test.');
  process.exit(1);
} catch (e) {
  console.log('Script failed as expected (blocked Home.md overwrite)');
}

// Now allow overwrite explicitly and ensure script runs OK
try {
  console.log('Now running with ALLOW_WIKI_HOME_OVERWRITE=1 - should pass');
  execSync('node neuroswarm/scripts/pushDocsToWiki.mjs --dry-run --allow-home-overwrite', { stdio: 'inherit', env: { ...process.env, CI: 'true', ALLOW_WIKI_HOME_OVERWRITE: '1', GITHUB_REPOSITORY: 'brockhager/neuroswarm' } });
  console.log('Script allowed overwrite when permission given. PASS');
} catch (e) {
  console.error('Script failed unexpectedly when allow-home-overwrite was set', e.message);
  process.exit(1);
}

console.log('test passed');
