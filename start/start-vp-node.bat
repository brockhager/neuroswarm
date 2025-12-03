@echo off
echo Starting VP Node (Validator/Producer) on port 4000...
echo.

cd /d "%~dp0..\vp-node"
if not exist "server.js" (
    echo ERROR: vp-node directory not found or server.js missing
    pause
    exit /b 1
)

echo VP Node will start on: http://localhost:4000
echo NS Node URL: http://localhost:3009
echo.
echo NOTE: Ensure NS Node is running first (run start-ns-node.bat)
echo.

set PORT=4000
set NS_NODE_URL=http://localhost:3009
node server.js
