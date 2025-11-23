#!/usr/bin/env node
/**
 * Wiki Home.md Restoration Script
 * 
 * Ensures wiki Home.md is never empty or missing. If detected as empty/missing,
 * this script restores default content and pushes to the wiki repo automatically.
 * 
 * Usage:
 *   node scripts/restore-wiki-home.mjs [--dry-run] [--check-only]
 * 
 * Flags:
 *   --dry-run: Show what would be done without making changes
 *   --check-only: Only check if Home.md needs restoration (exit 1 if empty/missing)
 * 
 * Environment:
 *   GH_PAT or GITHUB_TOKEN: Required for wiki repo push (unless --dry-run)
 *   GITHUB_REPOSITORY: Target repo (default: brockhager/neuroswarm)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getTmpDir } from './repoScopedFs.mjs';

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const CHECK_ONLY = argv.includes('--check-only');

function timestamp() { return new Date().toISOString(); }
function log(...args) { console.log(`[WIKI-RESTORE][${timestamp()}]`, ...args); }
function error(...args) { console.error(`[WIKI-RESTORE][${timestamp()}] ERROR:`, ...args); }

const token = process.env.GH_PAT || process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY || 'brockhager/neuroswarm';
const [owner, name] = repo.split('/');

if (!token && !DRY_RUN && !CHECK_ONLY) {
  error('GH_PAT or GITHUB_TOKEN required unless --dry-run or --check-only');
  process.exit(1);
}

const wikiUrl = `https://x-access-token:${token}@github.com/${owner}/${name}.wiki.git`;

function checkHomeInLocalSource() {
  // Check neuroswarm/wiki/Home.md and neuroswarm/docs/wiki/Home.md
  const candidates = [
    path.join(process.cwd(), 'neuroswarm', 'wiki', 'Home.md'),
    path.join(process.cwd(), 'neuroswarm', 'docs', 'wiki', 'Home.md')
  ];
  
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8').trim();
      if (content.length > 0) {
        log(`Found valid Home.md in source: ${p} (${content.length} bytes)`);
        return { valid: true, path: p, content };
      } else {
        log(`WARN: Home.md found but empty: ${p}`);
      }
    }
  }
  
  return { valid: false, path: null, content: null };
}

function getDefaultContent() {
  const defaultPath = path.join(process.cwd(), 'neuroswarm', 'scripts', 'default-Home.md');
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf8');
  }
  
  // Inline fallback if default-Home.md is missing
  return `# NeuroSwarm Wiki

Welcome to the NeuroSwarm project wiki.

## Quick Links
- [Download](Download) - Official release artifacts and installers
- [Running Nodes](Running-Nodes) - Start and monitor ns-node, gateway-node, vp-node
- [Contributor Policy](Contributor-Policy) - Development workflow and guidelines
- [Updates / Changelog](Updates) - Release notes and breaking changes

## Getting Started

### For Operators
1. Download platform-specific installers from the [Download](Download) page
2. Extract and run the provided start scripts
3. Verify health endpoints return OK status
4. Follow the Running Nodes guide for detailed operations

### For Contributors
1. Clone the repository and run \`pnpm install -w\`
2. Read the Contributor Policy for workflow conventions
3. Make changes and run tests before opening PRs
4. All documentation changes sync automatically to this wiki

## Support
- GitHub Issues: https://github.com/${owner}/${name}/issues
- GitHub Discussions: https://github.com/${owner}/${name}/discussions

---
*This page is auto-maintained. Do not edit directly via automation.*
*Last updated: ${new Date().toISOString().split('T')[0]}*
`;
}

function main() {
  log('Starting wiki Home.md restoration check...');
  
  // First check if source Home.md exists and is valid
  const sourceCheck = checkHomeInLocalSource();
  
  if (CHECK_ONLY) {
    if (!sourceCheck.valid) {
      error('Home.md is missing or empty in source');
      process.exit(1);
    }
    log('✓ Home.md valid in source');
    return;
  }
  
  // Clone wiki repo to check current state
  const tmpDir = getTmpDir('wiki-home-check');
  if (fs.existsSync(tmpDir)) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      log('WARN: Failed to clean tmpDir, continuing:', e.message);
    }
  }
  fs.mkdirSync(tmpDir, { recursive: true });
  
  if (DRY_RUN) {
    log('DRY-RUN: Would clone wiki repo to check Home.md');
  } else {
    log('Cloning wiki repo...');
    try {
      execSync(`git clone ${wikiUrl} "${tmpDir}"`, { stdio: 'pipe' });
    } catch (e) {
      error('Failed to clone wiki repo:', e.message);
      process.exit(1);
    }
  }
  
  const wikiHomePath = path.join(tmpDir, 'Home.md');
  let needsRestore = false;
  let reason = '';
  
  if (!fs.existsSync(wikiHomePath)) {
    needsRestore = true;
    reason = 'Home.md missing from wiki repo';
  } else {
    const content = fs.readFileSync(wikiHomePath, 'utf8').trim();
    if (content.length === 0) {
      needsRestore = true;
      reason = 'Home.md empty in wiki repo';
    } else if (content.length < 50) {
      needsRestore = true;
      reason = `Home.md suspiciously small (${content.length} bytes)`;
    }
  }
  
  if (!needsRestore) {
    log('✓ Wiki Home.md is valid, no restoration needed');
    // Cleanup
    if (fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) { /* ignore cleanup errors */ }
    }
    return;
  }
  
  log(`⚠️  Restoration needed: ${reason}`);
  
  // Restore from source or default
  let restoreContent;
  if (sourceCheck.valid) {
    log('Restoring from source:', sourceCheck.path);
    restoreContent = sourceCheck.content;
  } else {
    log('Restoring from default template');
    restoreContent = getDefaultContent();
  }
  
  if (DRY_RUN) {
    log('DRY-RUN: Would write restored content to wiki Home.md');
    log('DRY-RUN: Would commit and push changes');
    log(`Preview (first 200 chars):\n${restoreContent.substring(0, 200)}...`);
    return;
  }
  
  // Write restored content
  fs.writeFileSync(wikiHomePath, restoreContent, 'utf8');
  log(`✓ Wrote ${restoreContent.length} bytes to Home.md`);
  
  // Commit and push
  try {
    execSync('git add Home.md', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git commit -m "Restore Home.md content (automation safeguard)"', { cwd: tmpDir, stdio: 'pipe' });
    execSync('git push origin master', { cwd: tmpDir, stdio: 'inherit' });
    log('✅ Successfully restored and pushed Home.md to wiki');
  } catch (e) {
    error('Failed to commit/push restored Home.md:', e.message);
    process.exit(1);
  }
  
  // Cleanup
  if (fs.existsSync(tmpDir)) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) { /* ignore cleanup errors */ }
  }
}

main();
