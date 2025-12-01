<#
PowerShell migration runner
Runs all *.sql files in the migrations folder using psql client.
Requires environment variables: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#>
param()

if (-not $env:PGHOST -or -not $env:PGUSER -or -not $env:PGPASSWORD -or -not $env:PGDATABASE) {
    Write-Error 'Please set PGHOST, PGUSER, PGPASSWORD and PGDATABASE environment variables before running this script.'
    exit 2
}

$migrations = Get-ChildItem -Path $PSScriptRoot -Filter *.sql | Sort-Object Name
if ($migrations.Count -eq 0) {
    Write-Host 'No migration files found.'
    exit 0
}

foreach ($m in $migrations) {
    Write-Host "Applying $($m.Name)"
    & psql -v ON_ERROR_STOP=1 --host=$env:PGHOST --port=${env:PGPORT:-5432} --username=$env:PGUSER --dbname=$env:PGDATABASE -f "$($m.FullName)"
    if ($LASTEXITCODE -ne 0) { Write-Error "psql failed for $($m.Name)"; exit $LASTEXITCODE }
}

Write-Host 'All migrations applied.'
