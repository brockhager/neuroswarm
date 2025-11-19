#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Entries are relative to the neuroswarm project root (process.cwd()).
// Remove redundant 'neuroswarm' prefix to avoid duplicating folder path.
const nodes = [
  { name: 'ns-node', entry: path.join('ns-node', 'server.js'), port: 3000 },
  { name: 'gateway-node', entry: path.join('gateway-node', 'server.js'), port: 8080 },
  { name: 'vp-node', entry: path.join('vp-node', 'server.js'), port: 4000 }
];

// Use node18 runtime for broader pkg stability; fallback to source archive if pkg fails.
const targets = [
  { os: 'linux', target: 'node18-linux-x64' },
  { os: 'macos', target: 'node18-macos-x64' },
  { os: 'win', target: 'node18-win-x64' }
];

const args = process.argv.slice(2);
let filter = null;
let keepOpen = false;
let statusFlag = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--os' && args[i + 1]) { filter = args[i + 1]; i++; }
  else if (args[i] === '--keep-open') { keepOpen = true; }
  else if (args[i] === '--status') { statusFlag = true; }
}

// Allow KEEP_OPEN to be set via environment variable for CI cross-platform reliability
if (!keepOpen && (String(process.env.KEEP_OPEN || '').toLowerCase() === '1' || String(process.env.KEEP_OPEN || '').toLowerCase() === 'true')) {
  keepOpen = true;
}

