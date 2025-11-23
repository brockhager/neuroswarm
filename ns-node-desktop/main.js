const { app, BrowserWindow, Tray, Menu, shell, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let splashWindow;
let tray;
let serverProcess;
const PORT = 3000;
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
            http.get(`http://localhost:${PORT}`, (res) => {
                if (res.statusCode === 200) {
                    log('Server is ready!');
                    resolve(true);
                } else {
                    retry(attempt);
                }
            }).on('error', () => {
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

// Start the Node.js server
function startServer() {
    log('Starting NeuroSwarm server...');

    const resourcesPath = getResourcesPath();
    const serverPath = path.join(resourcesPath, 'ns-node', 'server.js');
    const cwd = path.join(resourcesPath, 'ns-node');

    log(`Server path: ${serverPath}`);
    log(`Working directory: ${cwd}`);

    if (!fs.existsSync(serverPath)) {
        log(`ERROR: Server file not found at ${serverPath}`);
        return;
    }

    serverProcess = spawn(process.execPath, [serverPath], {
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1',
            PORT: PORT,
            NODE_ENV: 'production'
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
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            nodeIntegration: false
        },
        backgroundColor: '#1e3a8a'
    });
    splashWindow.loadFile('splash.html');
    splashWindow.center();
}

// Create the main window
async function createWindow() {
    // Create splash first
    createSplash();

    // Start server in background
    startServer();

    // Prepare main window (hidden)
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'NeuroSwarm',
        autoHideMenuBar: true,
        show: false,
        backgroundColor: '#1e3a8a'
    });

    // Wait for server
    const isReady = await checkServerReady();

    if (isReady) {
        mainWindow.loadURL(`http://localhost:${PORT}`);
    } else {
        const errorHtml = `
            <html>
            <body style="background: #1e3a8a; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <h2>Failed to connect to server</h2>
                <p>Please check the logs at: ${LOG_FILE}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; cursor: pointer;">Retry</button>
            </body>
            </html>
        `;
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Close splash and show main window
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
    }
    mainWindow.show();

    mainWindow.on('close', (event) => {
        // Default behavior: Quit app when window is closed
        // If user wants to minimize to tray, they can use the minimize button
        // This resolves the "app won't close" complaint
        app.quit();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
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
});

app.on('will-quit', () => {
    stopServer();
});
