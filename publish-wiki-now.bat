@echo off
REM Publish Wiki Now (neuroswarm folder helper)
REM Usage: double-click to run; optional argument: --dry-run
setlocal

echo ==============================
echo Publish Wiki Now - neuroswarm (neuroswarm helper)
echo ==============================

REM The script is intended to run from the neuroswarm subdirectory.
REM Determine the repo root as the parent of this folder
REM Compute repo root as parent of the folder this script sits in
set SCRIPT_DIR=%~dp0
REM Trim trailing backslash from SCRIPT_DIR if present
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%
set REPO_ROOT=%SCRIPT_DIR%\..
REM Normalize the path
for /f "delims=" %%x in ('cd /d "%REPO_ROOT%" 2^>nul ^& cd') do set REPO_ROOT=%%x
if not exist "%REPO_ROOT%" (
  echo Warning: Computed repo root '%REPO_ROOT%' does not exist.
  echo Falling back to script directory: '%SCRIPT_DIR%'
  set REPO_ROOT=%SCRIPT_DIR%
)

pushd "%REPO_ROOT%" >nul 2>&1 || (
  echo Could not change directory to '%REPO_ROOT%'. Aborting.
  goto end
)

REM No delegation to root-level scripts. This helper runs in the `neuroswarm` folder and
REM dispatches the repo workflow or falls back to the local Node script if GH CLI is missing.

REM If no repo-level script is present, re-run the logic inline (fallback)
REM Attempt to detect owner/repo using gh (preferred) or git remote as fallback
REM Hard-coded target repo (only publish wiki updates to the neuroswarm repo)
set REPO_OWNER=brockhager
set REPO_NAME=neuroswarm
set REPO=%REPO_OWNER%/%REPO_NAME%
REM Support an override environment variable: PUBLISH_REPO (owner/repo)
if defined PUBLISH_REPO (
  set REPO=%PUBLISH_REPO%
  for /f "delims=/ tokens=1,2" %%a in ("%REPO%") do set REPO_OWNER=%%a & set REPO_NAME=%%b
)
where gh >nul 2>&1
if %ERRORLEVEL%==0 (
  rem Use gh to verify or override the REPO only if it succeeds
  rem Write outputs to temp files to avoid GraphQL error text being printed directly
  set GH_OUT=%TEMP%\gh_repo_view_out.txt
  set GH_ERR=%TEMP%\gh_repo_view_err.txt
  del /q "%GH_OUT%" >nul 2>&1
  del /q "%GH_ERR%" >nul 2>&1
  gh repo view "%REPO%" --json owner,name -q ".owner.login + \"/\" + .name" > "%GH_OUT%" 2> "%GH_ERR%"
  if %ERRORLEVEL%==0 (
    for /f "delims=" %%r in ('type "%GH_OUT%"') do set REPO=%%r
    del /q "%GH_OUT%" >nul 2>&1
    del /q "%GH_ERR%" >nul 2>&1
  ) else (
    echo Warning: gh repo view failed for %REPO% - using git remote parsing as fallback.
    echo gh error:
    type "%GH_ERR%" || echo (no detailed error output)
    del /q "%GH_OUT%" >nul 2>&1
    del /q "%GH_ERR%" >nul 2>&1
  )
)
REM No fallback to git remote parsing - REPO is hard-coded or provided via PUBLISH_REPO env var
set WORKFLOW=publish-wiki-now.yml
REM Compute default branch (try git remote show origin HEAD branch)
set DEFAULT_BRANCH=master
for /f "tokens=3 delims=: " %%b in ('git remote show origin 2^>nul ^| findstr /C:"HEAD branch:"') do set DEFAULT_BRANCH=%%b
set DRY=0
set LOCAL=0
for %%a in (%*) do (
  if "%%~a"=="--dry-run" set DRY=1
  if "%%~a"=="--dry" set DRY=1
  if "%%~a"=="--local" set LOCAL=1
  if "%%~a"=="--local-push" set LOCAL=1
)

echo Script directory: %SCRIPT_DIR%
echo Computed repo root: %REPO_ROOT%
echo Target repo (REPO): %REPO%
echo Target workflow: %WORKFLOW% (branch: %DEFAULT_BRANCH%)
choice /M "This will publish the wiki (this may change the repository wiki). Continue?"
if errorlevel 2 (
  echo Aborted by user.
  goto exit_popd
)

where gh >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Using GitHub CLI to trigger the workflow.
  echo Target repo: %REPO%  (branch: %DEFAULT_BRANCH%)
  if "%REPO%"=="brockhager/name" (
    echo ERROR: Computed repo is 'brockhager/name' (placeholder); the gh CLI likely failed to determine the repo.
    echo Please set `PUBLISH_REPO=brockhager/neuroswarm` and retry, or run the fallback.
    choice /M "Run fallback push script instead?"
    if errorlevel 2 (
      echo Aborted by user.
      goto exit_popd
    )
    goto node_fallback
  )
  echo Checking workflow availability in %REPO% ...
  gh workflow view "%WORKFLOW%" --repo %REPO% >nul 2>&1
  if %ERRORLEVEL% NEQ 0 (
    echo WORKFLOW '%WORKFLOW%' not found in %REPO%.
    echo This may be because the upstream repository is different or you are on a fork without the workflow.
    echo You can either run the local node-based fallback to push the wiki or run gh from the intended repo.
    choice /M "Run fallback push script instead?"
    if errorlevel 2 (
      echo Aborted by user.
      goto exit_popd
    )
    goto node_fallback
  )
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

