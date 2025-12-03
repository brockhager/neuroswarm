@echo off
echo Starting NS-LLM Server (port 3006)...
echo.

cd /d "%~dp0..\NS-LLM"
if not exist "package.json" (
    echo ERROR: NS-LLM directory not found or package.json missing
    pause
    exit /b 1
)

echo NS-LLM will start on: http://localhost:3006
echo.
npm start
