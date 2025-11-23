#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ensureDirInRepoSync, safeJoinRepo, safeRmInRepoSync } from './repoScopedFs.mjs';
import archiver from 'archiver';
import crypto from 'crypto';

const nodes = [
  { name: 'ns-node', entry: path.join('ns-node', 'server.js'), port: 3000 },
  { name: 'gateway-node', entry: path.join('gateway-node', 'server.js'), port: 8080 },
  { name: 'vp-node', entry: path.join('vp-node', 'server.js'), port: 4000 }
];

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

if (!keepOpen && (String(process.env.KEEP_OPEN || '').toLowerCase() === '1' || String(process.env.KEEP_OPEN || '').toLowerCase() === 'true')) {
  keepOpen = true;
}

const dist = safeJoinRepo('dist');
if (fs.existsSync(dist)) {
  try { safeRmInRepoSync(dist); } catch (e) { /* ignore */ }
}
if (!ensureDirInRepoSync(dist)) throw new Error('Dist folder is outside repo root');

const archivePromises = [];

for (const node of nodes) {
  for (const t of targets.filter(tt => !filter || tt.os === filter)) {
    const outFolder = path.join(dist, node.name, t.os);
    if (fs.existsSync(outFolder)) {
      try { safeRmInRepoSync(outFolder); } catch (e) { /* ignore */ }
    }
    if (!ensureDirInRepoSync(outFolder)) throw new Error('Out folder is outside repo');
    const exeName = node.name + (t.os === 'win' ? '.exe' : '');
    const outPath = path.join(outFolder, exeName);
    console.log(`Packaging ${node.name} for ${t.os} -> ${outPath}`);
    let builtBinary = false;
    const res = spawnSync('npx', ['pkg', node.entry, '--targets', t.target, '--out-path', outFolder], { stdio: 'inherit' });
    if (res.status === 0) {
      builtBinary = true;
    } else {
      console.warn(`pkg failed for ${node.name} on ${t.os}; creating source-based fallback archive.`);
      const srcServer = path.join(process.cwd(), node.entry);
      const fallbackName = 'server.js';
      fs.copyFileSync(srcServer, path.join(outFolder, fallbackName));
      const srcPublic = path.join(path.dirname(srcServer), 'public');
      const dstPublic = path.join(outFolder, 'public');
      if (fs.existsSync(srcPublic)) {
        try {
          fs.cpSync(srcPublic, dstPublic, { recursive: true });
        } catch (e) {
          const files = fs.readdirSync(srcPublic, { withFileTypes: true });
          for (const f of files) {
            const s = path.join(srcPublic, f.name);
            const d = path.join(dstPublic, f.name);
            if (f.isDirectory()) {
              ensureDirInRepoSync(d);
              function cpDir(sdir, ddir) {
                ensureDirInRepoSync(ddir);
                for (const ent of fs.readdirSync(sdir, { withFileTypes: true })) {
                  const s2 = path.join(sdir, ent.name);
                  const d2 = path.join(ddir, ent.name);
                  if (ent.isDirectory()) cpDir(s2, d2); else fs.copyFileSync(s2, d2);
                }
              }
              cpDir(s, d);
            } else {
              ensureDirInRepoSync(path.dirname(d));
              fs.copyFileSync(s, d);
            }
          }
        }
      }
    }
    if (!builtBinary) {
      const srcNodeModules = path.join(process.cwd(), 'node_modules');
      const dstNodeModules = path.join(outFolder, 'node_modules');
      if (fs.existsSync(srcNodeModules)) {
        console.log(`  Copying node_modules to ${dstNodeModules}...`);
        try {
          fs.cpSync(srcNodeModules, dstNodeModules, { recursive: true });
        } catch (e) {
          console.warn(`  Warning: Failed to copy node_modules: ${e.message}`);
        }
      }
      const srcSources = path.join(process.cwd(), 'sources');
      const dstSources = path.join(outFolder, 'sources');
      if (fs.existsSync(srcSources)) {
        console.log(`  Copying sources/ to ${dstSources}...`);
        try {
          fs.cpSync(srcSources, dstSources, { recursive: true });
        } catch (e) {
          console.warn(`  Warning: Failed to copy sources/: ${e.message}`);
        }
      }
    }
    if (builtBinary) {
      const createdName = path.join(outFolder, path.basename(node.entry, '.js')) + (t.os === 'win' ? '.exe' : '');
      if (fs.existsSync(createdName) && createdName !== outPath) {
        fs.renameSync(createdName, outPath);
      }
    }
    try {
      const srcServer = path.join(process.cwd(), node.entry);
      if (fs.existsSync(srcServer)) fs.copyFileSync(srcServer, path.join(outFolder, 'server.js'));
    } catch (e) { }
    try {
      const baseName = node.name.replace('-node', '');
      const srcRunBat = path.join(process.cwd(), node.name, `run-${baseName}.bat`);
      const srcRunSh = path.join(process.cwd(), node.name, `run-${baseName}.sh`);
      const dstRunBat = path.join(outFolder, `run-${baseName}.bat`);
      const dstRunSh = path.join(outFolder, `run-${baseName}.sh`);
      if (fs.existsSync(srcRunBat)) {
        fs.copyFileSync(srcRunBat, dstRunBat);
      } else {
        const batContent = `@echo off\r\ncd %~dp0\r\nnode server.js --status`;
        fs.writeFileSync(dstRunBat, batContent);
      }
      if (fs.existsSync(srcRunSh)) {
        fs.copyFileSync(srcRunSh, dstRunSh);
        try { fs.chmodSync(dstRunSh, 0o755); } catch (e) { }
      } else {
        const shContent = `#!/usr/bin/env bash\ncd \"$(dirname \"$0\")\"\nnode server.js --status`;
        fs.writeFileSync(dstRunSh, shContent);
        try { fs.chmodSync(dstRunSh, 0o755); } catch (e) { }
      }
    } catch (e) { /* ignore run script copy errors */ }
    const startCommand = builtBinary ? `./${exeName}` : `node server.js`;
    const shStartCmd = builtBinary ? `./${exeName}` : `node \"$(dirname \"$0\")/server.js\"`;

    const shLines = [];
    shLines.push('#!/usr/bin/env bash');
    shLines.push(`export PORT=${node.port}`);
    shLines.push(`export NS_NODE_URL=${process.env.NS_NODE_URL || 'http://localhost:3000'}`);
    shLines.push('export NS_CHECK_EXIT_ON_FAIL=false');
    if (statusFlag) shLines.push('export STATUS=1');
    shLines.push('# Run compiled binary if present; if it fails, log warning and fallback to node server.js');
    shLines.push(`if [ -x \"$(dirname \"$0\")/${exeName}\" ]; then`);
    shLines.push(`  \"$(dirname \"$0\")/${exeName}\" \"$@\"`);
    shLines.push('  EXIT_CODE=$?');
    shLines.push('  if [ $EXIT_CODE -ne 0 ]; then');
    shLines.push(`    echo \"[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARNING: ${node.name} binary failed with code $EXIT_CODE; falling back to node server.js\"`);
    shLines.push(`    node \"$(dirname \"$0\")/server.js\" \"$@\"`);
    shLines.push('    EXIT_CODE=$?');
    shLines.push('  fi');
    shLines.push('else');
    shLines.push(`${shStartCmd} \"$@\"`);
    shLines.push('  EXIT_CODE=$?');
    shLines.push('fi');
    shLines.push('EXIT_CODE=$?');
    shLines.push('if [ $EXIT_CODE -ne 0 ]; then');
    shLines.push(`  echo \"[\\$(date -u +%Y-%m-%dT%H:%M:%SZ)] ${node.name} exited with code $EXIT_CODE\"`);
    if (keepOpen) shLines.push('  read -n 1 -s -r -p \"Press any key to close...\"; echo');
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
    const batStartCmd = builtBinary ? `"%~dp0\\${exeName}" %*` : `node "%~dp0\\server.js" %*`;
    const startBat = `@echo off\nsetlocal\nset PORT=${node.port}\nset NS_NODE_URL=${process.env.NS_NODE_URL || 'http://localhost:3000'}\nset NS_CHECK_EXIT_ON_FAIL=false\n${statusFlag ? `set STATUS=1\n` : ''}:: Try to run compiled binary if present; if it fails, log and fallback\nif exist "%~dp0\\${exeName}" (\n  "%~dp0\\${exeName}" %*\n  set EXITCODE=%ERRORLEVEL%\n  if %EXITCODE% NEQ 0 (\n    echo [%DATE% %TIME%] WARNING: ${node.name} binary failed with code %EXITCODE%; falling back to node server.js\n    node "%~dp0\\server.js" %*\n    set EXITCODE=%ERRORLEVEL%\n  )\n) else (\n  node "%~dp0\\server.js" %*\n  set EXITCODE=%ERRORLEVEL%\n)\nif %EXITCODE% NEQ 0 (\n  echo [%DATE% %TIME%] ${node.name} exited with code %EXITCODE%\n  ${keepOpen ? 'pause\n' : ''}\n)\nexit /b %EXITCODE%\n`;
    fs.writeFileSync(path.join(outFolder, 'start.sh'), startSh);
    fs.writeFileSync(path.join(outFolder, 'start.bat'), startBat);
    fs.chmodSync(path.join(outFolder, 'start.sh'), 0o755);

    const arch = t.target.split('-').slice(-1)[0] || 'x64';
    const zipName = `${node.name}-${t.os}-${arch}.zip`;
    const zipPath = path.join(dist, zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log('Created', zipPath);
        resolve();
      });
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(outFolder, false);
      archive.finalize();
    });

    archivePromises.push(archivePromise);
  }
}

Promise.all(archivePromises).then(() => {
  console.log('Done packaging binaries. Artifacts are located in dist/*.zip');

  try {
    const zipFiles = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.isFile() && e.name.endsWith('.zip')) zipFiles.push(full);
      }
    };
    walk(dist);
    const checksums = [];
    for (const z of zipFiles) {
      const data = fs.readFileSync(z);
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      const name = path.basename(z);
      checksums.push(`${hash}  ${name}`);
    }
    if (checksums.length > 0) fs.writeFileSync(path.join(dist, 'checksums.txt'), checksums.join('\n'));
  } catch (e) {
    console.warn('Failed to write checksums:', e.message);
  }
}).catch(err => {
  console.error('Archive creation failed:', err);
  process.exit(1);
});
