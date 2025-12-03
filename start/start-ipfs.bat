@echo off
echo Starting IPFS Daemon...
echo.

where ipfs >nul 2>&1
if %errorlevel% equ 0 (
    echo IPFS found! Starting daemon...
    ipfs init 2>nul
    ipfs daemon
) else (
    echo ERROR: IPFS not found in PATH
    echo.
    echo Download IPFS from: https://ipfs.tech/#install
    echo After installing, add IPFS to your PATH and try again.
    pause
    exit /b 1
)
