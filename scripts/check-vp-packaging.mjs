#!/usr/bin/env node
/**
 * VP Packaging Validation Script
 * 
 * Ensures VP node packaging is always correct:
 * - VP server.js is a startup file with logging (not stub)
 * - run-vp.bat and run-vp.sh exist and point to server.js
 * - run-vp scripts include verifyEntry.mjs pre-check
 * - Packaged VP ZIP contains all required files
 * 
 * Usage:
 *   node scripts/check-vp-packaging.mjs [--skip-zip]
 * 
 * Flags:
 *   --skip-zip: Skip ZIP extraction validation (only check source files)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SKIP_ZIP = process.argv.includes('--skip-zip');

function log(...args) {
  console.log('[VP-PKG]', ...args);
}

function error(...args) {
  console.error('[VP-PKG ERROR]', ...args);
  process.exit(1);
}

function checkVpServerJs() {
  log('Checking vp-node/server.js...');
  const serverPath = path.join(process.cwd(), 'neuroswarm', 'vp-node', 'server.js');
  if (!fs.existsSync(serverPath)) error('vp-node/server.js not found');
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // VP-specific startup checks
  const hasStartLog = content.includes('VP node started') || content.includes('VP node started, producing blocks');
  const hasListenLog = content.includes('app.listen') || content.includes('server.on(');
  const hasLogVp = content.includes('function logVp') || content.includes('const logVp =');
  const notStub = !content.includes('// This is a stub') && !content.includes('module.exports =');
  
  if (!hasStartLog) error('server.js missing "VP node started" log');
  if (!hasListenLog) error('server.js missing app.listen or server.on');
  if (!hasLogVp) error('server.js missing logVp logging function');
  if (!notStub) error('server.js appears to be a stub or export module');
  
  log('✓ vp-node/server.js is a valid startup file with logging');
}

function checkRunScripts() {
  log('Checking run-vp scripts...');
  const batPath = path.join(process.cwd(), 'neuroswarm', 'vp-node', 'run-vp.bat');
  const shPath = path.join(process.cwd(), 'neuroswarm', 'vp-node', 'run-vp.sh');
  
  if (!fs.existsSync(batPath)) error('run-vp.bat not found');
  if (!fs.existsSync(shPath)) error('run-vp.sh not found');
  
  const batContent = fs.readFileSync(batPath, 'utf8');
  const shContent = fs.readFileSync(shPath, 'utf8');
  
  // Check for verifyEntry.mjs pre-check
  if (!batContent.includes('verifyEntry.mjs')) error('run-vp.bat missing verifyEntry.mjs pre-check');
  if (!shContent.includes('verifyEntry.mjs')) error('run-vp.sh missing verifyEntry.mjs pre-check');
  
  // Check scripts point to server.js
  if (!batContent.includes('server.js')) error('run-vp.bat does not reference server.js');
  if (!shContent.includes('server.js')) error('run-vp.sh does not reference server.js');
  
  // Check for --status flag
  if (!batContent.includes('--status')) error('run-vp.bat missing --status flag');
  if (!shContent.includes('--status')) error('run-vp.sh missing --status flag');
  
  log('✓ run-vp.bat and run-vp.sh are correct');
}

function checkZipContents() {
  if (SKIP_ZIP) {
    log('Skipping ZIP validation (--skip-zip)');
    return;
  }
  
  log('Checking VP ZIP contents...');
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
  log(`Found ${allFiles.length} files: ${allFiles.slice(0, 5).join(', ')}`);
  const vpZips = allFiles.filter(f => f.startsWith('vp-node') && f.endsWith('.zip'));
  if (vpZips.length === 0) {
    log('WARN: No VP ZIPs found in dist/, skipping ZIP check');
    return;
  }
  
  for (const zipName of vpZips) {
    const zipPath = path.join(distDir, zipName);
    log(`Checking ${zipName}...`);
    
    // Cross-platform ZIP list
    let content = '';
    try {
      if (process.platform === 'win32') {
        const tmpDir = path.join(process.cwd(), 'neuroswarm', 'tmp', 'vp-zip-check-' + Date.now());
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
    const requiredFiles = ['run-vp.bat', 'run-vp.sh', 'server.js', 'start.bat', 'start.sh', 'start-windows.bat'];
    for (const file of requiredFiles) {
      if (!content.includes(file)) error(`${zipName} missing ${file}`);
    }
    
    log(`✓ ${zipName} contains all required files`);
  }
}

function main() {
  log('VP Packaging Validation');
  log('=======================');
  checkVpServerJs();
  checkRunScripts();
  checkZipContents();
  log('');
  log('✅ All VP packaging checks passed');
}

main();
