const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let tray;
let serverProcess;
const PORT = 3000;

// Get the resources path (works in both dev and production)
function getResourcesPath() {
    if (app.isPackaged) {
        // In production, resources are in process.resourcesPath/app
        return path.join(process.resourcesPath, 'app');
    } else {
        // In development, go up one level from ns-node-desktop
        return path.join(__dirname, '..');
    }
}

// Start the Node.js server
function startServer() {
    console.log('Starting NeuroSwarm server...');

    const resourcesPath = getResourcesPath();
    const serverPath = path.join(resourcesPath, 'ns-node', 'server.js');

    console.log('Server path:', serverPath);
    console.log('Resources path:', resourcesPath);

    serverProcess = spawn('node', [serverPath], {
        env: {
            ...process.env,
            PORT: PORT,
            NODE_ENV: 'production'
        },
        cwd: path.join(resourcesPath, 'ns-node'),
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`Server: ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
    });

    serverProcess.on('exit', (code) => {
        console.log(`Server exited with code ${code}`);
        serverProcess = null;
    });
}

// Stop the server
function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

// Create the main window
function createWindow() {
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
        show: false
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Wait for server to start, then load the page
    setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${PORT}`);
    }, 3000);

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create system tray
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);

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
            label: 'Restart Server',
            click: () => {
                stopServer();
                setTimeout(startServer, 1000);
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
    startServer();
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    // Keep running in tray
});

// Clean up on quit
app.on('before-quit', () => {
    app.isQuitting = true;
    stopServer();
});

app.on('will-quit', () => {
    stopServer();
});
