@echo off
rem run-cancel-queued-actions.cmd
rem This wrapper runs the PowerShell cancel script and keeps a single console open.
rem Usage: double-click this file in Explorer or run from a CMD/PowerShell terminal.

set SCRIPT=%~dp0cancel-queued-actions.ps1

if not exist "%SCRIPT%" (
  echo PowerShell script not found: %SCRIPT%
  pause
  exit /b 1
)

rem Use -NoExit + -Command to run the script then keep the shell open so only one window appears
powershell -NoProfile -ExecutionPolicy Bypass -NoExit -Command "& '%SCRIPT%' %*"

rem The PowerShell process will remain open after the script finishes due to -NoExit.
rem If you prefer the script to pause and then close, run cancel-queued-actions.ps1 directly from a terminal.

echo.
echo Script finished. Press Enter to close.
pause
