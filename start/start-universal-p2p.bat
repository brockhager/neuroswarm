@echo off
REM Start all 3 node types with peer discovery for cross-node-type testing
REM NS Node (3009), Gateway Node (8080), VP Node (4000)

echo Starting Universal Peer Discovery Test...
echo.
echo This will start:
echo - NS Node on port 3009 (bootstraps to Gateway)
echo - Gateway Node on port 8080 (bootstraps to NS and VP)
echo - VP Node on port 4000 (bootstraps to Gateway)
echo.
echo Press Ctrl+C in each window to stop the nodes
echo.

REM Start NS Node
start "NS Node (3009)" cmd /k "cd /d %~dp0ns-node && set PORT=3009 && set BOOTSTRAP_PEERS=localhost:8080:Gateway && node server.js"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start Gateway Node
start "Gateway Node (8080)" cmd /k "cd /d %~dp0gateway-node && set PORT=8080 && set BOOTSTRAP_PEERS=localhost:3009:NS,localhost:4000:VP && node server.js"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start VP Node
start "VP Node (4000)" cmd /k "cd /d %~dp0vp-node && set PORT=4000 && set NS_NODE_URL=http://localhost:3009 && set GATEWAY_URL=http://localhost:8080 && set BOOTSTRAP_PEERS=localhost:8080:Gateway && node server.js"

echo.
echo All nodes started!
echo.
echo Test peer discovery with:
echo   curl http://localhost:3009/peers
echo   curl http://localhost:8080/peers
echo   curl http://localhost:4000/peers
echo.
echo Test type filtering:
echo   curl http://localhost:3009/peers?type=Gateway
echo   curl http://localhost:8080/peers?type=VP
echo   curl http://localhost:4000/peers?type=NS
echo.
