@echo off
rem run-cancel-queued-actions.cmd
rem This wrapper runs the PowerShell cancel script in the same console window.
rem Usage: double-click or run from a CMD/PowerShell terminal.

set SCRIPT=%~dp0cancel-queued-actions.ps1

if not exist "%SCRIPT%" (
  echo PowerShell script not found: %SCRIPT%
  pause
  exit /b 1
)

rem run in same window; pass all args through
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*

rem keep window open
echo.
echo Script finished. Press Enter to close.
pause
