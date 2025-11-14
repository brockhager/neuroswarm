# NeuroSwarm Node1 Startup Script (Windows PowerShell)
# This script starts the NeuroSwarm node1 with proper environment configuration

Write-Host "Starting NeuroSwarm Node1..." -ForegroundColor Green

# Load environment variables
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host "Environment loaded from .env" -ForegroundColor Yellow
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
}

# Set working directory to project root
$projectRoot = Split-Path $PSScriptRoot -Parent
$projectRoot = Split-Path $projectRoot -Parent
Set-Location $projectRoot

# Check if pnpm is available
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: pnpm is not installed. Please install pnpm first." -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Start the node
Write-Host "Launching NeuroSwarm node1 on port $env:PORT..." -ForegroundColor Green
pnpm dev --filter ns-node

Write-Host "Node1 startup complete." -ForegroundColor Green