@echo off
echo Starting NS-LLM Server (port 3015)...
echo.

cd /d "%~dp0..\NS-LLM"
if not exist "package.json" (
    echo ERROR: NS-LLM directory not found or package.json missing
    pause
    exit /b 1
)

echo NS-LLM will start on: http://localhost:3015
echo.

set PORT=3015
npm start