if "%LOCAL%"=="1" (
  goto local_push
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
del "%TEMP%\git_status.txt" >nul 2>&1
popd >nul 2>&1
goto end

:: Local direct push (not via GH dispatch or Node push script)
:local_push
echo === Local Wiki Push Mode ===

where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Git is not installed or not in PATH. Please install Git: https://git-scm.com/downloads
  goto exit_popd
)

REM Determine wiki local clone path under neuroswarm
set WIKI_DIR=%REPO_ROOT%\neuroswarm\wiki-clone
if defined WIKI_CLONE_DIR set WIKI_DIR=%WIKI_CLONE_DIR%
if not exist "%WIKI_DIR%\.git" (
  echo Wiki repo not found in '%WIKI_DIR%'.
  echo Clone it with:
  echo git clone https://github.com/%REPO%.wiki.git "^"%WIKI_DIR%^"
  echo Aborting local push.
  goto exit_popd
)

pushd "%WIKI_DIR%" >nul 2>&1 || (
  echo Could not cd to '%WIKI_DIR%'
  goto exit_popd
)

echo Pulling latest wiki from origin...
git pull origin %DEFAULT_BRANCH% || (
  echo Failed to pull wiki.
  popd >nul 2>&1
  goto exit_popd
)

REM Ensure the code repo's docs are up to date before copying
pushd "%REPO_ROOT%" >nul 2>&1
echo Pulling latest code repo from origin (%DEFAULT_BRANCH%)...
git pull origin %DEFAULT_BRANCH% || echo Failed to pull code repo (proceeding with local copy)
popd >nul 2>&1

REM Copy updated docs from neuroswarm/docs and neuroswarm/docs/wiki into wiki clone
echo Copying docs from '%REPO_ROOT%\neuroswarm\docs' and '...\neuroswarm\docs\wiki' into wiki clone
rem Copy and rename key docs to expected wiki filenames
if exist "%REPO_ROOT%\neuroswarm\docs\run-nodes.md" (
  echo Copying run-nodes.md -> Running-Nodes.md
  xcopy /Y /I "%REPO_ROOT%\neuroswarm\docs\run-nodes.md" "%WIKI_DIR%\Running-Nodes.md" >nul 2>&1
)
if exist "%REPO_ROOT%\neuroswarm\docs\download.md" (
  echo Copying download.md -> Download.md
  xcopy /Y /I "%REPO_ROOT%\neuroswarm\docs\download.md" "%WIKI_DIR%\Download.md" >nul 2>&1
)
if exist "%REPO_ROOT%\neuroswarm\docs\data-flow-architecture.md" (
  echo Copying data-flow-architecture.md -> Data-Flow-Architecture.md
  xcopy /Y /I "%REPO_ROOT%\neuroswarm\docs\data-flow-architecture.md" "%WIKI_DIR%\Data-Flow-Architecture.md" >nul 2>&1
)
if exist "%REPO_ROOT%\neuroswarm\docs\pnpm-policy.md" (
  echo Copying pnpm-policy.md -> Contributor-Policy.md
  xcopy /Y /I "%REPO_ROOT%\neuroswarm\docs\pnpm-policy.md" "%WIKI_DIR%\Contributor-Policy.md" >nul 2>&1
)
rem Copy docs/wiki (flat) if exists
if exist "%REPO_ROOT%\neuroswarm\docs\wiki\*.md" (
  xcopy /Y /Q "%REPO_ROOT%\neuroswarm\docs\wiki\*.md" "%WIKI_DIR%\" >nul 2>&1
)
rem Copy neuroswarm/wiki extra pages
if exist "%REPO_ROOT%\neuroswarm\wiki\*.md" (
  xcopy /Y /Q "%REPO_ROOT%\neuroswarm\wiki\*.md" "%WIKI_DIR%\" >nul 2>&1
)

echo Staging changes...
git add --all

REM Check for staged changes
set HAS_CHANGES=
git status --porcelain > "%TEMP%\git_status.txt"
for /f "delims=" %%c in ('type "%TEMP%\git_status.txt"') do set HAS_CHANGES=1
if "%HAS_CHANGES%"=="1" (
  if "%DRY%"=="1" (
    echo Dry-run: staged changes detected; not committing or pushing due to --dry-run flag
    type "%TEMP%\git_status.txt"
    del "%TEMP%\git_status.txt" >nul 2>&1
    popd >nul 2>&1
    goto exit_popd
  )
  echo Committing changes...
  git commit -m "Update wiki: downloads page, links, docs" || echo Nothing to commit
  echo Pushing changes to origin/%DEFAULT_BRANCH%...
  git push origin %DEFAULT_BRANCH%
  if %ERRORLEVEL% NEQ 0 (
    echo Push failed. If GitHub credentials are missing, follow:
    echo git config --global credential.helper manager
    popd >nul 2>&1
    goto exit_popd
  )
  echo Wiki update pushed.
) else (
  echo No changes detected; nothing to commit.
)

popd >nul 2>&1
goto exit_popd

:end
echo Done.
endlocal
