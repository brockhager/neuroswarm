param()

Write-Host "Checking router-api health endpoint: http://localhost:3000/health"

try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/health' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { Write-Host "router-api is responding. If you still see DB errors check logs for Postgres connectivity."; exit 0 }
} catch {
    Write-Host "router-api did not respond. Checking local Postgres ports..."

    $check5432 = Test-NetConnection -ComputerName 127.0.0.1 -Port 5432
    if ($check5432.TcpTestSucceeded) { Write-Host " - Postgres listening on 127.0.0.1:5432" } else { Write-Host " - No Postgres on 127.0.0.1:5432" }

    $check5433 = Test-NetConnection -ComputerName 127.0.0.1 -Port 5433
    if ($check5433.TcpTestSucceeded) { Write-Host " - Test Postgres appears to be listening on 127.0.0.1:5433" } else { Write-Host " - No test Postgres on 127.0.0.1:5433 — start with:`n    docker compose -f router-api\docker-compose.test.yml up -d --build db" }

    Write-Host "If running router-api locally (ts-node), set DATABASE_URL to point at host:5433 like:`n    set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test"
    exit 1
}
