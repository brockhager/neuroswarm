@echo off
REM Run script for NS node (Windows)
REM Opens a new persistent CMD window and starts NS with heartbeat enabled (--status)

echo Starting NS node... (this will open a new CMD window titled "NS")

REM Default values (can be overridden via environment or command line)
if not defined PORT set PORT=3000

start "NS" cmd /k "cd /d %~dp0 && node ..\scripts\verifyEntry.mjs server.js ns || exit /b 2 && set PORT=%PORT% && node server.js --status"

