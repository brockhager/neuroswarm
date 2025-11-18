@echo off
REM Publish Wiki Now (neuroswarm folder helper)
REM Usage: double-click to run; optional argument: --dry-run
setlocal

echo ==============================
echo Publish Wiki Now - neuro-infra (neuroswarm helper)
echo ==============================

REM The script is intended to run from the neuroswarm subdirectory.
REM Determine the repo root as the parent of this folder
set REPO_ROOT=%~dp0\..
REM Trim trailing backslash
for /f "delims=" %%x in ('cd /d "%REPO_ROOT%"^& cd') do set REPO_ROOT=%%x

pushd "%REPO_ROOT%" >nul 2>&1

REM No delegation to root-level scripts. This helper runs in the `neuroswarm` folder and
REM dispatches the repo workflow or falls back to the local Node script if GH CLI is missing.

REM If no repo-level script is present, re-run the logic inline (fallback)
REM Attempt to detect owner/repo using gh (preferred) or git remote as fallback
set REPO_OWNER=brockhager
set REPO_NAME=neuro-infra
set REPO=%REPO_OWNER%/%REPO_NAME%
where gh >nul 2>&1
if %ERRORLEVEL%==0 (
  for /f "delims=" %%r in ('gh repo view --json owner,name -q ".owner.login + \"/\" + .name"') do set REPO=%%r
)
if "%REPO%"=="" (
  for /f "delims=" %%u in ('git config --get remote.origin.url') do set REMOTE_URL=%%u
  if not "%REMOTE_URL%"=="" (
    REM Normalize a few common remote formats
    set REPO_TMP=%REMOTE_URL%
    set REPO_TMP=%REPO_TMP:git@github.com:=%
    set REPO_TMP=%REPO_TMP:https://github.com/=%
    set REPO_TMP=%REPO_TMP:.git=%
    for /f "delims=/ tokens=1,2" %%a in ("%REPO_TMP%") do set REPO_OWNER=%%a & set REPO_NAME=%%b
    set REPO=%REPO_OWNER%/%REPO_NAME%
  )
)
set WORKFLOW=publish-wiki-now.yml
REM Compute default branch (try git remote show origin HEAD branch)
set DEFAULT_BRANCH=master
for /f "tokens=3 delims=: " %%b in ('git remote show origin 2^>nul ^| findstr /C:"HEAD branch:"') do set DEFAULT_BRANCH=%%b
set DRY=0
if "%~1"=="--dry-run" set DRY=1
if "%~1"=="--dry" set DRY=1

choice /M "This will publish the wiki (this may change the repository wiki). Continue?"
if errorlevel 2 (
  echo Aborted by user.
  goto exit_popd
)

where gh >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Using GitHub CLI to trigger the workflow.
  echo Running: gh workflow run %WORKFLOW% --repo %REPO% --ref %DEFAULT_BRANCH%
  gh workflow run "%WORKFLOW%" --repo %REPO% --ref %DEFAULT_BRANCH%
  if %ERRORLEVEL% NEQ 0 (
    echo gh workflow run failed.
    echo If gh CLI is not authenticated, run: gh auth login
    echo Or fallback to local node-based publish.
    goto node_fallback
  )
  echo GitHub workflow dispatched successfully.
  echo Opening the Actions workflow page in your browser.
  start https://github.com/%REPO%/actions/workflows/%WORKFLOW% >nul 2>&1
  goto exit_popd
)

:node_fallback
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Neither GitHub CLI (gh) nor Node.js detected on this system.
  echo Please install the GitHub CLI (https://cli.github.com/) or Node.js (https://nodejs.org) and re-run this batch file.
  goto exit_popd
)

  echo Node.js found. Attempting to run local script neuroswarm\scripts\pushDocsToWiki.mjs
if not exist "neuroswarm\scripts\pushDocsToWiki.mjs" (
  echo Could not find neuroswarm\scripts\pushDocsToWiki.mjs relative to %REPO_ROOT%
  goto exit_popd
)

if not defined GH_PAT (
  echo A personal access token (GH_PAT) is needed to push to the wiki.
  echo You can create one at https://github.com/settings/tokens (scopes: repo)
  set /p INPUT_TOKEN=Enter GH_PAT (leave blank to abort): 
  if "%INPUT_TOKEN%"=="" (
    echo Aborting: no token provided.
    goto exit_popd
  )
  set GH_PAT=%INPUT_TOKEN%
)

if "%DRY%"=="1" (
  echo Running dry-run: node neuroswarm\scripts\pushDocsToWiki.mjs --dry-run
  node neuroswarm\scripts\pushDocsToWiki.mjs --dry-run
  goto exit_popd
)

echo Running: node neuroswarm\scripts\pushDocsToWiki.mjs
node neuroswarm\scripts\pushDocsToWiki.mjs
if %ERRORLEVEL% NEQ 0 (
  echo The push script failed. Confirm your GH_PAT/token has proper permissions and try again.
  goto exit_popd
)

echo Wiki content push complete.
echo Opening the Wiki Actions page for confirmation.
start https://github.com/%REPO%/actions/workflows/%WORKFLOW% >nul 2>&1

:exit_popd
popd >nul 2>&1
goto end

:end
echo Done.
endlocal
