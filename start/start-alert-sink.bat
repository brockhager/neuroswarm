@echo off
echo Starting alert-sink (port 3010)...
echo.

cd /d "%~dp0..\alert-sink"
if not exist "package.json" (
    echo ERROR: alert-sink directory not found or package.json missing
    pause
    exit /b 1
)

echo alert-sink will start on: http://localhost:3010
echo.

set PORT=3010
npm start
