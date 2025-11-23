@echo off
title ns-node
echo ========================================
echo Starting ns-node
echo ========================================
echo.
echo Port: 3000
echo.
set PORT=3000
node server.js
echo.
echo ns-node has stopped.
pause
