@echo off
echo Starting Router API (port 4001)...
echo.

cd /d "%~dp0..\router-api"
if not exist "package.json" (
    echo ERROR: router-api directory not found or package.json missing
    pause
    exit /b 1
)

echo Checking Postgres connection...
set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test

echo.
echo Router API will start on: http://localhost:4001
echo Database: %DATABASE_URL%
echo.
echo NOTE: Ensure Postgres is running (run start-postgres.bat first)
echo.

npm start
