@echo off
setlocal enabledelayedexpansion
REM Health-check helper for Postgres (runs in its own window)
set "START_LOG=%~dp0..\tmp\wait-for-postgres.log"
if not exist "%~dp0..\tmp" mkdir "%~dp0..\tmp" >nul 2>&1
echo [PG-WAIT] health checker started at %date% %time% >> "%START_LOG%"
echo Waiting for Postgres (router-api test DB) to become healthy... 

for /L %%i in (1,1,60) do (
    rem Use redirection but do not fail the loop if the log file is temporarily unavailable
    >nul 2>&1 (echo [PG-WAIT] check %%i at %time% >> "%START_LOG%") || echo [PG-WAIT] log append failed at %%i (file busy)
    docker compose -f "%~dp0..\router-api\docker-compose.test.yml" exec -T db pg_isready -U neuroswarm_user -d neuroswarm_router_db_test >nul 2>&1
    if not errorlevel 1 (
        >nul 2>&1 (echo [PG-WAIT] Postgres is healthy at %date% %time% (iteration %%i) >> "%START_LOG%") || echo [PG-WAIT] log append failed at healthy (file busy)
        echo Postgres is healthy (iteration %%i)
        goto :healthy
    )
    timeout /t 1 >nul
)

>nul 2>&1 (echo [PG-WAIT] Postgres did not report healthy after 60 checks >> "%START_LOG%") || echo [PG-WAIT] log append failed at timeout (file busy)
echo Postgres did not report healthy after 60 checks
goto :eof

:healthy
>nul 2>&1 (echo [PG-WAIT] Completed at %date% %time% >> "%START_LOG%") || echo [PG-WAIT] log append failed at complete (file busy)
echo Postgres is healthy - finishing health checker
