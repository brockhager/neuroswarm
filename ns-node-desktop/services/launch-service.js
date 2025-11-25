const { BrowserWindow, app } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

class LaunchService {
    constructor(appInstance, resourcesPath, logFunction) {
        this.app = appInstance;
        this.resourcesPath = resourcesPath;
        this.log = logFunction || console.log;
        this.splashWindow = null;
        this.mainWindow = null;
        this.serverProcess = null;
        this.PORT = 3011;
    }

    // Show splash screen immediately
    showSplash() {
        this.log('Creating splash window...');
        const splashHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>NeuroSwarm</title>
            <style>
                body { margin: 0; padding: 0; background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: sans-serif; user-select: none; -webkit-app-region: drag; }
                .logo { font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite ease-in-out; }
                h1 { font-size: 24px; margin: 0 0 10px 0; }
                .status { font-size: 14px; color: #94a3b8; margin-top: 10px; }
                .loader { width: 200px; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; margin-top: 20px; overflow: hidden; }
                .loader-bar { width: 50%; height: 100%; background: #3b82f6; border-radius: 2px; animation: loading 1.5s infinite ease-in-out; }
                @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
            </style>
        </head>
        <body>
            <div class="logo">🤖</div>
            <h1>NeuroSwarm</h1>
            <div class="loader"><div class="loader-bar"></div></div>
            <div class="status">Starting local AI node...</div>
        </body>
        </html>`;

        this.splashWindow = new BrowserWindow({
            width: 400,
            height: 300,
            transparent: false,
            frame: false,
            alwaysOnTop: true,
            show: true,
            icon: path.join(__dirname, '../icon.png'),
            webPreferences: { nodeIntegration: false },
            backgroundColor: '#1e3a8a'
        });

        // Try to load file, fallback to data URL
        const splashFile = path.join(__dirname, '../splash.html');
        if (fs.existsSync(splashFile)) {
            this.splashWindow.loadFile(splashFile).catch(err => {
                this.log(`Failed to load splash file: ${err.message}`);
                this.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
            });
        } else {
            this.splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHTML)}`);
        }
        this.splashWindow.center();
    }

    // Start the Node.js server
    startServer() {
        this.log('Starting NeuroSwarm server process...');
        const serverPath = path.join(this.resourcesPath, 'ns-node', 'server.js');
        const cwd = path.join(this.resourcesPath, 'ns-node');

        // Load config for peers if needed
        let bootstrapPeers = '';
        try {
            const configPath = path.join(this.app.getPath('userData'), 'neuroswarm.config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                bootstrapPeers = config.bootstrapPeers || '';
            }
        } catch (e) {
            this.log(`Config load error: ${e.message}`);
        }

        if (!fs.existsSync(serverPath)) {
            this.log(`ERROR: Server file not found at ${serverPath}`);
            return;
        }

        this.serverProcess = spawn(process.execPath, [serverPath], {
            env: {
                ...process.env,
                ELECTRON_RUN_AS_NODE: '1',
                PORT: this.PORT,
                NODE_ENV: 'production',
                BOOTSTRAP_PEERS: bootstrapPeers || process.env.BOOTSTRAP_PEERS || ''
            },
            cwd: cwd,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.serverProcess.stdout.on('data', (data) => this.log(`Server: ${data}`));
        this.serverProcess.stderr.on('data', (data) => this.log(`Server Error: ${data}`));
        this.serverProcess.on('error', (err) => this.log(`Failed to start server: ${err.message}`));
        this.serverProcess.on('exit', (code) => {
            this.log(`Server exited with code ${code}`);
            this.serverProcess = null;
        });
    }

    // Wait for server health check
    waitForServer(retries = 60) {
        return new Promise((resolve) => {
            const check = (attempt) => {
                const url = `http://127.0.0.1:${this.PORT}/health`;
                http.get(url, (res) => {
                    if (res.statusCode === 200) {
                        this.log('Server is ready!');
                        resolve(true);
                    } else {
                        retry(attempt);
                    }
                }).on('error', () => retry(attempt));
            };

            const retry = (attempt) => {
                if (attempt <= 0) {
                    this.log('Server failed to start in time.');
                    resolve(false);
                } else {
                    setTimeout(() => check(attempt - 1), 1000);
                }
            };

            check(retries);
        });
    }

    // Create the main window
    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false,
            icon: path.join(__dirname, '../icon.png'),
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload.js')
            },
            title: 'NeuroSwarm',
            autoHideMenuBar: true,
            backgroundColor: '#1e3a8a'
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            require('electron').shell.openExternal(url);
            return { action: 'deny' };
        });

        return this.mainWindow;
    }

    // Main launch orchestration
    async launch() {
        this.showSplash();
        this.startServer();
        this.createMainWindow();

        const isReady = await this.waitForServer();

        if (isReady) {
            this.mainWindow.loadURL(`http://127.0.0.1:${this.PORT}`);
        } else {
            const errorHtml = `
                <html>
                <body style="background: #1e3a8a; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                    <h2>Failed to connect to server</h2>
                    <p>Please check the logs.</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; cursor: pointer;">Retry</button>
                </body>
                </html>`;
            this.mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
        }

        this.mainWindow.once('ready-to-show', () => {
            if (this.splashWindow && !this.splashWindow.isDestroyed()) {
                this.splashWindow.close();
            }
            this.mainWindow.show();
        });
    }

    stop() {
        if (this.serverProcess) {
            this.log('Stopping server...');
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }
}

module.exports = LaunchService;
