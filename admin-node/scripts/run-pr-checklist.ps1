# PowerShell script to validate PR checklist
# Runs npm ci, validates lockfile is unchanged, installs Playwright browsers, runs unit/integration tests and Playwright e2e tests in serial.

$ErrorActionPreference = 'Stop'

Write-Host "Starting PR checklist validation (PowerShell)"

# Determine admin-node root directory relative to this script's location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$adminRoot = Split-Path -Parent $scriptDir
Set-Location $adminRoot

Write-Host "Running npm ci"
npm ci

Write-Host "Checking lockfile for uncommitted changes"
git diff --name-only --exit-code package-lock.json
if ($LASTEXITCODE -ne 0) {
    Write-Error "package-lock.json has changed. Run 'npm ci' locally and commit the updated lockfile or revert package changes."
    exit 1
}

Write-Host "Installing Playwright browsers"
npx playwright install --with-deps

Write-Host "Run unit & integration tests"
npm test

Write-Host "Run Playwright e2e tests in serial"
npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1

Write-Host "PR checklist validation completed successfully"
Set-Location -Path $scriptDir
Write-Host "Generate Playwright HTML report (if tests produced results)"
Set-Location $adminRoot
if (Test-Path -Path "playwright-report") {
    Write-Host "playwright-report already exists";
} else {
    Write-Host "Attempting to generate Playwright HTML report";
    npx playwright show-report || Write-Host "Playwright HTML report generation failed or no report found";
}
Set-Location -Path $scriptDir
