@echo off
title gateway-node
echo ========================================
echo Starting gateway-node
echo ========================================
echo.
echo Port: 8080
echo.
set PORT=8080
node server.js
echo.
echo gateway-node has stopped.
pause
