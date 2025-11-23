# Admin Node Genesis Anchor Script
# Computes SHA-256 hash of admin-genesis.json and submits Solana memo transaction

param(
    [string]$GenesisFile = "admin-genesis.json",
    [string]$FounderWallet = $env:FOUNDER_WALLET,
    [string]$SolanaRpc = $env:SOLANA_RPC,
    [string]$LogFile = $env:WP_PUBLISH_LOG_PATH
)

if (-not $LogFile) { $LogFile = "../governance/logs/wp_publish_log.jsonl" }

# Default values
if (-not $SolanaRpc) { $SolanaRpc = "https://api.mainnet-beta.solana.com" }

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$White = "White"

Write-Host "Admin Node Genesis Anchor Tool" -ForegroundColor $Yellow
Write-Host "=================================" -ForegroundColor $White

# Check if genesis file exists
if (-not (Test-Path $GenesisFile)) {
    Write-Host "Error: $GenesisFile not found" -ForegroundColor $Red
    exit 1
}

# Compute SHA-256 hash
Write-Host "Computing SHA-256 hash of $GenesisFile..."
$GenesisHash = (Get-FileHash -Path $GenesisFile -Algorithm SHA256).Hash.ToLower()
Write-Host "Genesis Hash: $GenesisHash" -ForegroundColor $Green

# Check if founder wallet is configured
if (-not $FounderWallet) {
    Write-Host "Error: FOUNDER_WALLET environment variable not set" -ForegroundColor $Red
    Write-Host "Set FOUNDER_WALLET to your Solana wallet address"
    exit 1
}

Write-Host "Founder Wallet: $FounderWallet"

# Confirm action
Write-Host ""
Write-Host "This will submit a Solana transaction with the genesis hash." -ForegroundColor $Yellow
$confirmation = Read-Host "Continue? (y/N)"
if ($confirmation -notmatch "^[Yy]$") {
    Write-Host "Operation cancelled."
    exit 0
}

# Submit Solana memo transaction
Write-Host "Submitting Solana memo transaction..."
$Memo = "AdminNode1:$GenesisHash"

# Use solana CLI to submit transaction
try {
    $solanaPath = Get-Command solana -ErrorAction Stop
    Write-Host "Using Solana CLI: $($solanaPath.Source)"

    # Create a temporary file for the transaction output
    $tempFile = [System.IO.Path]::GetTempFileName()

    # Run solana transfer command
    $process = Start-Process -FilePath "solana" -ArgumentList "transfer", "`"$FounderWallet`"", "0", "--memo", "`"$Memo`"", "--url", "`"$SolanaRpc`"", "--output", "json" -RedirectStandardOutput $tempFile -NoNewWindow -Wait -PassThru

    if ($process.ExitCode -eq 0) {
        $txOutput = Get-Content $tempFile -Raw
        $txData = $txOutput | ConvertFrom-Json
        $TxSignature = $txData.signatures[0]
        Write-Host "Transaction Signature: $TxSignature" -ForegroundColor $Green
        $ExplorerUrl = "https://explorer.solana.com/tx/$TxSignature"
        Write-Host "Explorer URL: $ExplorerUrl" -ForegroundColor $Green
    } else {
        Write-Host "Error: Transaction failed" -ForegroundColor $Red
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

# Log to governance log
$Timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm")
$LogEntry = @{
    action = "genesis-anchor"
    file = $GenesisFile
    hash = $GenesisHash
    blockchain = "solana"
    txSignature = $TxSignature
    explorerUrl = $ExplorerUrl
    timestamp = $Timestamp
    actor = "genesis-anchor-script"
} | ConvertTo-Json -Compress

Add-Content -Path $LogFile -Value $LogEntry
Write-Host "Governance log updated" -ForegroundColor $Green

Write-Host ""
Write-Host "Genesis anchor completed successfully!" -ForegroundColor $Green
Write-Host "Hash: $GenesisHash"
Write-Host "Transaction: $TxSignature"
Write-Host "Explorer: $ExplorerUrl"