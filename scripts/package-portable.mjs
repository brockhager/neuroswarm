#!/usr/bin/env node
/**
 * Portable Package - Bundles Node.js runtime with the application
 * Users don't need to install anything
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';
import { ensureDirInRepoSync, safeJoinRepo, safeRmInRepoSync } from './repoScopedFs.mjs';
import archiver from 'archiver';

// Node.js portable download URLs
const NODE_VERSIONS = {
    win: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip',
    linux: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz',
    macos: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-darwin-x64.tar.gz'
};

const nodes = [
    { name: 'ns-node', dir: 'ns-node', port: 3000 }
];

const dist = safeJoinRepo('dist-portable');
if (fs.existsSync(dist)) {
    console.log('Cleaning old dist folder...');
    try { safeRmInRepoSync(dist); } catch (e) { /* ignore */ }
}
if (!ensureDirInRepoSync(dist)) throw new Error('Dist folder is outside repo root');

console.log('📦 Creating Portable Packages with Bundled Node.js\n');
console.log('This creates truly standalone packages - no installation needed!\n');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });
    });
}

for (const node of nodes) {
    console.log(`\n📦 Packaging ${node.name} (Windows only for now)...`);

    const nodeDir = path.join(process.cwd(), node.dir);
    const outFolder = path.join(dist, node.name);

    if (!ensureDirInRepoSync(outFolder)) throw new Error('Out folder is outside repo');

    // 1. Copy application files
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

    // 3. Install dependencies
    console.log('  Installing dependencies...');
    try {
        execSync('npm install --production --no-optional', {
            cwd: outFolder,
            stdio: 'pipe'
        });
        console.log('  ✅ Dependencies installed');
    } catch (err) {
        console.error('  ❌ Failed to install dependencies');
        continue;
    }

    // 4. Copy shared modules
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

    // 5. Create launcher that uses bundled Node.js
    console.log('  Creating portable launcher...');

    const launcherBat = `@echo off
title ${node.name}
echo ========================================
echo Starting ${node.name}
echo ========================================
echo.
echo Port: ${node.port}
echo.
echo NOTE: This package includes Node.js - no installation needed!
echo.
set PORT=${node.port}
"%~dp0node\\node.exe" "%~dp0server.js"
echo.
echo ${node.name} has stopped.
pause
`;
    fs.writeFileSync(path.join(outFolder, 'START.bat'), launcherBat);

    // 6. Create README
    const readme = `# ${node.name} - Portable Edition

## Quick Start

### Windows
1. Double-click \`START.bat\`
2. Open your browser to http://localhost:${node.port}

**No installation required!** This package includes Node.js.

## What's Included
✅ Complete application
✅ Node.js runtime (portable)
✅ All dependencies
✅ Just extract and run!

## File Size
This package is larger (~50MB) because it includes Node.js.
This means you don't need to install anything!

## Troubleshooting

**Port already in use:**
- Another application is using port ${node.port}
- Close other applications or restart your computer

**Antivirus warning:**
- Some antivirus software may flag portable Node.js
- This is a false positive - the package is safe
- Add an exception if needed

## Support
For issues, visit: https://github.com/brockhager/neuroswarm
`;
    fs.writeFileSync(path.join(outFolder, 'README.txt'), readme);

    console.log('  ✅ Package structure created');
    console.log('\n  ⚠️  Manual step required:');
    console.log('  Download portable Node.js from:');
    console.log('  https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip');
    console.log(`  Extract the 'node-v20.11.0-win-x64' folder to: ${outFolder}\\node`);
    console.log('  Then the package will be fully standalone!');
}

console.log('\n📝 Next Steps:');
console.log('1. Download portable Node.js (see links above)');
console.log('2. Extract to the correct folders');
console.log('3. Create ZIP files for distribution');
console.log('\nOnce complete, users just extract and run - no installation!');
