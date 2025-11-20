@echo off
echo Starting NeuroSwarm Network...
echo.

echo [1/7] Starting Ollama AI Engine...
start "Ollama" cmd /k "ollama run llama3"
timeout /t 3 /nobreak >nul

echo [2/7] Starting NS Node (port 3000)...
start "NS Node" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3000 && node server.js"
timeout /t 2 /nobreak >nul

echo [3/7] Starting Gateway Node (port 8080)...
start "Gateway Node" cmd /k "cd /d c:\JS\ns\neuroswarm\gateway-node && set PORT=8080 && set NS_NODE_URL=http://localhost:3000 && node server.js"
timeout /t 2 /nobreak >nul

echo [4/7] Starting VP Node (port 4000)...
start "VP Node" cmd /k "cd /d c:\JS\ns\neuroswarm\vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3000 && node server.js"
timeout /t 2 /nobreak >nul

echo [5/7] Starting neuro-services (port 3001)...
start "neuro-services" cmd /k "cd /d c:\JS\ns\neuro-services && set PORT=3001 && npm run dev"
timeout /t 2 /nobreak >nul

echo [6/7] Starting neuro-runner (port 3002)...
start "neuro-runner" cmd /k "cd /d c:\JS\ns\neuro-runner && set PORT=3002 && npm run dev"
timeout /t 2 /nobreak >nul

echo [7/7] Starting neuro-web (port 3000)...
start "neuro-web" cmd /k "cd /d c:\JS\ns\neuro-web && npm run dev"

echo.
echo ========================================
echo All services started!
echo ========================================
echo.
echo Ollama AI:      http://localhost:11434
echo NS Node:        http://localhost:3000
echo Gateway Node:   http://localhost:8080
echo VP Node:        http://localhost:4000
echo neuro-services: http://localhost:3001
echo neuro-runner:   http://localhost:3002
echo neuro-web:      http://localhost:3003 (auto-adjusted)
echo.
echo Open http://localhost:3003/chat to start chatting!
echo.
pause
