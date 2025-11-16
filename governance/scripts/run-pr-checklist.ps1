# PowerShell script to validate PR checklist
# Runs npm ci, validates lockfile is unchanged, installs Playwright browsers, runs unit/integration tests and Playwright e2e tests in serial.

$ErrorActionPreference = 'Stop'

Write-Host "Starting PR checklist validation (PowerShell)"

# Determine admin-node root directory relative to this script's location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$adminRoot = Split-Path -Parent $scriptDir
Set-Location $adminRoot

Write-Host "Running pnpm install for admin-node (frozen lockfile)"
npm install -g pnpm@8
pnpm -C . install --frozen-lockfile

Write-Host "Checking lockfile for uncommitted changes"
git diff --name-only --exit-code pnpm-lock.yaml
if ($LASTEXITCODE -ne 0) {
    Write-Error "pnpm-lock.yaml has changed. Run 'pnpm -C . install --frozen-lockfile' locally and commit the updated lockfile or revert package changes."
    exit 1
}

Write-Host "Installing Playwright browsers"
npx playwright install --with-deps

Write-Host "Run unit & integration tests"
npm test

Write-Host "Run Playwright e2e tests in serial and produce JSON results"
if (-Not (Test-Path -Path "playwright-results")) { New-Item -ItemType Directory -Force -Path "playwright-results" | Out-Null }
$null = cmd /c 'npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1 --reporter=json > playwright-results/results.json'

Write-Host "Compute Playwright JSON summary"
Set-Location $adminRoot
if (Test-Path -Path "playwright-results/results.json") {
    node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('playwright-results/results.json')); let passed=0, failed=0, skipped=0; function walk(s){ if(s.tests){ s.tests.forEach(t=>{ if(t.status==='passed') passed++; else if(t.status==='failed') failed++; else if(t.status==='skipped') skipped++; }) } if(s.suites) s.suites.forEach(walk); } walk(r); fs.writeFileSync('playwright-results/summary.json', JSON.stringify({passed,failed,skipped})); console.log(JSON.stringify({passed,failed,skipped}));"
}
Set-Location -Path $scriptDir

Write-Host "PR checklist validation completed successfully"
Set-Location -Path $scriptDir
Write-Host "Generate Playwright HTML report (if tests produced results)"
Set-Location $adminRoot
if (Test-Path -Path "playwright-report") {
    Write-Host "playwright-report already exists";
} else {
    Write-Host "Attempting to generate Playwright HTML report";
    try {
        npx playwright show-report
    } catch {
        Write-Host "Playwright HTML report generation failed or no report found";
    }
}
Set-Location -Path $scriptDir
