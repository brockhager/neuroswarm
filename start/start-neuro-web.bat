@echo off
echo Starting neuro-web (port 3005)...
echo.

cd /d "%~dp0..\..\neuro-web"
if not exist "package.json" (
    echo ERROR: neuro-web directory not found or package.json missing
    pause
    exit /b 1
)

echo neuro-web will start on: http://localhost:3005
echo Chat interface: http://localhost:3005/chat
echo Control Center: http://localhost:3005/control-center
echo.

npm run dev -- -p 3005
