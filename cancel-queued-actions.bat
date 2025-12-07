@echo off
rem cancel-queued-actions.bat
rem
rem Use: run from the repo root: cancel-queued-actions.bat [--dry-run] [--auto]
rem
rem This script will attempt to cancel queued GitHub Actions runs for the repository.
rem It prefers using the GitHub CLI (gh). If gh is not present, it will fall back to
rem using curl + an environment variable GITHUB_TOKEN which must be set in the
rem current environment. Do NOT place tokens on the command line or in this file.

setlocal enabledelayedexpansion

set OWNER=brockhager
set REPO=neuroswarm
set DRY_RUN=0
set AUTO=0

:parse_args
if "%~1"=="" goto after_args
if /I "%~1"=="--dry-run" ( set DRY_RUN=1 & shift & goto parse_args )
if /I "%~1"=="/dry-run" ( set DRY_RUN=1 & shift & goto parse_args )
if /I "%~1"=="--auto" ( set AUTO=1 & shift & goto parse_args )
if /I "%~1"=="/auto" ( set AUTO=1 & shift & goto parse_args )
rem unknown arg, just shift
shift
goto parse_args

:after_args
echo Repository: %OWNER%/%REPO%

rem Check for gh cli
where gh >nul 2>&1
if not errorlevel 1 (
  echo Found 'gh' CLI. Using gh to list and cancel runs.
  if "%DRY_RUN%"=="1" (
    echo Running dry-run (listing queued runs)...
    gh run list --repo %OWNER%/%REPO% --limit 500 --json databaseId,status,name,htmlUrl,createdAt -q ".[] | select(.status \"==\" \"queued\") | {id:.databaseId, name:.name, url:.htmlUrl, createdAt:.createdAt}"
    if errorlevel 1 (
      echo gh run list failed. Ensure gh is logged in (gh auth login) and has repo permissions.
      exit /b 2
    )
    echo Dry-run complete.
    exit /b 0
  )

  echo Listing queued runs (limit 500)...
  for /f "delims=" %%R in ('gh run list --repo %OWNER%/%REPO% --limit 500 --json databaseId,status,name,htmlUrl,createdAt -q ".[] | select(.status==\"queued\") | .databaseId"') do (
    echo Queued run ID: %%R
    if "%AUTO%"=="1" (
      echo Cancelling %%R...
      gh run cancel %%R --repo %OWNER%/%REPO% || echo failed to cancel %%R
    )
  )

  if "%AUTO%"=="0" (
    echo To actually cancel runs, run again with --auto or interactively confirm below.
    set /p confirm=Do you want to cancel all reported queued runs? Type 'yes' to continue: 
    if /I NOT "%confirm%"=="yes" (
      echo Aborting: no changes made.
      exit /b 0
    )
    for /f "delims=" %%R in ('gh run list --repo %OWNER%/%REPO% --limit 500 --json databaseId,status,name,htmlUrl,createdAt -q ".[] | select(.status==\"queued\") | .databaseId"') do (
      echo Cancelling %%R...
      gh run cancel %%R --repo %OWNER%/%REPO% || echo failed to cancel %%R
    )
  )

  echo Done.
  exit /b 0
)

rem No gh; fallback to curl + GITHUB_TOKEN env var
if "%GITHUB_TOKEN%"=="" (
  echo 'gh' not found and GITHUB_TOKEN env var not set.
  echo Please either install GitHub CLI and run 'gh auth login' or set environment variable GITHUB_TOKEN.
  exit /b 3
)

echo Using GITHUB_TOKEN from environment. Listing queued runs via REST API...

set APIURL=https://api.github.com/repos/%OWNER%/%REPO%/actions/runs?status=queued&per_page=100

rem fetch list
curl -s -H "Authorization: Bearer %GITHUB_TOKEN%" -H "Accept: application/vnd.github.v3+json" "%APIURL%" > .\temp_action_runs.json
if %errorlevel% neq 0 (
  echo curl failed. Check your network and GITHUB_TOKEN permissions.
  del .\temp_action_runs.json >nul 2>&1
  exit /b 4
)

rem extract run ids (simple parsing using findstr/for, not robust JSON; intended for Windows default tools)
setlocal disableDelayedExpansion
set COUNT=0
for /f "usebackq tokens=1,2 delims=,:{}[]\"" %%A in (`type .\temp_action_runs.json ^| findstr /r /c:"\"id\"\|\"status\"\|\"html_url\"\|\"created_at\"\|\"name\""`) do (
  rem findstr will include fields; we only want id values; this is a heuristic
  if "%%A"=="id" (
    set /a COUNT+=1
    set "RUN_!COUNT!=%%B"
  )
)

if %COUNT%==0 (
  echo No queued runs found (or failed to parse API response).
  del .\temp_action_runs.json >nul 2>&1
  exit /b 0
)

echo Found %COUNT% queued run(s):
for /l %%I in (1,1,%COUNT%) do (
  call echo - Run id: %%RUN_%%I%%
)

if "%DRY_RUN%"=="1" (
  echo Dry-run: not cancelling.
  del .\temp_action_runs.json >nul 2>&1
  endlocal
  exit /b 0
)

if "%AUTO%"=="0" (
  set /p confirm=Do you want to cancel all %COUNT% queued runs? Type 'yes' to continue: 
  if /I NOT "%confirm%"=="yes" (
    echo Aborting; no change made.
    del .\temp_action_runs.json >nul 2>&1
    endlocal
    exit /b 0
  )
)

rem cancel each run
for /l %%I in (1,1,%COUNT%) do (
  call set id=%%RUN_%%I%%
  echo Cancelling run id !id! ...
  curl -s -X POST -H "Authorization: Bearer %GITHUB_TOKEN%" -H "Accept: application/vnd.github.v3+json" "https://api.github.com/repos/%OWNER%/%REPO%/actions/runs/!id!/cancel" -o nul
  if errorlevel 1 echo Failed to cancel !id!
)

del .\temp_action_runs.json >nul 2>&1
endlocal
echo Done.
