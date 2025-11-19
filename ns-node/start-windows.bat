@echo off
REM Start NS Node in persistent CMD window
setlocal
if not exist "%~dp0\server.js" (
  echo ERROR: server.js not found in "%~dp0"
  exit /b 1
)
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js not found in PATH. Please install Node.js (https://nodejs.org) and retry.
  exit /b 1
)
echo Starting NS Node in a new cmd window (persistent)
start "NS Node" cmd /k "node "%~dp0server.js" %* || (echo [NS] Node exited with code %ERRORLEVEL% & pause)"
exit /b 0
