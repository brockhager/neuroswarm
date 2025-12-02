@echo off
echo Starting NeuroSwarm Network...
echo.

echo [1/9] Checking for IPFS daemon...
where ipfs >nul 2>&1
if %errorlevel% equ 0 (
    echo IPFS found! Starting IPFS daemon...
    start "IPFS Daemon" cmd /k "ipfs init 2>nul & ipfs daemon"
    timeout /t 3 /nobreak >nul
) else (
    echo WARNING: IPFS not found. Blockchain payload storage will be limited.
    echo Download IPFS from: https://ipfs.tech/#install
    timeout /t 2 /nobreak >nul
)

echo [2/9] Starting Router API (port 4001)...
start "Router API" cmd /k "cd /d c:\JS\ns\neuroswarm\router-api && npm start"
timeout /t 3 /nobreak >nul

echo [3/9] Starting NS Node (port 3009)...
start "NS Node" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [4/9] Starting Gateway Node (port 8080)...
start "Gateway Node" cmd /k "cd /d c:\JS\ns\neuroswarm\gateway-node && set PORT=8080 && set NS_NODE_URL=http://localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [5/9] Starting VP Node (port 4000)...
start "VP Node" cmd /k "cd /d c:\JS\ns\neuroswarm\vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [6/9] Starting neuro-services (port 3007)...
start "neuro-services" cmd /k "cd /d c:\JS\ns\neuro-services && set PORT=3007 && set NS_NODE_URL=http://localhost:3009 && set RUNNER_URL=http://localhost:3008 && npm run dev"
timeout /t 3 /nobreak >nul

echo [7/9] Starting neuro-runner (port 3008)...
start "neuro-runner" cmd /k "cd /d c:\JS\ns\neuro-runner && set PORT=3008 && set NS_NODE_URL=http://localhost:3009 && npm run dev"
timeout /t 3 /nobreak >nul

echo [8/9] Starting neuro-web (port 3005)...
start "neuro-web" cmd /k "cd /d c:\JS\ns\neuro-web && npm run dev -- -p 3005"
timeout /t 3 /nobreak >nul

echo [9/9] Starting Dashboard HTTP Server and opening Monitor Dashboard (Node-based)
where node >nul 2>&1
if %errorlevel% equ 0 (
    start "Dashboard Server" cmd /k "cd /d c:\JS\ns\neuroswarm && node scripts\\start-dashboard.js 8000"
) else (
    echo WARNING: node not found — skipping dashboard server (no python dependency either)
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000/monitor-dashboard.html"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3009/"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo IPFS Daemon:       http://localhost:5001
echo Router API:        http://localhost:4001
echo NS Node:           http://localhost:3009
echo Gateway Node:      http://localhost:8080
echo VP Node:           http://localhost:4000
echo neuro-services:    http://localhost:3007
echo neuro-runner:      http://localhost:3008
echo neuro-web:         http://localhost:3005
echo.
echo Monitor Dashboard: http://localhost:8000/monitor-dashboard.html
echo Brain Dashboard:   http://localhost:8000/brain-dashboard.html
echo Control Center:    http://localhost:3005/control-center
echo NS-E Chat (Simple): http://localhost:3009/
echo NS-B Chat (Browser): http://localhost:3005/chat
echo.
echo TIP: Login with "Login as Demo User" button in chat settings
echo NOTE: To start Ollama AI separately, run: ollama serve
echo.
pause
