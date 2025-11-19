const { dialog } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipeline = promisify(pipeline);
const AdmZip = require('adm-zip');

const GITHUB_RELEASES_API = 'https://api.github.com/repos/brockhager/neuroswarm/releases/latest';
const COMPONENTS_DIR = path.join(__dirname, '..', 'components');

// Ensure components directory exists
if (!fs.existsSync(COMPONENTS_DIR)) {
    fs.mkdirSync(COMPONENTS_DIR, { recursive: true });
}

/**
 * Detect the current platform and architecture
 */
function getPlatform() {
    const platform = process.platform;
    const arch = process.arch;

    let os = 'linux';
    if (platform === 'win32') os = 'win';
    else if (platform === 'darwin') os = 'macos';

    return { os, arch: arch === 'arm64' ? 'arm64' : 'x64' };
}

/**
 * Fetch latest release information from GitHub
 */
async function getLatestRelease() {
    return new Promise((resolve, reject) => {
        https.get(GITHUB_RELEASES_API, {
            headers: { 'User-Agent': 'NeuroSwarm-Launcher' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

/**
 * Download a file from URL to destination
 */
async function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'NeuroSwarm-Launcher' }
        }, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // Follow redirect
                return downloadFile(res.headers.location, dest, onProgress)
                    .then(resolve)
                    .catch(reject);
            }

            const totalSize = parseInt(res.headers['content-length'], 10);
            let downloaded = 0;

            res.on('data', (chunk) => {
                downloaded += chunk.length;
                if (onProgress && totalSize) {
                    onProgress(downloaded, totalSize);
                }
            });

            const fileStream = fs.createWriteStream(dest);
            streamPipeline(res, fileStream)
                .then(() => resolve(dest))
                .catch(reject);
        }).on('error', reject);
    });
}

/**
 * Extract ZIP file to destination
 */
function extractZip(zipPath, destDir) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    fs.unlinkSync(zipPath); // Clean up ZIP after extraction
}

/**
 * Check if a component is already installed
 */
function isComponentInstalled(componentName) {
    const componentPath = path.join(COMPONENTS_DIR, componentName);
    return fs.existsSync(componentPath);
}

/**
 * Show component selection dialog
 */
async function showComponentSelector() {
    const result = await dialog.showMessageBox({
        type: 'question',
        title: 'NeuroSwarm Setup',
        message: 'Select Components to Install',
        detail: 'Choose which NeuroSwarm components you want to download and install:',
        checkboxLabel: 'Install all components (recommended for node operators)',
        buttons: ['Desktop App Only', 'Desktop + NS Node', 'Desktop + All Nodes', 'Cancel'],
        defaultId: 0,
        cancelId: 3
    });

    const components = [];

    switch (result.response) {
        case 0: // Desktop App Only
            // No additional components needed
            break;
        case 1: // Desktop + NS Node
            components.push('ns-node');
            break;
        case 2: // Desktop + All Nodes
            components.push('ns-node', 'gateway-node', 'vp-node');
            break;
        case 3: // Cancel
            return null;
    }

    return components;
}

/**
 * Download and install selected components
 */
async function downloadComponents(components, progressWindow) {
    try {
        const release = await getLatestRelease();
        const { os, arch } = getPlatform();

        for (const component of components) {
            const assetName = `${component}-${os}-${arch}.zip`;
            const asset = release.assets.find(a => a.name === assetName);

            if (!asset) {
                console.error(`Asset not found: ${assetName}`);
                continue;
            }

            // Update progress window
            if (progressWindow) {
                progressWindow.webContents.send('download-status', {
                    component,
                    status: 'downloading',
                    message: `Downloading ${component}...`
                });
            }

            const zipPath = path.join(COMPONENTS_DIR, assetName);
            const componentDir = path.join(COMPONENTS_DIR, component);

            // Download
            await downloadFile(asset.browser_download_url, zipPath, (downloaded, total) => {
                const percent = Math.round((downloaded / total) * 100);
                if (progressWindow) {
                    progressWindow.webContents.send('download-progress', {
                        component,
                        percent
                    });
                }
            });

            // Extract
            if (progressWindow) {
                progressWindow.webContents.send('download-status', {
                    component,
                    status: 'extracting',
                    message: `Extracting ${component}...`
                });
            }

            extractZip(zipPath, componentDir);

            // Mark as complete
            if (progressWindow) {
                progressWindow.webContents.send('download-status', {
                    component,
                    status: 'complete',
                    message: `${component} installed successfully`
                });
            }
        }

        return true;
    } catch (error) {
        console.error('Download error:', error);
        return false;
    }
}

/**
 * Main setup flow
 */
async function runComponentSetup(progressWindow) {
    const components = await showComponentSelector();

    if (components === null) {
        return false; // User cancelled
    }

    if (components.length === 0) {
        return true; // Desktop only, no downloads needed
    }

    const success = await downloadComponents(components, progressWindow);
    return success;
}

module.exports = {
    runComponentSetup,
    isComponentInstalled,
    getPlatform,
    COMPONENTS_DIR
};
