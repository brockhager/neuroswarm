# Admin Node Genesis Anchor Verification Script
# Verifies blockchain anchor against local genesis hash

param(
    [string]$GenesisFile = "admin-genesis.json",
    [string]$ExpectedTx = $env:EXPECTED_TX,
    [string]$SolanaRpc = $env:SOLANA_RPC,
    [string]$LogFile = "../wp_publish_log.jsonl"
)

# Default values
if (-not $SolanaRpc) { $SolanaRpc = "https://api.mainnet-beta.solana.com" }

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$White = "White"

Write-Host "Admin Node Genesis Anchor Verification" -ForegroundColor $Yellow
Write-Host "=======================================" -ForegroundColor $White

# Check if genesis file exists
if (-not (Test-Path $GenesisFile)) {
    Write-Host "Error: $GenesisFile not found" -ForegroundColor $Red
    exit 1
}

# Compute current SHA-256 hash
Write-Host "Computing current SHA-256 hash of $GenesisFile..."
$CurrentHash = (Get-FileHash -Path $GenesisFile -Algorithm SHA256).Hash.ToLower()
Write-Host "Current Hash: $CurrentHash" -ForegroundColor $Green

# Check if expected transaction is configured
if (-not $ExpectedTx) {
    Write-Host "EXPECTED_TX not set. Searching governance logs for anchor transaction..." -ForegroundColor $Yellow

    # Try to find the latest genesis-anchor entry in logs
    if (Test-Path $LogFile) {
        $logContent = Get-Content $LogFile -Raw
        $logLines = $logContent -split "`n" | Where-Object { $_ -match '"action": "genesis-anchor"' }

        if ($logLines) {
            $latestAnchor = $logLines | Select-Object -Last 1
            $anchorData = $latestAnchor | ConvertFrom-Json
            $ExpectedTx = $anchorData.txSignature
            $ExpectedHash = $anchorData.hash
            Write-Host "Found anchor transaction: $ExpectedTx" -ForegroundColor $Green
            Write-Host "Expected hash: $ExpectedHash" -ForegroundColor $Green
        } else {
            Write-Host "Error: No genesis anchor found in governance logs" -ForegroundColor $Red
            Write-Host "Run genesis-anchor.ps1 first to create the blockchain anchor"
            exit 1
        }
    } else {
        Write-Host "Error: Governance log file not found" -ForegroundColor $Red
        exit 1
    }
} else {
    Write-Host "Expected Transaction: $ExpectedTx"
}

# Fetch transaction data from Solana
Write-Host "Fetching transaction data from Solana..."
try {
    $solanaPath = Get-Command solana -ErrorAction Stop
    Write-Host "Using Solana CLI: $($solanaPath.Source)"

    # Create a temporary file for the transaction output
    $tempFile = [System.IO.Path]::GetTempFileName()

    # Run solana confirm command
    $process = Start-Process -FilePath "solana" -ArgumentList "confirm", "`"$ExpectedTx`"", "--url", "`"$SolanaRpc`"", "--output", "json" -RedirectStandardOutput $tempFile -RedirectStandardError $tempFile -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -eq 0) {
        $txOutput = Get-Content $tempFile -Raw
        $txData = $txOutput | ConvertFrom-Json
        $Memo = $txData.memo
    } else {
        Write-Host "Error: Could not fetch transaction $ExpectedTx" -ForegroundColor $Red
        Get-Content $tempFile
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        exit 1
    }

    Remove-Item $tempFile -ErrorAction SilentlyContinue
} catch {
    Write-Host "Error: solana CLI not found. Please install Solana CLI tools." -ForegroundColor $Red
    Write-Host "Download from: https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor $Yellow
    exit 1
}

if (-not $Memo) {
    Write-Host "Error: No memo found in transaction" -ForegroundColor $Red
    exit 1
}

Write-Host "Transaction Memo: $Memo" -ForegroundColor $Green

# Parse memo for hash
if ($Memo -match "AdminNode1:([a-f0-9]{64})") {
    $BlockchainHash = $matches[1]
    Write-Host "Blockchain Hash: $BlockchainHash" -ForegroundColor $Green
} else {
    Write-Host "Error: Invalid memo format. Expected 'AdminNode1:<hash>'" -ForegroundColor $Red
    exit 1
}

# Compare hashes
Write-Host ""
Write-Host "Verification Results:" -ForegroundColor $White
Write-Host "====================" -ForegroundColor $White
Write-Host "Current Genesis Hash:  $CurrentHash"
Write-Host "Blockchain Hash:       $BlockchainHash"

if ($CurrentHash -eq $BlockchainHash) {
    Write-Host "✅ VERIFICATION PASSED: Genesis hash matches blockchain anchor" -ForegroundColor $Green

    # Log successful verification
    $Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm")
    $LogEntry = @{
        action = "genesis-anchor-verified"
        file = $GenesisFile
        hash = $CurrentHash
        blockchain = "solana"
        txSignature = $ExpectedTx
        result = "passed"
        timestamp = $Timestamp
        actor = "verify-anchor-script"
    } | ConvertTo-Json -Compress

    Add-Content -Path $LogFile -Value $LogEntry
    exit 0
} else {
    Write-Host "❌ VERIFICATION FAILED: Genesis hash does not match blockchain anchor" -ForegroundColor $Red
    Write-Host "This indicates the genesis file has been modified since anchoring."

    # Log failed verification
    $Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm")
    $LogEntry = @{
        action = "genesis-anchor-verified"
        file = $GenesisFile
        currentHash = $CurrentHash
        blockchainHash = $BlockchainHash
        blockchain = "solana"
        txSignature = $ExpectedTx
        result = "failed"
        timestamp = $Timestamp
        actor = "verify-anchor-script"
    } | ConvertTo-Json -Compress

    Add-Content -Path $LogFile -Value $LogEntry
    exit 1
}