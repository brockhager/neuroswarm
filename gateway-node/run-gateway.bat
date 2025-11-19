@echo off
REM Run script for Gateway node (Windows)
REM Opens a new persistent CMD window and starts Gateway with heartbeat enabled (--status)

echo Starting Gateway node... (this will open a new CMD window titled "Gateway")

REM Default values (can be overridden via environment or command line)
if not defined PORT set PORT=8080
if not defined NS_NODE_URL set NS_NODE_URL=http://127.0.0.1:3000

start "Gateway" cmd /k "cd /d %~dp0 && node ..\scripts\verifyEntry.mjs server.js gw || exit /b 2 && set PORT=%PORT% && set NS_NODE_URL=%NS_NODE_URL% && node server.js --status"

