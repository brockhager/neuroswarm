#!/usr/bin/env node
/**
 * Fast packaging script - creates source-based packages without pkg binaries
 * This is much faster and more reliable than trying to bundle with pkg
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ensureDirInRepoSync, safeJoinRepo, safeRmInRepoSync } from './repoScopedFs.mjs';
import archiver from 'archiver';

const nodes = [
    { name: 'ns-node', entry: path.join('ns-node', 'server.js'), port: 3000 },
    { name: 'gateway-node', entry: path.join('gateway-node', 'server.js'), port: 8080 },
    { name: 'vp-node', entry: path.join('vp-node', 'server.js'), port: 4000 }
];

const targets = [
    { os: 'linux', ext: '.sh' },
    { os: 'macos', ext: '.sh' },
    { os: 'win', ext: '.bat' }
];

const dist = safeJoinRepo('dist');
if (fs.existsSync(dist)) {
    try { safeRmInRepoSync(dist); } catch (e) { /* ignore */ }
}
if (!ensureDirInRepoSync(dist)) throw new Error('Dist folder is outside repo root');

console.log('📦 Fast Packaging - Source-based distributions only\n');

for (const node of nodes) {
    for (const t of targets) {
        const outFolder = path.join(dist, node.name, t.os);
        if (fs.existsSync(outFolder)) {
            try { safeRmInRepoSync(outFolder); } catch (e) { /* ignore */ }
        }
        if (!ensureDirInRepoSync(outFolder)) throw new Error('Out folder is outside repo');

        console.log(`📦 Packaging ${node.name} for ${t.os}...`);

        // Copy server.js
        const srcServer = path.join(process.cwd(), node.entry);
        fs.copyFileSync(srcServer, path.join(outFolder, 'server.js'));

        // Copy package.json (needed for dependencies)
        const srcPkg = path.join(path.dirname(srcServer), 'package.json');
        if (fs.existsSync(srcPkg)) {
            fs.copyFileSync(srcPkg, path.join(outFolder, 'package.json'));
        }

        // Copy public/ folder if exists
        const srcPublic = path.join(path.dirname(srcServer), 'public');
        if (fs.existsSync(srcPublic)) {
            const dstPublic = path.join(outFolder, 'public');
            fs.cpSync(srcPublic, dstPublic, { recursive: true });
        }

        // Create README with instructions
        const readme = `# ${node.name}

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Run \`npm install\` in this directory

### Running
${t.os === 'win' ? 'Double-click `start.bat` or run:' : 'Run:'}
\`\`\`
${t.os === 'win' ? 'start.bat' : './start.sh'}
\`\`\`

### Manual Start
\`\`\`
npm install
node server.js
\`\`\`

The service will start on port ${node.port}.
`;
        fs.writeFileSync(path.join(outFolder, 'README.md'), readme);

        // Create start scripts
        if (t.os === 'win') {
            const batContent = `@echo off
echo Installing dependencies...
call npm install
echo.
echo Starting ${node.name} on port ${node.port}...
set PORT=${node.port}
node server.js
pause
`;
            fs.writeFileSync(path.join(outFolder, 'start.bat'), batContent);
        } else {
            const shContent = `#!/usr/bin/env bash
echo "Installing dependencies..."
npm install
echo ""
echo "Starting ${node.name} on port ${node.port}..."
export PORT=${node.port}
node server.js
`;
            const shPath = path.join(outFolder, 'start.sh');
            fs.writeFileSync(shPath, shContent);
            try { fs.chmodSync(shPath, 0o755); } catch (e) { }
        }

        // Create ZIP
        const zipName = `${node.name}-${t.os}-x64.zip`;
        const zipPath = path.join(dist, zipName);

        console.log(`  Creating ${zipName}...`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(outFolder, false);
            archive.finalize();
        });

        console.log(`  ✅ Created ${zipName} (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB)`);
    }
}

console.log('\n✅ Done packaging! Artifacts are in dist/*.zip');
console.log('\nNote: These are source-based packages. Users will need Node.js installed.');
console.log('Run `npm install` in the extracted folder before starting the service.');
