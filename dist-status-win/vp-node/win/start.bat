@echo off
setlocal
set PORT=4000
set NS_NODE_URL=http://localhost:3000
set NS_CHECK_EXIT_ON_FAIL=false
set STATUS=1

:: Run node in foreground so logs stream into this cmd window
node "%~dp0\server.js" %*
set EXITCODE=%ERRORLEVEL%
if %EXITCODE% NEQ 0 (
  echo [%DATE% %TIME%] vp-node exited with code %EXITCODE%
  pause

)
exit /b %EXITCODE%