const dist = path.join(process.cwd(), 'dist');
// Ensure a clean dist dir for each packaging run to avoid leftover files
if (fs.existsSync(dist)) {
  try { fs.rmSync(dist, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}
fs.mkdirSync(dist, { recursive: true });

for (const node of nodes) {
  for (const t of targets.filter(tt => !filter || tt.os === filter)) {
    const outFolder = path.join(dist, node.name, t.os);
    // Ensure `outFolder` is clean to avoid leftover start scripts or files from previous runs
    if (fs.existsSync(outFolder)) {
      try { fs.rmSync(outFolder, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
    fs.mkdirSync(outFolder, { recursive: true });
    const exeName = node.name + (t.os === 'win' ? '.exe' : '');
    const outPath = path.join(outFolder, exeName);
    console.log(`Packaging ${node.name} for ${t.os} -> ${outPath}`);
    let builtBinary = false;
    const res = spawnSync('npx', ['pkg', node.entry, '--targets', t.target, '--out-path', outFolder], { stdio: 'inherit' });
    if (res.status === 0) {
      builtBinary = true;
    } else {
      console.warn(`pkg failed for ${node.name} on ${t.os}; creating source-based fallback archive.`);
      // Fallback: copy original server.js and create a simple run script instead of binary
      const srcServer = path.join(process.cwd(), node.entry);
      const fallbackName = 'server.js';
      fs.copyFileSync(srcServer, path.join(outFolder, fallbackName));
      // If a public/ UI folder exists, include it so fallback builds still have UI files
      const srcPublic = path.join(path.dirname(srcServer), 'public');
      const dstPublic = path.join(outFolder, 'public');
      if (fs.existsSync(srcPublic)) {
        try {
          fs.cpSync(srcPublic, dstPublic, { recursive: true });
        } catch (e) {
          // Fallback for Node versions without fs.cpSync
          const files = fs.readdirSync(srcPublic, { withFileTypes: true });
          for (const f of files) {
            const s = path.join(srcPublic, f.name);
            const d = path.join(dstPublic, f.name);
            if (f.isDirectory()) {
              fs.mkdirSync(d, { recursive: true });
              // copy nested
              // A naive recursive copy implementation
              function cpDir(sdir, ddir) {
                fs.mkdirSync(ddir, { recursive: true });
                for (const ent of fs.readdirSync(sdir, { withFileTypes: true })) {
                  const s2 = path.join(sdir, ent.name);
                  const d2 = path.join(ddir, ent.name);
                  if (ent.isDirectory()) cpDir(s2, d2); else fs.copyFileSync(s2, d2);
                }
              }
              cpDir(s, d);
            } else {
              fs.mkdirSync(path.dirname(d), { recursive: true });
              fs.copyFileSync(s, d);
            }
          }
        }
      }
    }
    // If pkg output file is named `server` (from server.js) attempt to rename to a more friendly name
    if (builtBinary) {
      const createdName = path.join(outFolder, path.basename(node.entry, '.js')) + (t.os === 'win' ? '.exe' : '');
      if (fs.existsSync(createdName) && createdName !== outPath) {
        fs.renameSync(createdName, outPath);
      }
    }
    // Always copy a fallback server.js into the out folder; this supports the start script falling back to node server.js when the binary is broken
    try {
      const srcServer = path.join(process.cwd(), node.entry);
      if (fs.existsSync(srcServer)) fs.copyFileSync(srcServer, path.join(outFolder, 'server.js'));
    } catch (e) {}
    // write a platform-aware start script
    const startCommand = builtBinary ? `./${exeName}` : `node server.js`;
    const shStartCmd = builtBinary ? `./${exeName}` : `node "$(dirname \"$0\")/server.js"`;
    
    // Build start.sh from an array to avoid nested backticks and quoting issues
    const shLines = [];
    shLines.push('#!/usr/bin/env bash');
    shLines.push(`export PORT=${node.port}`);
    shLines.push(`export NS_NODE_URL=${process.env.NS_NODE_URL || 'http://localhost:3000'}`);
    shLines.push('export NS_CHECK_EXIT_ON_FAIL=false');
    if (statusFlag) shLines.push('export STATUS=1');
    shLines.push('# Run compiled binary if present; if it fails, log warning and fallback to node server.js');
    shLines.push(`if [ -x "$(dirname \"$0\")/${exeName}" ]; then`);
    shLines.push(`  "$(dirname \"$0\")/${exeName}" "$@"`);
    shLines.push('  EXIT_CODE=$?');
    shLines.push('  if [ $EXIT_CODE -ne 0 ]; then');
    shLines.push(`    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: ${node.name} binary failed with code $EXIT_CODE; falling back to node server.js"`);
    shLines.push(`    node "$(dirname \"$0\")/server.js" "$@"`);
    shLines.push('    EXIT_CODE=$?');
    shLines.push('  fi');
    shLines.push('else');
    shLines.push(`${shStartCmd} "$@"`);
    shLines.push('  EXIT_CODE=$?');
    shLines.push('fi');
    shLines.push('EXIT_CODE=$?');
    shLines.push('if [ $EXIT_CODE -ne 0 ]; then');
    shLines.push(`  echo "[\$(date -u +%Y-%m-%dT%H:%M:%SZ)] ${node.name} exited with code $EXIT_CODE"`);
    if (keepOpen) shLines.push('  read -n 1 -s -r -p "Press any key to close..."; echo');
    shLines.push('fi');
    if (node.name === 'gateway-node') {
      shLines.push('');
      shLines.push('# open browser on gateway for convenience; run in background so it doesn\'t block logs');
      shLines.push('(');
      shLines.push('  for i in {1..30}; do');
      shLines.push(`    if curl --silent --fail http://localhost:${node.port}/health; then`);
      shLines.push('      if command -v xdg-open >/dev/null; then');
      shLines.push(`        xdg-open http://localhost:${node.port} >/dev/null 2>&1 || true`);
      shLines.push('      elif command -v open >/dev/null; then');
      shLines.push(`        open http://localhost:${node.port} >/dev/null 2>&1 || true`);
      shLines.push('      fi');
      shLines.push('      break');
      shLines.push('    fi');
      shLines.push('    sleep 1');
      shLines.push('  done');
      shLines.push(') &');
    }
    shLines.push('');
    const startSh = shLines.join('\n');
    // Run in foreground: don't use `start` to preserve logs in the current console.
    const batStartCmd = builtBinary ? `"%~dp0\\${exeName}" %*` : `node "%~dp0\\server.js" %*`;
    const startBat = `@echo off\nsetlocal\nset PORT=${node.port}\nset NS_NODE_URL=${process.env.NS_NODE_URL || 'http://localhost:3000'}\nset NS_CHECK_EXIT_ON_FAIL=false\n${statusFlag ? `set STATUS=1\n` : ''}\n:: Try to run compiled binary if present; if it fails, log and fallback\nif exist "%~dp0\\${exeName}" (\n  "%%~dp0\\${exeName}" %%*\n  set EXITCODE=%ERRORLEVEL%\n  if %EXITCODE% NEQ 0 (\n    echo [%DATE% %TIME%] WARNING: ${node.name} binary failed with code %EXITCODE%; falling back to node server.js\n    node "%%~dp0\\server.js" %%*\n    set EXITCODE=%ERRORLEVEL%\n  )\n) else (\n  node "%%~dp0\\server.js" %%*\n  set EXITCODE=%ERRORLEVEL%\n)\nif %EXITCODE% NEQ 0 (\n  echo [%DATE% %TIME%] ${node.name} exited with code %EXITCODE%\n  ${keepOpen ? 'pause\n' : ''}\n)\nexit /b %EXITCODE%\n`;
    fs.writeFileSync(path.join(outFolder, 'start.sh'), startSh);
    fs.writeFileSync(path.join(outFolder, 'start.bat'), startBat);
    fs.chmodSync(path.join(outFolder, 'start.sh'), 0o755);
    // package into zip
      // Create a `start-windows.bat` which opens a new cmd window and keeps it open by default
      const startWindowsBat = `@echo off
  setlocal
  :: persistent start entry for Windows users - opens a new CMD window and runs the node binary or fallback with --status
  if exist "%~dp0\\${exeName}" (
    start "${node.name}" cmd /k "%%~dp0\\${exeName} --status %%* || (echo [${node.name}] Node exited with code %ERRORLEVEL% & pause)"
  ) else (
    start "${node.name}" cmd /k "node \"%~dp0\\server.js\" --status %%* || (echo [${node.name}] Node exited with code %ERRORLEVEL% & pause)"
  )
  exit /b 0
  `;
      fs.writeFileSync(path.join(outFolder, 'start-windows.bat'), startWindowsBat);
    const arch = t.target.split('-').slice(-1)[0] || 'x64';
    const zipName = `${node.name}-${t.os}-${arch}.zip`;
    const zipPath = path.join(dist, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(outFolder, false);
    await archive.finalize();
    console.log('Created', zipPath);
  }
}

console.log('Done packaging binaries. Artifacts are located in dist/*.zip');
