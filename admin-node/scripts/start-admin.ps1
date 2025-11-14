# NeuroSwarm Admin Node Startup Script
# This script starts the NeuroSwarm admin node with proper security checks

param(
    [switch]$Dev,
    [switch]$Help
)

if ($Help) {
    Write-Host "NeuroSwarm Admin Node Startup Script"
    Write-Host "Usage: .\start-admin.ps1 [-Dev] [-Help]"
    Write-Host ""
    Write-Host "Parameters:"
    Write-Host "  -Dev    : Run in development mode with ts-node"
    Write-Host "  -Help   : Show this help message"
    exit 0
}

# Set execution policy for this session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Get the script directory and navigate to admin-node root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AdminNodeDir = Split-Path -Parent $ScriptDir

Write-Host "Starting NeuroSwarm Admin Node..."
Write-Host "Admin Node Directory: $AdminNodeDir"

# Change to admin-node directory
Set-Location $AdminNodeDir

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
}

# Check if dist exists for production, or build if needed
if (!$Dev -and !(Test-Path "dist")) {
    Write-Host "Building admin node..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build admin node"
        exit 1
    }
}

# Load environment variables
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env"
} else {
    Write-Warning "No .env file found. Using default configuration."
}

# Check admin genesis configuration
$GenesisPath = Join-Path $AdminNodeDir "..\docs\admin\admin-genesis.json"
if (Test-Path $GenesisPath) {
    Write-Host "Found admin genesis configuration"
    try {
        $Genesis = Get-Content $GenesisPath | ConvertFrom-Json
        Write-Host "Admin nodes configured: $($Genesis.admin.nodes.adminNodes.Count)"
    } catch {
        Write-Warning "Failed to parse admin genesis configuration"
    }
} else {
    Write-Warning "Admin genesis configuration not found at $GenesisPath"
}

# Get current IP for verification
try {
    $CurrentIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "Current IP: $CurrentIP"
} catch {
    Write-Warning "Could not determine current IP address"
}

Write-Host "Starting admin node server..."

# Start the admin node
if ($Dev) {
    Write-Host "Running in development mode..."
    npm run dev
} else {
    Write-Host "Running in production mode..."
    npm start
}

Write-Host "Admin node stopped."