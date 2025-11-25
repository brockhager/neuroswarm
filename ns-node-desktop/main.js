const { app, Tray, Menu, shell, nativeImage, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const LaunchService = require('./services/launch-service');

let launchService;
let tray;
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

// Create system tray
function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open NeuroSwarm',
            click: () => {
                if (launchService && launchService.mainWindow) {
                    launchService.mainWindow.show();
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
                if (launchService) {
                    launchService.stop();
                    setTimeout(() => launchService.startServer(), 1000);
                    if (launchService.mainWindow) launchService.mainWindow.reload();
                }
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
        if (launchService && launchService.mainWindow) {
            launchService.mainWindow.show();
        }
    });
}

// App ready
app.whenReady().then(() => {
    log('Application starting...');

    const resourcesPath = getResourcesPath();
    launchService = new LaunchService(app, resourcesPath, log);
    launchService.launch();

    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            launchService.launch();
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
    if (launchService) {
        launchService.stop();
    }
    if (tray) {
        tray.destroy();
        tray = null;
    }
});

app.on('will-quit', () => {
    if (launchService) {
        launchService.stop();
    }
});
