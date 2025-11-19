const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { runComponentSetup, COMPONENTS_DIR } = require('./download-manager');

let mainWindow;
let services = {
    web: null,
    services: null,
    runner: null,
    ollama: null
};

// Check if Ollama is installed
async function checkOllama() {
    try {
        await execPromise('ollama --version');
        return true;
    } catch (error) {
        return false;
    }
}

// Check if Ollama has models
async function checkOllamaModels() {
    try {
        const { stdout } = await execPromise('ollama list');
        return stdout.includes('llama');
    } catch (error) {
        return false;
    }
}

// Start Ollama server
function startOllama() {
    console.log('[LAUNCHER] Starting Ollama server...');
    services.ollama = spawn('ollama', ['serve'], {
        shell: true,
        detached: false
    });

    services.ollama.stdout.on('data', (data) => {
        console.log(`[OLLAMA] ${data}`);
    });

    services.ollama.stderr.on('data', (data) => {
        console.log(`[OLLAMA] ${data}`);
    });
}

// Start all NeuroSwarm services
function startServices() {
    const rootDir = path.join(__dirname, '..');

    // Start neuro-services (port 3001)
    console.log('[LAUNCHER] Starting neuro-services...');
    services.services = spawn('npm', ['run', 'dev'], {
        cwd: path.join(rootDir, 'neuro-services'),
        shell: true,
        env: { ...process.env, PORT: '3001' }
    });

    services.services.stdout.on('data', (data) => {
        console.log(`[SERVICES] ${data}`);
    });

    // Start neuro-runner (port 3002)
    console.log('[LAUNCHER] Starting neuro-runner...');
    services.runner = spawn('npm', ['run', 'dev'], {
        cwd: path.join(rootDir, 'neuro-runner'),
        shell: true,
        env: { ...process.env, PORT: '3002' }
    });

    services.runner.stdout.on('data', (data) => {
        console.log(`[RUNNER] ${data}`);
    });

    // Start neuro-web (port 3000)
    console.log('[LAUNCHER] Starting neuro-web...');
    services.web = spawn('npm', ['run', 'dev'], {
        cwd: path.join(rootDir, 'neuro-web'),
        shell: true
    });

    services.web.stdout.on('data', (data) => {
        console.log(`[WEB] ${data}`);
    });
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.png')
    });

    // Wait for services to start, then load the app
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000/chat');
    }, 8000);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Setup wizard
async function runSetupWizard() {
    const hasOllama = await checkOllama();

    if (!hasOllama) {
        const result = await dialog.showMessageBox({
            type: 'info',
            title: 'NeuroSwarm Setup',
            message: 'AI Engine Not Found',
            detail: 'NeuroSwarm requires Ollama to run the local AI brain. Would you like to download it now?',
            buttons: ['Download Ollama', 'Exit'],
            defaultId: 0,
            cancelId: 1
        });

        if (result.response === 0) {
            // Open Ollama download page
            require('electron').shell.openExternal('https://ollama.com/download');
            app.quit();
            return false;
        } else {
            app.quit();
            return false;
        }
    }

    const hasModels = await checkOllamaModels();

    if (!hasModels) {
        const result = await dialog.showMessageBox({
            type: 'info',
            title: 'NeuroSwarm Setup',
            message: 'Download AI Brain',
            detail: 'No AI models found. Would you like to download Llama 3 (recommended, ~4GB)?',
            buttons: ['Download Llama 3', 'Skip'],
            defaultId: 0,
            cancelId: 1
        });

        if (result.response === 0) {
            // Show progress dialog
            const progressDialog = new BrowserWindow({
                width: 400,
                height: 200,
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });

            progressDialog.loadURL(`data:text/html,
        <html>
          <body style="background: #1a1a1a; color: white; font-family: Arial; padding: 20px; text-align: center;">
            <h2>Downloading Llama 3...</h2>
            <p>This may take a few minutes.</p>
          </body>
        </html>
      `);

            // Download model
            const downloadProcess = spawn('ollama', ['pull', 'llama3'], { shell: true });

            downloadProcess.on('close', () => {
                progressDialog.close();
            });
        }
    }

    return true;
}

// App lifecycle
app.whenReady().then(async () => {
    // Step 1: Component Setup (download nodes if needed)
    const componentSetupComplete = await runComponentSetup();

    if (!componentSetupComplete) {
        app.quit();
        return;
    }

    // Step 2: Ollama Setup
    const setupComplete = await runSetupWizard();

    if (!setupComplete) {
        return;
    }

    // Start Ollama server
    startOllama();

    // Wait a bit for Ollama to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start all services
    startServices();

    // Create window
    createWindow();
});

app.on('window-all-closed', () => {
    // Kill all child processes
    Object.values(services).forEach(service => {
        if (service) {
            service.kill();
        }
    });

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
