@echo off
echo Starting Admin Node (port 3000)...
echo.

cd /d "%~dp0..\admin-node"
if not exist "package.json" (
    echo ERROR: admin-node directory not found or package.json missing
    pause
    exit /b 1
)

echo Admin Node will start on: http://localhost:3000
echo.
echo NOTE: This is the governance and admin interface
echo.

set PORT=3000
npm start
