# NeuroSwarm Contributor Onboarding Script (Windows PowerShell)
# One-command setup: .\onboard.ps1
# Time to complete: < 5 minutes

param(
    [switch]$Full,
    [switch]$Detach,
    [switch]$Rebuild,
    [switch]$Help
)

# Colors
$Red = "`e[91m"
$Green = "`e[92m"
$Yellow = "`e[93m"
$Blue = "`e[94m"
$Reset = "`e[0m"

# Banner
Write-Host ""
Write-Host "${Blue}╔═══════════════════════════════════════════════════════════╗${Reset}"
Write-Host "${Blue}║                                                           ║${Reset}"
Write-Host "${Blue}║        🧠  NEUROSWARM CONTRIBUTOR ONBOARDING  🧠         ║${Reset}"
Write-Host "${Blue}║                                                           ║${Reset}"
Write-Host "${Blue}║            Zero-Setup Installation Script                ║${Reset}"
Write-Host "${Blue}║                                                           ║${Reset}"
Write-Host "${Blue}╚═══════════════════════════════════════════════════════════╝${Reset}"
Write-Host ""

# Show help
if ($Help) {
    Write-Host "Usage: .\onboard.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Full       Start all services (including NS-LLM and web UI)"
    Write-Host "  -Detach     Run in background (detached mode)"
    Write-Host "  -Rebuild    Force rebuild of Docker images"
    Write-Host "  -Help       Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\onboard.ps1               # Start core nodes (NS, Gateway, VP, Admin)"
    Write-Host "  .\onboard.ps1 -Full         # Start all services including AI and web UI"
    Write-Host "  .\onboard.ps1 -Detach       # Run in background"
    Write-Host "  .\onboard.ps1 -Rebuild      # Force rebuild if code changed"
    Write-Host ""
    exit 0
}

# Step 1: Check Docker
Write-Host "${Yellow}[1/5]${Reset} Checking Docker installation..."

try {
    $dockerVersion = docker --version 2>$null
    if (-not $dockerVersion) {
        throw "Docker not found"
    }
} catch {
    Write-Host "${Red}✗ Docker not found!${Reset}"
    Write-Host ""
    Write-Host "Please install Docker Desktop for Windows:"
    Write-Host "  https://docs.docker.com/desktop/install/windows-install/"
    Write-Host ""
    exit 1
}

try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
} catch {
    Write-Host "${Red}✗ Docker daemon not running!${Reset}"
    Write-Host "Please start Docker Desktop"
    exit 1
}

Write-Host "${Green}✓ Docker found and running${Reset}"

# Step 2: Check Docker Compose
Write-Host "${Yellow}[2/5]${Reset} Checking Docker Compose..."

try {
    docker compose version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose not found"
    }
} catch {
    Write-Host "${Red}✗ Docker Compose not found!${Reset}"
    Write-Host "Please update Docker Desktop to the latest version"
    exit 1
}

Write-Host "${Green}✓ Docker Compose ready${Reset}"

# Step 3: Build command
Write-Host "${Yellow}[3/5]${Reset} Starting NeuroSwarm nodes..."
Write-Host ""

$composeArgs = @("up")

if ($Detach) {
    $composeArgs += "-d"
}

if ($Rebuild) {
    $composeArgs += "--build"
}

if ($Full) {
    Write-Host "🚀 Starting FULL stack (core nodes + NS-LLM + web UI)..."
    $composeArgs = @("--profile", "full") + $composeArgs
} else {
    Write-Host "🚀 Starting CORE nodes (NS, Gateway, VP, Admin)..."
}

# Step 4: Start services
docker compose @composeArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "${Red}✗ Failed to start services${Reset}"
    Write-Host "Check the logs above for error details"
    exit 1
}

# If running in detached mode, show status
if ($Detach) {
    Write-Host ""
    Write-Host "${Yellow}[4/5]${Reset} Waiting for services to be healthy..."
    Start-Sleep -Seconds 5
    
    # Check health status
    Write-Host ""
    Write-Host "Service Status:"
    docker compose ps
    
    Write-Host ""
    Write-Host "${Yellow}[5/5]${Reset} Verifying connectivity..."
    Start-Sleep -Seconds 10
    
    # Test endpoints
    Write-Host ""
    Write-Host "Testing endpoints:"
    
    function Test-Endpoint {
        param($Url, $Name)
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host "  ${Green}✓${Reset} ${Name}: ${Url}"
                return $true
            }
        } catch {
            Write-Host "  ${Red}✗${Reset} ${Name}: ${Url} (not ready yet)"
            return $false
        }
    }
    
    Test-Endpoint "http://localhost:3009/health" "NS Node (Brain)     "
    Test-Endpoint "http://localhost:8080/health" "Gateway Node        "
    Test-Endpoint "http://localhost:3002/health" "VP Node (Validator) "
    Test-Endpoint "http://localhost:3000/health" "Admin Node (Dashboard)"
    
    if ($Full) {
        Test-Endpoint "http://localhost:3010/" "Web UI              "
    }
    
    Write-Host ""
    Write-Host "${Green}✅ NeuroSwarm is running!${Reset}"
    Write-Host ""
    Write-Host "Next Steps:"
    Write-Host "  • View logs:       docker compose logs -f"
    Write-Host "  • Stop services:   docker compose down"
    Write-Host "  • Restart:         docker compose restart"
    Write-Host "  • Check status:    docker compose ps"
    Write-Host ""
    Write-Host "Dashboard: http://localhost:3000"
    Write-Host "API Docs:  http://localhost:3009/api-docs"
    Write-Host ""
    Write-Host "Happy coding! 🚀"
} else {
    Write-Host ""
    Write-Host "${Green}✅ NeuroSwarm started in foreground mode${Reset}"
    Write-Host "Press Ctrl+C to stop all services"
}
