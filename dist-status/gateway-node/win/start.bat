@echo off
setlocal
set PORT=8080
set NS_NODE_URL=http://localhost:3000
set NS_CHECK_EXIT_ON_FAIL=false
set STATUS=1

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js not found in PATH. Please install Node.js.
  pause
  exit /b 1
)

echo Starting gateway-node in a persistent cmd window
start "Gateway Node" cmd /k "node "%~dp0\server.js" %* || (echo [GW] Node exited with code %ERRORLEVEL% & pause)"
exit /b 0
:: spawn a background health-check to open browser when gateway starts (run in detached window)
start "" powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { if ((Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/health').StatusCode -eq 200) { Start-Process 'http://localhost:8080'; break } } catch {}; Start-Sleep -Seconds 1 }"
