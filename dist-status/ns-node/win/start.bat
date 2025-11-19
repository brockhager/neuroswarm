@echo off
setlocal
set PORT=3000
set NS_NODE_URL=http://localhost:3000
set NS_CHECK_EXIT_ON_FAIL=false
set STATUS=1

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js not found in PATH. Please install Node.js.
  pause
  exit /b 1
)

echo Starting ns-node in a persistent cmd window
start "NS Node" cmd /k "node "%~dp0\server.js" %* || (echo [NS] Node exited with code %ERRORLEVEL% & pause)"
exit /b 0
