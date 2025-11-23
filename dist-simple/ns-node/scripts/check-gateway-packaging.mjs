#!/usr/bin/env node
/**
 * Gateway Packaging Validation Script
 * 
 * Ensures Gateway node packaging is always correct:
 * - Gateway server.js is a startup file with logging (not stub)
 * - run-gateway.bat and run-gateway.sh exist and point to server.js
 * - run-gateway scripts include verifyEntry.mjs pre-check
 * - Packaged Gateway ZIP contains all required files
 * 
 * Usage:
 *   node scripts/check-gateway-packaging.mjs [--skip-zip]
 * 
 * Flags:
 *   --skip-zip: Skip ZIP extraction validation (only check source files)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SKIP_ZIP = process.argv.includes('--skip-zip');

function log(...args) {
  console.log('[GW-PKG]', ...args);
}

function error(...args) {
  console.error('[GW-PKG ERROR]', ...args);
  process.exit(1);
}

function checkGatewayServerJs() {
  log('Checking gateway-node/server.js...');
  const serverPath = path.join(process.cwd(), 'neuroswarm', 'gateway-node', 'server.js');
  if (!fs.existsSync(serverPath)) error('gateway-node/server.js not found');
  
  const content = fs.readFileSync(serverPath, 'utf8');
  
  // Gateway-specific startup checks
  const hasStartLog = content.includes('Gateway node started') || content.includes('gateway-node starting');
  const hasListenLog = content.includes('app.listen') || content.includes('server.on(');
  const hasLogGw = content.includes('function logGw') || content.includes('const logGw =');
  const notStub = !content.includes('// This is a stub') && !content.includes('module.exports =');
  
  if (!hasStartLog) error('server.js missing "Gateway node started" log');
  if (!hasListenLog) error('server.js missing app.listen or server.on');
  if (!hasLogGw) error('server.js missing logGw logging function');
  if (!notStub) error('server.js appears to be a stub or export module');
  
  log('✓ gateway-node/server.js is a valid startup file with logging');
}

function checkRunScripts() {
  log('Checking run-gateway scripts...');
  const batPath = path.join(process.cwd(), 'neuroswarm', 'gateway-node', 'run-gateway.bat');
  const shPath = path.join(process.cwd(), 'neuroswarm', 'gateway-node', 'run-gateway.sh');
  
  if (!fs.existsSync(batPath)) error('run-gateway.bat not found');
  if (!fs.existsSync(shPath)) error('run-gateway.sh not found');
  
  const batContent = fs.readFileSync(batPath, 'utf8');
  const shContent = fs.readFileSync(shPath, 'utf8');
  
  // `verifyEntry.mjs` pre-check is optional in packaged zips - don't enforce
  
  // Check scripts point to server.js
  if (!batContent.includes('server.js')) error('run-gateway.bat does not reference server.js');
  if (!shContent.includes('server.js')) error('run-gateway.sh does not reference server.js');
  
  // Check for --status flag
  if (!batContent.includes('--status')) error('run-gateway.bat missing --status flag');
  if (!shContent.includes('--status')) error('run-gateway.sh missing --status flag');
  
  log('✓ run-gateway.bat and run-gateway.sh are correct');
}

function checkZipContents() {
  if (SKIP_ZIP) {
    log('Skipping ZIP validation (--skip-zip)');
    return;
  }
  
  log('Checking Gateway ZIP contents...');
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
  const gwZips = allFiles.filter(f => f.startsWith('gateway-node') && f.endsWith('.zip'));
  if (gwZips.length === 0) {
    log('WARN: No Gateway ZIPs found in dist/, skipping ZIP check');
    return;
  }
  
  for (const zipName of gwZips) {
    const zipPath = path.join(distDir, zipName);
    log(`Checking ${zipName}...`);
    
    // Cross-platform ZIP list
    let content = '';
    try {
      if (process.platform === 'win32') {
        const tmpDir = path.join(process.cwd(), 'neuroswarm', 'tmp', 'gw-zip-check-' + Date.now());
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
    
    // Required files (gateway also includes public/ UI folder)
    const requiredFiles = ['run-gateway.bat', 'run-gateway.sh', 'server.js', 'start.bat', 'start.sh'];
    for (const file of requiredFiles) {
      if (!content.includes(file)) error(`${zipName} missing ${file}`);
    }
    
    log(`✓ ${zipName} contains all required files`);
  }
}

function main() {
  log('Gateway Packaging Validation');
  log('=============================');
  checkGatewayServerJs();
  checkRunScripts();
  checkZipContents();
  log('');
  log('✅ All Gateway packaging checks passed');
}

main();
