@echo off
echo Starting neuro-services (port 3007)...
echo.

cd /d "%~dp0..\..\neuro-services"
if not exist "package.json" (
    echo ERROR: neuro-services directory not found or package.json missing
    pause
    exit /b 1
)

echo neuro-services will start on: http://localhost:3007
echo NS Node URL: http://localhost:3009
echo Runner URL: http://localhost:3008
echo.
echo NOTE: Ensure NS Node is running first (run start-ns-node.bat)
echo.

set PORT=3007
set NS_NODE_URL=http://localhost:3009
set RUNNER_URL=http://localhost:3008
npm run dev
