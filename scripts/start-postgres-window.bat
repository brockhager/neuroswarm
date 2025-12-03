@echo off
echo Starting Postgres container (router-api test DB) in this window...
docker compose -f "c:\JS\ns\neuroswarm\router-api\docker-compose.test.yml" up -d --build db
if %errorlevel% neq 0 (
  echo docker compose up failed with errorlevel %errorlevel%
  echo Check docker and the compose file; press any key to close this window.
  pause
)
echo Postgres up command completed; leaving window open for logs.
cmd /k
