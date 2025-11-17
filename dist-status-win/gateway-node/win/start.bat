@echo off
setlocal
set PORT=8080
set NS_NODE_URL=http://localhost:3000
set NS_CHECK_EXIT_ON_FAIL=false
set STATUS=1

:: Run node in foreground so logs stream into this cmd window
node "%~dp0\server.js" %*
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% NEQ 0 (
  echo [%DATE% %TIME%] gateway-node exited with code %EXITCODE%
  pause

)
exit /b %EXITCODE%

:: spawn a background health-check to open browser when gateway starts (run in detached window)
start "" powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { try { if ((Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/health').StatusCode -eq 200) { Start-Process 'http://localhost:8080'; break } } catch {}; Start-Sleep -Seconds 1 }"
