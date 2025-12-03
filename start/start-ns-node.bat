@echo off
echo Starting NS Node (Brain/Consensus) on port 3009...
echo.

cd /d "%~dp0..\ns-node"
if not exist "server.js" (
    echo ERROR: ns-node directory not found or server.js missing
    pause
    exit /b 1
)

echo NS Node will start on: http://localhost:3009
echo Chat interface: http://localhost:3009/
echo.
echo NOTE: This is the core brain node. Other nodes depend on it.
echo.

set PORT=3009
node server.js
