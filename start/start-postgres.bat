@echo off
echo Starting Postgres (router-api test DB) via Docker...
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not found in PATH
    echo.
    echo Install Docker Desktop from: https://www.docker.com/products/docker-desktop
    echo After installing, restart your terminal and try again.
    pause
    exit /b 1
)

cd /d "%~dp0..\router-api"
if not exist "docker-compose.test.yml" (
    echo ERROR: docker-compose.test.yml not found in router-api directory
    pause
    exit /b 1
)

echo Starting Postgres container (port 5433)...
docker compose -f docker-compose.test.yml up -d

echo.
echo Waiting for Postgres to be healthy...
timeout /t 3 /nobreak >nul

for /L %%i in (1,1,30) do (
    docker compose -f docker-compose.test.yml exec -T db pg_isready -U neuroswarm_user -d neuroswarm_router_db_test >nul 2>&1
    if not errorlevel 1 (
        echo Postgres is healthy and ready!
        echo.
        echo Connection: postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test
        pause
        exit /b 0
    )
    timeout /t 1 >nul
)

echo WARNING: Postgres did not report healthy within 30 seconds
echo Check logs with: docker compose -f ..\router-api\docker-compose.test.yml logs
pause
