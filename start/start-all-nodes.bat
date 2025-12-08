@echo on
REM Simple debugging log to help identify early-exit / environment issues
set "START_LOG=%~dp0..\tmp\start-all-nodes.log"
if not exist "%~dp0..\tmp" mkdir "%~dp0..\tmp" >nul 2>&1
echo --- start-all-nodes run at %date% %time% --- >> "%START_LOG%"
echo Starting NeuroSwarm Network...
echo.

echo [1/10] Checking for IPFS daemon...
echo [1/10] Checking for IPFS daemon... >> "%START_LOG%"
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

echo [2/10] Checking for Ollama AI Engine...
echo [2/10] Checking for Ollama AI Engine... >> "%START_LOG%"
where ollama >nul 2>&1
if %errorlevel% equ 0 (
    echo Ollama found! Checking if already running...
    netstat -ano | findstr ":11434" >nul 2>&1
    if %errorlevel% equ 0 (
        echo Ollama already running on port 11434 - skipping startup
    ) else (
        echo Starting Ollama server...
        start "Ollama Server" cmd /k "ollama serve"
        timeout /t 4 /nobreak >nul
    )
) else (
    echo WARNING: Ollama not found. AI features will not work.
    echo Download Ollama from: https://ollama.com/download
    timeout /t 2 /nobreak >nul
)

echo [3/10] Starting NS-LLM Server (port 3006)...
echo [3/10] Starting NS-LLM Server (port 3006)... >> "%START_LOG%"
start "NS-LLM" cmd /k "cd /d c:\JS\ns\neuroswarm\NS-LLM && npm start"
timeout /t 3 /nobreak >nul

echo [3.25/10] Starting Postgres (router-api test DB) via docker-compose (host:5433)...
echo [3.25/10] Starting Postgres (router-api test DB) via docker-compose (host:5433)... >> "%START_LOG%"
set "SKIP_POSTGRES=0"
set "DOCKER_STATUS=ok"
echo [3.25.1] Checking for Docker CLI... >> "%START_LOG%"
where docker >nul 2>&1
echo [3.25.2] where docker returned errorlevel=%errorlevel% >> "%START_LOG%"
if errorlevel 1 (
    set "DOCKER_STATUS=missing"
) else (
    REM Docker CLI present — check engine reachability
    echo [3.25.3] Running docker info... >> "%START_LOG%"
    docker info >nul 2>&1
    echo [3.25.4] docker info returned errorlevel=%errorlevel% >> "%START_LOG%"
    if errorlevel 1 (
        set "DOCKER_STATUS=unreachable"
    ) else (
        set "DOCKER_STATUS=ok"
    )
)

if "%DOCKER_STATUS%"=="ok" (
    echo Docker CLI and engine reachable — starting Postgres container for router-api...
    echo [3.25.5] launching start-postgres-window.bat in new window... >> "%START_LOG%"
    echo Docker CLI and engine reachable — starting Postgres container for router-api... >> "%START_LOG%"
    REM Start Postgres in a separate helper script to avoid parsing issues inside this file
    start "Postgres Container" cmd /k "%~dp0..\scripts\start-postgres-window.bat"
    echo [3.25.6] start command issued for Postgres Container (returned errorlevel=%errorlevel%) >> "%START_LOG%"
    REM Start a separate health-check window so the main script can continue launching other services
    echo [3.25.7] launching background Postgres health checker window... >> "%START_LOG%"
    start "Postgres Health" cmd /k "%~dp0..\scripts\wait-for-postgres.bat"
    REM Give the compose up a brief moment to begin pulling/creating the container before continuing
    timeout /t 3 /nobreak >nul
    REM We continue immediately — Router API, NS, Gateway, etc. will start even if Postgres isn't yet ready.
    goto after_postgres
) else if "%DOCKER_STATUS%"=="missing" (
    echo WARNING: Docker CLI not found - skipping Postgres startup.
    echo WARNING: Docker CLI not found - skipping Postgres startup. >> "%START_LOG%"
    echo If you want to run the router-api test DB you can: install Docker Desktop and ensure 'docker' is in your PATH.
    echo Alternatively, run a Postgres instance listening on port 5432 or 5433 before starting this script.
    set "SKIP_POSTGRES=1"
    goto after_postgres
) else if "%DOCKER_STATUS%"=="unreachable" (
    echo WARNING: Docker CLI found but Engine is not responding - skipping Postgres startup.
    echo WARNING: Docker CLI found but Engine is not responding - skipping Postgres startup. >> "%START_LOG%"
    echo Common fixes:
    echo  - Start Docker Desktop (on Windows) and make sure the engine is running
    echo  - If using WSL2 backend make sure WSL integration is enabled for your distro
    echo  - Switch Docker Desktop to Linux containers if on Windows
    set "SKIP_POSTGRES=1"
    goto after_postgres
)

:postgres_up
goto after_postgres


