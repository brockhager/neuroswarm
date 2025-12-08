@echo off
echo Starting Postgres container ^(router-api test DB^) in this window...

REM Check that docker cli exists
where docker >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Docker CLI not found in PATH.
  echo Please install Docker Desktop (https://www.docker.com/products/docker-desktop) or ensure 'docker' is on PATH.
  echo Press any key to close this window.
  pause
  exit /b 1
)

REM Verify the Docker engine / daemon is running and responsive
docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Docker CLI found but Docker Engine appears unreachable.
  echo On Windows, open Docker Desktop and make sure it is running and set to Linux containers.
  echo If using WSL2 backend, ensure WSL is enabled and Docker Desktop has integration enabled for your distro.
  echo To check WSL status run: wsl -l -v
  echo After starting Docker, re-run this script.
  echo Press any key to close this window.
  pause
  exit /b 2
)

echo Docker engine reachable — starting Postgres container using docker compose...
docker compose -f "c:\JS\ns\neuroswarm\router-api\docker-compose.test.yml" up -d --build db
if %errorlevel% neq 0 (
  echo docker compose up failed with errorlevel %errorlevel%
  echo Possible causes: Docker Desktop not running, WSL integration disabled, or network / registry pull issues.
  echo Try running: docker compose -f "c:\JS\ns\neuroswarm\router-api\docker-compose.test.yml" up --no-start db
  echo If the host cannot reach the Docker Engine ^(named pipe error^), ensure Docker Desktop is running and try again.
  echo Press any key to close this window.
  pause
  exit /b 3
)

echo Postgres up command completed; leaving window open for logs.
cmd /k
