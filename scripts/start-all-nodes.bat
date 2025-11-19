@echo off
REM Start all nodes in their own persistent CMD windows with heartbeat enabled.
REM Usage: run from repository root (where this script lives) or double-click it.

SETLOCAL

REM Ports (override by setting env vars before running, or edit these defaults)
set NS_PORT=3000
set GW_PORT=8080
set VP_PORT=4000

REM Start Gateway
start "Gateway" cmd /k "cd /d %~dp0\..\gateway-node && node ..\scripts\verifyEntry.mjs server.js gw || exit /b 2 && set PORT=%GW_PORT% && node server.js --status"

REM Start NS (neighborhood service)
start "NS" cmd /k "cd /d %~dp0\..\ns-node && node ..\scripts\verifyEntry.mjs server.js ns || exit /b 2 && set PORT=%NS_PORT% && node server.js --status"

REM Start VP (validator/producer) and point it to the NS we just started
start "VP" cmd /k "cd /d %~dp0\..\vp-node && node ..\scripts\verifyEntry.mjs server.js vp || exit /b 2 && set PORT=%VP_PORT% && set NS_NODE_URL=http://127.0.0.1:%NS_PORT% && node server.js --status"

ENDLOCAL