:after_postgres

echo [4/10] Starting Router API (port 4001)...
echo [4/10] Starting Router API (port 4001)... >> "%START_LOG%"
if "%SKIP_POSTGRES%"=="1" (
    echo Skipping Router API because Postgres was not started by this script. Ensure a working Postgres on port 5433 and start Router API manually:
    echo   cd /d c:\JS\ns\neuroswarm\router-api && set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test && npm start
) else (
    start "Router API" cmd /k "cd /d c:\JS\ns\neuroswarm\router-api && set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test && npm start"
)
timeout /t 3 /nobreak >nul

echo [5/10] Starting NS Node (port 3009)...
echo [5/10] Starting NS Node (port 3009)... >> "%START_LOG%"
start "NS Node" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [6/10] Starting Gateway Node (port 8080)...
echo [6/10] Starting Gateway Node (port 8080)... >> "%START_LOG%"
start "Gateway Node" cmd /k "cd /d c:\JS\ns\neuroswarm\gateway-node && set PORT=8080 && set NS_NODE_URL=http://localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [7/10] Starting VP Node (port 4000)...
echo [7/10] Starting VP Node (port 4000)... >> "%START_LOG%"
start "VP Node" cmd /k "cd /d c:\JS\ns\neuroswarm\vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [8/10] Starting neuro-services (port 3007)...
echo [8/10] Starting neuro-services (port 3007)... >> "%START_LOG%"
start "neuro-services" cmd /k "cd /d c:\JS\ns\neuro-services && set PORT=3007 && set NS_NODE_URL=http://localhost:3009 && set RUNNER_URL=http://localhost:3008 && npm run dev"
timeout /t 3 /nobreak >nul

echo [9/10] Starting neuro-runner (port 3008)...
echo [9/10] Starting neuro-runner (port 3008)... >> "%START_LOG%"
start "neuro-runner" cmd /k "cd /d c:\JS\ns\neuro-runner && set PORT=3008 && set NS_NODE_URL=http://localhost:3009 && npm run dev"
timeout /t 3 /nobreak >nul

echo [9.5/10] Starting alert-sink (port 3010)...
echo [9.5/10] Starting alert-sink (port 3010)... >> "%START_LOG%"
start "alert-sink" cmd /k "cd /d c:\JS\ns\neuroswarm\alert-sink && set PORT=3010 && npm start"
timeout /t 2 /nobreak >nul

echo [10/10] Starting neuro-web (port 3005)...
echo [10/10] Starting neuro-web (port 3005)... >> "%START_LOG%"
start "neuro-web" cmd /k "cd /d c:\JS\ns\neuro-web && npm run dev -- -p 3005"
timeout /t 3 /nobreak >nul

echo [11/10] Starting Dashboard HTTP Server and opening Monitor Dashboard (Node-based)
echo [11/10] Starting Dashboard HTTP Server and opening Monitor Dashboard (Node-based) >> "%START_LOG%"
where node >nul 2>&1
if %errorlevel% equ 0 (
    start "Dashboard Server" cmd /k "cd /d c:\JS\ns\neuroswarm && node scripts\\start-dashboard.js 8000"
) else (
    echo WARNING: node not found — skipping dashboard server (no python dependency either)
)
timeout /t 2 /nobreak >nul
start "NS Chat (3009)" "http://localhost:3009/"
echo Opened NS chat URL (http://localhost:3009) >> "%START_LOG%"
timeout /t 1 /nobreak >nul
start "Control Center (3005)" "http://localhost:3005/control-center"
echo Opened Control Center URL (http://localhost:3005/control-center) >> "%START_LOG%"
start "Alert Sink (3010)" "http://localhost:3010/"
echo Opened Alert Sink URL (http://localhost:3010) >> "%START_LOG%"

echo.
echo ========================================
echo All services started!
echo All services started! >> "%START_LOG%"
echo ========================================
echo.
echo IPFS Daemon:       http://localhost:5001
echo Ollama AI:         http://localhost:11434
echo NS-LLM Server:     http://localhost:3006
echo Router API:        http://localhost:4001
echo NS Node:           http://localhost:3009
echo Gateway Node:      http://localhost:8080
echo VP Node:           http://localhost:4000
echo neuro-services:    http://localhost:3007
echo neuro-runner:      http://localhost:3008
echo neuro-web:         http://localhost:3005
echo alert-sink:        http://localhost:3010
echo.
echo Monitor Dashboard: http://localhost:8000/monitor-dashboard.html
echo Brain Dashboard:   http://localhost:8000/brain-dashboard.html
echo Control Center:    http://localhost:3005/control-center
echo NS-E Chat (Simple): http://localhost:3009/
echo NS-B Chat (Browser): http://localhost:3005/chat
echo.
echo TIP: Login with "Login as Demo User" button in chat settings
echo.
pause
echo --- end run at %date% %time% --- >> "%START_LOG%"
