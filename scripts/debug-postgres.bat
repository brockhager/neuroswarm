@echo on
echo Debugging postgres start
where docker >nul 2>&1
if %errorlevel% equ 0 (
  echo docker present
  docker compose -f "%~dp0..\router-api\docker-compose.test.yml" up -d --build db
  if %errorlevel% neq 0 (
    echo docker compose up failed with errorlevel %errorlevel%
    pause
  )
  for /L %%i in (1,1,60) do (
    docker compose -f "%~dp0..\router-api\docker-compose.test.yml" exec -T db pg_isready -U neuroswarm_user -d neuroswarm_router_db_test
    if %errorlevel% equ 0 goto postgres_ok
    timeout /t 1
  )
  echo Postgres did not become healthy
  pause
  :postgres_ok
  echo Postgres healthy
) else (
  echo Docker not found
  pause
)
