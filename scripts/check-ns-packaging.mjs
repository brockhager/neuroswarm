#!/usr/bin/env node
/**
 * NS Packaging Validation Script
 * 
 * Ensures NS node packaging is always correct:
 * - NS server.js is a startup file with logging (not stub)
 * - run-ns.bat and run-ns.sh exist and point to server.js
 * - run-ns scripts include verifyEntry.mjs pre-check
 * - Packaged NS ZIP contains all required files
 * 
 * Usage:
 *   node scripts/check-ns-packaging.mjs [--skip-zip]
 * 
 * Flags:
 *   --skip-zip: Skip ZIP extraction validation (only check source files)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SKIP_ZIP = process.argv.includes('--skip-zip');

function log(...args) {
  console.log('[NS-PKG]', ...args);
}

function error(...args) {
  console.error('[NS-PKG ERROR]', ...args);
  process.exit(1);
}

function checkNsServerJs() {
  log('Checking ns-node/server.js...');
  const serverPath = path.join(process.cwd(), 'neuroswarm', 'ns-node', 'server.js');
  if (!fs.existsSync(serverPath)) error('ns-node/server.js not found');
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // NS-specific startup checks
  const hasStartLog = content.includes('NS node started') || content.includes('ns-node starting');
  const hasListenLog = content.includes('app.listen') || content.includes('server.on(');
  const hasLogNs = content.includes('function logNs') || content.includes('const logNs =');
  const notStub = !content.includes('// This is a stub') && !content.includes('module.exports =');
  
  if (!hasStartLog) error('server.js missing "NS node started" log');
  if (!hasListenLog) error('server.js missing app.listen or server.on');
  if (!hasLogNs) error('server.js missing logNs logging function');
  if (!notStub) error('server.js appears to be a stub or export module');
  
  log('✓ ns-node/server.js is a valid startup file with logging');
}

function checkRunScripts() {
  log('Checking run-ns scripts...');
  const batPath = path.join(process.cwd(), 'neuroswarm', 'ns-node', 'run-ns.bat');
  const shPath = path.join(process.cwd(), 'neuroswarm', 'ns-node', 'run-ns.sh');
  
  if (!fs.existsSync(batPath)) error('run-ns.bat not found');
  if (!fs.existsSync(shPath)) error('run-ns.sh not found');
  
  const batContent = fs.readFileSync(batPath, 'utf8');
  const shContent = fs.readFileSync(shPath, 'utf8');
  
  // Check for verifyEntry.mjs pre-check
  if (!batContent.includes('verifyEntry.mjs')) error('run-ns.bat missing verifyEntry.mjs pre-check');
  if (!shContent.includes('verifyEntry.mjs')) error('run-ns.sh missing verifyEntry.mjs pre-check');
  
  // Check scripts point to server.js
  if (!batContent.includes('server.js')) error('run-ns.bat does not reference server.js');
  if (!shContent.includes('server.js')) error('run-ns.sh does not reference server.js');
  
  // Check for --status flag
  if (!batContent.includes('--status')) error('run-ns.bat missing --status flag');
  if (!shContent.includes('--status')) error('run-ns.sh missing --status flag');
  
  log('✓ run-ns.bat and run-ns.sh are correct');
}

function checkZipContents() {
  if (SKIP_ZIP) {
    log('Skipping ZIP validation (--skip-zip)');
    return;
  }
  
  log('Checking NS ZIP contents...');
  // Support both neuroswarm/dist and neuroswarm/neuroswarm/dist (from nested runs)
  const distOptions = [
    path.join(process.cwd(), 'neuroswarm', 'neuroswarm', 'dist'),
    path.join(process.cwd(), 'neuroswarm', 'dist'),
    path.join(process.cwd(), 'dist')
  ];
  
  let distDir = null;
  for (const dir of distOptions) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      if (files.some(f => f.endsWith('.zip'))) {
        distDir = dir;
        break;
      }
    }
  }
  
  if (!distDir) {
    log('WARN: No dist/ with ZIPs found, skipping ZIP check (run pnpm package:bins first)');
    return;
  }
  
  log(`Searching in: ${distDir}`);
  const allFiles = fs.readdirSync(distDir);
  const nsZips = allFiles.filter(f => f.startsWith('ns-node') && f.endsWith('.zip'));
  if (nsZips.length === 0) {
    log('WARN: No NS ZIPs found in dist/, skipping ZIP check');
    return;
  }
  
  for (const zipName of nsZips) {
    const zipPath = path.join(distDir, zipName);
    log(`Checking ${zipName}...`);
    
    // Cross-platform ZIP list
    let content = '';
    try {
      if (process.platform === 'win32') {
        const tmpDir = path.join(process.cwd(), 'neuroswarm', 'tmp', 'ns-zip-check-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'pipe' });
        const files = fs.readdirSync(tmpDir);
        content = files.join('\n');
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } else {
        content = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
      }
    } catch (e) {
      error(`Failed to list ${zipName}: ${e.message}`);
    }
    
    // Required files
    const requiredFiles = ['run-ns.bat', 'run-ns.sh', 'server.js', 'start.bat', 'start.sh', 'start-windows.bat'];
    for (const file of requiredFiles) {
      if (!content.includes(file)) error(`${zipName} missing ${file}`);
    }
    
    log(`✓ ${zipName} contains all required files`);
  }
}

function main() {
  log('NS Packaging Validation');
  log('=======================');
  checkNsServerJs();
  checkRunScripts();
  checkZipContents();
  log('');
  log('✅ All NS packaging checks passed');
}

main();
