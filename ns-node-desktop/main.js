const { app, BrowserWindow, Tray, Menu, shell, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let splashWindow;
let tray;
let serverProcess;
const PORT = 3011;
const LOG_FILE = path.join(app.getPath('userData'), 'neuroswarm.log');

// Simple logger
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (e) {
        console.error('Failed to write log:', e);
    }
    console.log(message);
}

// Get the resources path
function getResourcesPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app');
    } else {
        return path.join(__dirname, '..');
    }
}

// Check if server is ready
function checkServerReady(retries = 45) { // Increased retries for slower machines
    return new Promise((resolve, reject) => {
        const check = (attempt) => {
            const url = `http://127.0.0.1:${PORT}/health`;
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    log('Server is ready! (Health check passed)');
                    resolve(true);
                } else {
                    log(`Server not ready yet. Status code: ${res.statusCode}`);
                    retry(attempt);
                }
            }).on('error', (err) => {
                log(`Server check failed: ${err.message}`);
                retry(attempt);
            });
        };

        const retry = (attempt) => {
            if (attempt <= 0) {
                log('Server failed to become ready in time');
                resolve(false);
            } else {
                setTimeout(() => check(attempt - 1), 1000);
            }
        };

        check(retries);
    });
}

// Load configuration
function loadConfig() {
    const configPath = path.join(app.getPath('userData'), 'neuroswarm.config.json');
    const defaultConfig = {
        bootstrapPeers: "",
        note: "To connect to a remote node, add its IP:PORT here. Example: '192.168.1.10:3009'"
    };

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        } else {
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
    } catch (e) {
        log(`Failed to load config: ${e.message}`);
        return defaultConfig;
    }
}

// Start the Node.js server
function startServer() {
    log('Starting NeuroSwarm server...');

    const resourcesPath = getResourcesPath();
    const serverPath = path.join(resourcesPath, 'ns-node', 'server.js');
    const cwd = path.join(resourcesPath, 'ns-node');
    const config = loadConfig();

    log(`Server path: ${serverPath}`);
    log(`Working directory: ${cwd}`);
    if (config.bootstrapPeers) {
        log(`Using bootstrap peers: ${config.bootstrapPeers}`);
    }

    if (!fs.existsSync(serverPath)) {
        log(`ERROR: Server file not found at ${serverPath}`);
        return;
    }

    serverProcess = spawn(process.execPath, [serverPath], {
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            PORT: PORT,
            NODE_ENV: 'production',
            BOOTSTRAP_PEERS: config.bootstrapPeers || process.env.BOOTSTRAP_PEERS || ''
        },
        cwd: cwd,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        log(`Server Error: ${data}`);
    });

    serverProcess.on('error', (err) => {
        log(`Failed to start server process: ${err.message}`);
    });

    serverProcess.on('exit', (code) => {
        log(`Server exited with code ${code}`);
        serverProcess = null;
    });
}

// Stop the server
function stopServer() {
    if (serverProcess) {
        log('Stopping server...');
        serverProcess.kill();
        serverProcess = null;
    }
}

// Create splash window
function createSplash() {
    const splashHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>NeuroSwarm</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
                height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                user-select: none;
                -webkit-app-region: drag;
            }
            .logo {
                font-size: 64px;
                margin-bottom: 20px;
                animation: pulse 2s infinite ease-in-out;
            }
            h1 {
                font-size: 24px;
                font-weight: 600;
                margin: 0 0 10px 0;
                letter-spacing: 1px;
            }
            .status {
                font-size: 14px;
                color: #94a3b8;
                margin-top: 10px;
            }
            .loader {
                width: 200px;
                height: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 2px;
                margin-top: 20px;
                overflow: hidden;
            }
            .loader-bar {
                width: 50%;
                height: 100%;
                background: #3b82f6;
                border-radius: 2px;
                animation: loading 1.5s infinite ease-in-out;
            }
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
            }
        </style>
    </head>
    <body>
        <div class="logo">🧠</div>
        <h1>NeuroSwarm</h1>
        <div class="loader">
            <div class="loader-bar"></div>
        </div>
        <div class="status">Starting local AI node...</div>
    </body>
    </html>
    `;

    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        show: true,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false
        },
        backgroundColor: '#1e3a8a'
    });
    // Use data URL for instant rendering
    splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
    splashWindow.center();
}

// Create system tray
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open NeuroSwarm',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createWindow();
                }
            }
        },
        {
            label: 'View Logs',
            click: () => {
                shell.openPath(LOG_FILE);
            }
        },
        {
            label: 'Restart Server',
            click: () => {
                stopServer();
                setTimeout(startServer, 1000);
                if (mainWindow) mainWindow.reload();
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('NeuroSwarm - Your Personal AI');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.show();
        } else {
            createWindow();
        }
    });
}

// App ready
app.whenReady().then(() => {
    log('Application starting...');
    createWindow(); // This now handles splash + server start
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Clean up on quit
app.on('before-quit', () => {
    app.isQuitting = true;
    stopServer();
    if (tray) {
        tray.destroy();
        tray = null;
    }
});

app.on('will-quit', () => {
    stopServer();
});
