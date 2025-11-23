#!/usr/bin/env node
/**
 * Simple ZIP packaging - Everything included, just extract and run
 * No Docker, no npm install required
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { ensureDirInRepoSync, safeJoinRepo, safeRmInRepoSync } from './repoScopedFs.mjs';
import archiver from 'archiver';

const nodes = [
    { name: 'ns-node', dir: 'ns-node', port: 3000 },
    { name: 'gateway-node', dir: 'gateway-node', port: 8080 },
    { name: 'vp-node', dir: 'vp-node', port: 4000 }
];

const dist = safeJoinRepo('dist-simple');
if (fs.existsSync(dist)) {
    console.log('Cleaning old dist folder...');
    try { safeRmInRepoSync(dist); } catch (e) { /* ignore */ }
}
if (!ensureDirInRepoSync(dist)) throw new Error('Dist folder is outside repo root');

console.log('📦 Creating Self-Contained ZIP Packages\n');
console.log('This will create ZIP files with everything included.');
console.log('Users just extract and double-click the start script.\n');

for (const node of nodes) {
    console.log(`\n📦 Packaging ${node.name}...`);

    const nodeDir = path.join(process.cwd(), node.dir);
    const outFolder = path.join(dist, node.name);

    if (!ensureDirInRepoSync(outFolder)) throw new Error('Out folder is outside repo');

    // 1. Copy all application files
    console.log('  Copying application files...');
    const filesToCopy = ['server.js', 'package.json', 'logger.js', 'default-config.json'];
    for (const file of filesToCopy) {
        const src = path.join(nodeDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(outFolder, file));
        }
    }

    // 2. Copy directories
    const dirsToCopy = ['public', 'data', 'src'];
    for (const dir of dirsToCopy) {
        const src = path.join(nodeDir, dir);
        if (fs.existsSync(src)) {
            console.log(`  Copying ${dir}/...`);
            fs.cpSync(src, path.join(outFolder, dir), { recursive: true });
        }
    }

    // 3. Install dependencies in the output folder
    console.log('  Installing dependencies (this may take a minute)...');
    try {
        execSync('npm install --production --no-optional', {
            cwd: outFolder,
            stdio: 'pipe'
        });
        console.log('  ✅ Dependencies installed');
    } catch (err) {
        console.error('  ❌ Failed to install dependencies:', err.message);
        continue;
    }

    // 4. Copy shared modules (needed by server.js)
    console.log('  Copying shared modules...');
    const sharedSrc = path.join(process.cwd(), 'shared');
    if (fs.existsSync(sharedSrc)) {
        fs.cpSync(sharedSrc, path.join(outFolder, 'shared'), { recursive: true });
    }

    const sourcesSrc = path.join(process.cwd(), 'sources');
    if (fs.existsSync(sourcesSrc)) {
        fs.cpSync(sourcesSrc, path.join(outFolder, 'sources'), { recursive: true });
    }

    const scriptsSrc = path.join(process.cwd(), 'scripts');
    if (fs.existsSync(scriptsSrc)) {
        fs.cpSync(scriptsSrc, path.join(outFolder, 'scripts'), { recursive: true });
    }

    // 5. Create simple start scripts
    console.log('  Creating start scripts...');

    // Windows batch file
    const batContent = `@echo off
title ${node.name}
echo ========================================
echo Starting ${node.name}
echo ========================================
echo.
echo Port: ${node.port}
echo.
set PORT=${node.port}
node server.js
echo.
echo ${node.name} has stopped.
pause
`;
    fs.writeFileSync(path.join(outFolder, 'START.bat'), batContent);

    // Linux/Mac shell script
    const shContent = `#!/usr/bin/env bash
echo "========================================"
echo "Starting ${node.name}"
echo "========================================"
echo ""
echo "Port: ${node.port}"
echo ""
export PORT=${node.port}
node server.js
`;
    const shPath = path.join(outFolder, 'START.sh');
    fs.writeFileSync(shPath, shContent);
    try { fs.chmodSync(shPath, 0o755); } catch (e) { }

    // 6. Create README
    const readme = `# ${node.name}

## Quick Start

### Windows
1. Double-click \`START.bat\`
2. Open your browser to http://localhost:${node.port}

### Mac/Linux
1. Open Terminal in this folder
2. Run: \`./START.sh\`
3. Open your browser to http://localhost:${node.port}

## Requirements
- Node.js 18 or higher must be installed
- Download from: https://nodejs.org/

## What's Included
✅ All application code
✅ All dependencies (node_modules)
✅ Start scripts for Windows and Mac/Linux
✅ No installation required - just run!

## Troubleshooting

**"node is not recognized" error:**
- Install Node.js from https://nodejs.org/
- Restart your computer after installation

**Port already in use:**
- Another application is using port ${node.port}
- Close other applications or change the PORT in START.bat

## Support
For issues, visit: https://github.com/brockhager/neuroswarm
`;
    fs.writeFileSync(path.join(outFolder, 'README.txt'), readme);

    // 7. Create ZIP file
    console.log('  Creating ZIP archive...');
    const zipName = `${node.name}-complete.zip`;
    const zipPath = path.join(dist, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
        output.on('close', () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`  ✅ Created ${zipName} (${sizeMB} MB)`);
            resolve();
        });
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(outFolder, node.name);
        archive.finalize();
    });
}

console.log('\n✅ All packages created successfully!');
console.log(`\nZIP files are in: ${dist}`);
console.log('\nUsers can:');
console.log('1. Download the ZIP file');
console.log('2. Extract it anywhere');
console.log('3. Double-click START.bat (Windows) or run ./START.sh (Mac/Linux)');
console.log('\nNo Docker, no npm install, no configuration needed!');
