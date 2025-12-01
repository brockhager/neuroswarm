<#
PowerShell E2E orchestrator for router-api using docker-compose.test.yml
Usage: Run from the router-api folder in PowerShell (Admin or with Docker Desktop running)
#>
param()

$ErrorActionPreference = 'Stop'

Write-Host "[E2E-PS] Bringing up the E2E environment..."
docker compose -f .\docker-compose.test.yml up -d --build

Write-Host "[E2E-PS] Waiting for router-api health endpoint"
for ($i=0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { Write-Host "[E2E-PS] router-api is healthy"; break }
    } catch {
        Write-Host "[E2E-PS] waiting... ($i)"
        Start-Sleep -Seconds 2
    }
}

Write-Host "[E2E-PS] Running E2E tests via pnpm"
pnpm test:e2e

$res = $LASTEXITCODE

Write-Host "[E2E-PS] Tearing down environment"
docker compose -f .\docker-compose.test.yml down -v

exit $res
