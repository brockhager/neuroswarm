@echo on
echo Starting NeuroSwarm Network...
echo.

echo [1/10] Checking for IPFS daemon...
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
start "NS-LLM" cmd /k "cd /d c:\JS\ns\neuroswarm\NS-LLM && npm start"
timeout /t 3 /nobreak >nul
echo [3.25/10] Starting Postgres (router-api test DB) via docker-compose (host:5433)...
where docker >nul 2>&1
REM If docker is not found, branch to docker_missing. Using gotos avoids deep nested parentheses which can confuse cmd parsing.
if errorlevel 1 goto docker_missing

echo Starting Postgres container for router-api...
REM Start Postgres in a separate helper script to avoid parsing issues inside this file
start "Postgres Container" cmd /k "%~dp0..\scripts\start-postgres-window.bat"
REM Wait for Postgres to start before checking health
timeout /t 5 /nobreak >nul
REM Wait for Postgres health (pg_isready inside container); use clearer control flow to avoid nested parentheses errors
for /L %%i in (1,1,60) do (
    docker compose -f "%~dp0..\router-api\docker-compose.test.yml" exec -T db pg_isready -U neuroswarm_user -d neuroswarm_router_db_test >nul 2>&1
    if not errorlevel 1 (
        echo Postgres is healthy
        goto :postgres_up
    )
    timeout /t 1 >nul
)
echo WARNING: Postgres did not report healthy in time and may be unavailable.
:postgres_up
goto after_postgres

:docker_missing
    echo WARNING: Docker not found - skipping Postgres startup. Ensure a Postgres instance is listening on port 5432 or 5433.

:after_postgres

echo [4/10] Starting Router API (port 4001)...
start "Router API" cmd /k "cd /d c:\JS\ns\neuroswarm\router-api && set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test && npm start"
timeout /t 3 /nobreak >nul

echo [5/10] Starting NS Node (port 3009)...
start "NS Node" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [6/10] Starting Gateway Node (port 8080)...
start "Gateway Node" cmd /k "cd /d c:\JS\ns\neuroswarm\gateway-node && set PORT=8080 && set NS_NODE_URL=http://localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [7/10] Starting VP Node (port 4000)...
start "VP Node" cmd /k "cd /d c:\JS\ns\neuroswarm\vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo [8/10] Starting neuro-services (port 3007)...
start "neuro-services" cmd /k "cd /d c:\JS\ns\neuro-services && set PORT=3007 && set NS_NODE_URL=http://localhost:3009 && set RUNNER_URL=http://localhost:3008 && npm run dev"
timeout /t 3 /nobreak >nul

echo [9/10] Starting neuro-runner (port 3008)...
start "neuro-runner" cmd /k "cd /d c:\JS\ns\neuro-runner && set PORT=3008 && set NS_NODE_URL=http://localhost:3009 && npm run dev"
timeout /t 3 /nobreak >nul

echo [9.5/10] Starting alert-sink (port 3010)...
start "alert-sink" cmd /k "cd /d c:\JS\ns\neuroswarm\alert-sink && set PORT=3010 && npm start"
timeout /t 2 /nobreak >nul

echo [10/10] Starting neuro-web (port 3005)...
start "neuro-web" cmd /k "cd /d c:\JS\ns\neuro-web && npm run dev -- -p 3005"
timeout /t 3 /nobreak >nul

echo [11/10] Starting Dashboard HTTP Server and opening Monitor Dashboard (Node-based)
where node >nul 2>&1
if %errorlevel% equ 0 (
    start "Dashboard Server" cmd /k "cd /d c:\JS\ns\neuroswarm && node scripts\\start-dashboard.js 8000"
) else (
    echo WARNING: node not found — skipping dashboard server (no python dependency either)
)
timeout /t 2 /nobreak >nul
start "" "http://localhost:3009/"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3005/control-center"
start "" "http://localhost:3010/"

echo.
echo ========================================
echo All services started!
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
