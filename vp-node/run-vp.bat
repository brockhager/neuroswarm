@echo off
REM Run script for VP node (Windows)
REM Opens a new persistent CMD window and starts the VP with heartbeat enabled (--status)

echo Starting VP node... (this will open a new CMD window titled "VP")

REM Default values (can be overridden via environment or command line)
if not defined PORT set PORT=4000
if not defined NS_NODE_URL set NS_NODE_URL=http://127.0.0.1:3000

start "VP" cmd /k "cd /d %~dp0 && node ..\scripts\verifyEntry.mjs server.js vp || exit /b 2 && set PORT=%PORT% && set NS_NODE_URL=%NS_NODE_URL% && node server.js --status"

