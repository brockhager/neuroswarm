@echo off
echo ========================================
echo Starting 3 NS Nodes for P2P Testing
echo ========================================
echo.

REM Stop any existing ns-node processes
echo Stopping any existing NS nodes...
taskkill /F /FI "WINDOWTITLE eq NS Node*" 2>nul

echo.
echo Starting Node 1 (Port 3009)...
echo Bootstrap: localhost:3010
start "NS Node 1 (3009)" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3009 && set BOOTSTRAP_PEERS=localhost:3010 && node server.js"
timeout /t 2 /nobreak >nul

echo Starting Node 2 (Port 3010)...
echo Bootstrap: localhost:3009
start "NS Node 2 (3010)" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3010 && set BOOTSTRAP_PEERS=localhost:3009 && node server.js"
timeout /t 2 /nobreak >nul

echo Starting Node 3 (Port 3011)...
echo Bootstrap: localhost:3009,localhost:3010
start "NS Node 3 (3011)" cmd /k "cd /d c:\JS\ns\neuroswarm\ns-node && set PORT=3011 && set BOOTSTRAP_PEERS=localhost:3009,localhost:3010 && node server.js"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo All 3 nodes started!
echo ========================================
echo.
echo Node 1: http://localhost:3009/peers
echo Node 2: http://localhost:3010/peers
echo Node 3: http://localhost:3011/peers
echo.
echo Test peer discovery:
echo   curl http://localhost:3009/peers
echo   curl http://localhost:3010/peers
echo   curl http://localhost:3011/peers
echo.
pause
