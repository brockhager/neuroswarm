#!/usr/bin/env node
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

function checkZipWithUnzip(zipPath) {
  const list = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf8' });
  return list;
}

function checkZipWindows(zipPath) {
  const tmp = path.join(os.tmpdir(), 'zip-check-' + Date.now());
  fs.mkdirSync(tmp, { recursive: true });
  try {
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmp}' -Force"`);
    // list recursively
    const files = execSync(`powershell -NoProfile -Command "Get-ChildItem -Path '${tmp}' -Recurse | Select-Object -ExpandProperty FullName"`, { encoding: 'utf8' });
    return files;
  } finally {
    // cleanup
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  }
}

function assertRunScriptsInZip(zipPath) {
  try {
    const content = process.platform === 'win32' ? checkZipWindows(zipPath) : checkZipWithUnzip(zipPath);
    const hasNs = content.indexOf('run-ns.bat') !== -1 || content.indexOf('run-ns.sh') !== -1;
    const hasGw = content.indexOf('run-gateway.bat') !== -1 || content.indexOf('run-gateway.sh') !== -1;
    const hasVp = content.indexOf('run-vp.bat') !== -1 || content.indexOf('run-vp.sh') !== -1;
    if (!hasNs) throw new Error(`${zipPath} missing run-ns.*`);
    if (!hasGw) throw new Error(`${zipPath} missing run-gateway.*`);
    if (!hasVp) throw new Error(`${zipPath} missing run-vp.*`);
    console.log(`${zipPath} OK: contains run scripts`);
  } catch (e) {
    console.error('ZIP check failed:', e.message);
    process.exit(1);
  }
}

function main() {
  const zipDir = path.join(process.cwd(), 'neuroswarm', 'dist');
  const files = fs.readdirSync(zipDir).filter(f => f.endsWith('.zip'));
  if (files.length === 0) { console.warn('No ZIP artifacts found in dist'); process.exit(0); }
  for (const z of files) { assertRunScriptsInZip(path.join(zipDir, z)); }
}

main();
