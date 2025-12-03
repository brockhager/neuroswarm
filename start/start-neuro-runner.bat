@echo off
echo Starting neuro-runner (port 3008)...
echo.

cd /d "%~dp0..\..\neuro-runner"
if not exist "package.json" (
    echo ERROR: neuro-runner directory not found or package.json missing
    pause
    exit /b 1
)

echo neuro-runner will start on: http://localhost:3008
echo NS Node URL: http://localhost:3009
echo.
echo NOTE: Ensure NS Node is running first (run start-ns-node.bat)
echo.

set PORT=3008
set NS_NODE_URL=http://localhost:3009
npm run dev
