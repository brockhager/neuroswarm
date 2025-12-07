<#
PowerShell E2E orchestrator for router-api using docker-compose.test.yml
Usage: Run from the router-api folder in PowerShell (Admin or with Docker Desktop running)
#>
param()

$ErrorActionPreference = 'Stop'

Write-Host "[E2E-PS] Bringing up the E2E environment (DB only)..."
# Start DB only first
docker compose -f .\docker-compose.test.yml up -d --build db

Write-Host "[E2E-PS] Waiting for postgres to be ready"
for ($i=0; $i -lt 60; $i++) {
    try {
        docker compose -f .\docker-compose.test.yml exec -T db pg_isready -U neuroswarm_user -d neuroswarm_router_db_test | Out-Null
        Write-Host "[E2E-PS] postgres is healthy"
        break
    } catch {
        Write-Host "[E2E-PS] waiting for postgres... ($i)"
        Start-Sleep -Seconds 3
    }
}

Write-Host "[E2E-PS] Applying DB migrations (using standardized runner)"
# We use the standardized PowerShell runner on the host and target the DB port mapped to host (5433)
$env:PGHOST = '127.0.0.1'
$env:PGPORT = '5433'
$env:PGUSER = 'neuroswarm_user'
$env:PGPASSWORD = 'neuroswarm_password'
$env:PGDATABASE = 'neuroswarm_router_db_test'

$runner = Join-Path $PSScriptRoot 'migrations\run-migrations.ps1'
if (Test-Path $runner) {
    Write-Host "[E2E-PS] Running $runner against $($env:PGHOST):$($env:PGPORT)"
    & $runner
} else {
    Write-Host "[E2E-PS] Migration runner not found; falling back to single-file psql apply inside container"
    docker compose -f .\docker-compose.test.yml exec -T db sh -c 'psql -U neuroswarm_user -d neuroswarm_router_db_test -f /docker-entrypoint-initdb.d/001_add_refund_persistence.sql || true'
}

Write-Host "[E2E-PS] Starting Router API service"
docker compose -f .\docker-compose.test.yml up -d --build router-api

Write-Host "[E2E-PS] Waiting for router-api health endpoint"
for ($i=0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { Write-Host "[E2E-PS] router-api is healthy"; break }
    } catch {
        Write-Host "[E2E-PS] waiting... ($i)"
        Start-Sleep -Seconds 3
    }
}

Write-Host "[E2E-PS] Running E2E tests via pnpm"
pnpm test:e2e

$res = $LASTEXITCODE

Write-Host "[E2E-PS] Tearing down environment"
docker compose -f .\docker-compose.test.yml down -v

exit $res
