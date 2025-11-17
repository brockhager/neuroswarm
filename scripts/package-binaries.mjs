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
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--os' && args[i + 1]) { filter = args[i + 1]; i++; }
}

const dist = path.join(process.cwd(), 'dist');
if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

for (const node of nodes) {
  for (const t of targets.filter(tt => !filter || tt.os === filter)) {
    const outFolder = path.join(dist, node.name, t.os);
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
    }
    // If pkg output file is named `server` (from server.js) attempt to rename to a more friendly name
    if (builtBinary) {
      const createdName = path.join(outFolder, path.basename(node.entry, '.js')) + (t.os === 'win' ? '.exe' : '');
      if (fs.existsSync(createdName) && createdName !== outPath) {
        fs.renameSync(createdName, outPath);
      }
    }
    // write a platform-aware start script
    const startCommand = builtBinary ? `./${exeName}` : `node server.js`;
    const startSh = `#!/usr/bin/env bash\nexport PORT=${node.port}\nexport NS_NODE_URL=${process.env.NS_NODE_URL || 'http://localhost:3000'}\nexport NS_CHECK_EXIT_ON_FAIL=false\n${startCommand} & PID=$!\n# wait for /health\nfor i in {1..30}; do\n  if curl --silent --fail http://localhost:${node.port}/health; then break; fi\n  sleep 1\ndone\n` + (node.name === 'gateway-node' ? `\n# open browser on gateway for convenience\nif command -v xdg-open >/dev/null; then xdg-open http://localhost:${node.port}; elif command -v open >/dev/null; then open http://localhost:${node.port}; fi\n` : '') + `\nwait $PID\n`;
    const startBatCmd = builtBinary ? `${exeName}` : `node server.js`;
    const startBat = `@echo off\nset PORT=${node.port}\nset NS_NODE_URL=${process.env.NS_NODE_URL || 'http://localhost:3000'}\nset NS_CHECK_EXIT_ON_FAIL=false\nstart ${startBatCmd}\n` + (node.name === 'gateway-node' ? `\n:: wait for health and open browser (Windows)\nfor /L %%i in (1,1,30) do (\n  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:${node.port}/health).StatusCode -eq 200 } catch { $false }" && (start http://localhost:${node.port} & goto :done) || timeout /t 1 > nul\n)\n:done\n` : '') + `\n`;
    fs.writeFileSync(path.join(outFolder, 'start.sh'), startSh);
    fs.writeFileSync(path.join(outFolder, 'start.bat'), startBat);
    fs.chmodSync(path.join(outFolder, 'start.sh'), 0o755);
    // package into zip
    const zipName = `${node.name}-${t.os}.zip`;
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
