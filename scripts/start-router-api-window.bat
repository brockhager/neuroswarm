@echo off
echo Starting Router API in this window...
cd /d c:\JS\ns\neuroswarm\router-api
REM Use quoted SET to avoid accidental trailing spaces in the environment variable
set "DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test"
set "PORT=4001"
echo DATABASE_URL=%DATABASE_URL%
echo PORT=%PORT%
REM Run in dev mode (ts-node) per package.json start script
npm start
echo Router API exited with errorlevel %errorlevel%
pause
