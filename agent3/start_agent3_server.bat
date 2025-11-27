@echo off

REM --- 1. Change to the directory where this script is located ---
cd /d %~dp0

REM --- 2. Activate the Python Virtual Environment (venv) ---
REM Note: We use 'call' to ensure control returns to this script after activation
call .\venv\Scripts\activate

REM --- 3. Change to the server directory ---
cd server

REM --- 4. Run the Agent3 API Gateway ---
echo.
echo =======================================================
echo STARTING AGENT3 API GATEWAY (Press CTRL+C to quit)
echo =======================================================
python agent3_gateway.py