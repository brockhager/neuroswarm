@echo off
echo Starting Gateway Node (port 8080)...
echo.

cd /d "%~dp0..\gateway-node"
if not exist "server.js" (
    echo ERROR: gateway-node directory not found or server.js missing
    pause
    exit /b 1
)

echo Gateway Node will start on: http://localhost:8080
echo NS Node URL: http://localhost:3009
echo.
echo NOTE: Ensure NS Node is running first (run start-ns-node.bat)
echo.

set PORT=8080
set NS_NODE_URL=http://localhost:3009
set NS_CHECK_EXIT_ON_FAIL=false
node server.js
