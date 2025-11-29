<#
PowerShell equivalent of setup_wp_publisher.sh (admin-node)
Relocated to admin-node/scripts to indicate admin-only Python tooling.
#>
Write-Host "🚀 Setting up NeuroSwarm WordPress Publisher (Windows / admin-node)"

if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python 3 is required but not installed. Please install Python 3.7+ first."
    exit 1
}

Write-Host "✅ Python is present: $(python --version 2>$null || python3 --version 2>$null)"

if (-not (Get-Command pip -ErrorAction SilentlyContinue) -and -not (Get-Command pip3 -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pip is required but not installed. Please install pip first."
    exit 1
}

Write-Host "✅ pip found"

Write-Host "📦 Installing Python dependencies..."
pip3 install -r requirements-wp.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies"
    exit 1
}

Write-Host "✅ Dependencies installed successfully"
New-Item -ItemType Directory -Force -Path content, assets, logs | Out-Null
Write-Host "✅ Directories created"

if (-not (Test-Path .wp_publisher.env)) {
    Write-Host "⚠️  Configuration file .wp_publisher.env not found"
    Write-Host "   Please add WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD as needed"
} else {
    Write-Host "✅ Configuration file found"
}

if (Test-Path .wp_publisher.env) {
    Write-Host "🔗 Testing WordPress connection..."
    $envVars = Get-Content .wp_publisher.env | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '=' }
    foreach ($line in $envVars) { $parts = $line -split '='; Set-Item -Path env:$($parts[0]) -Value $parts[1] }

    if ($env:WP_USERNAME -and $env:WP_APP_PASSWORD) {
        python admin-node/scripts/test_connection.py --username $env:WP_USERNAME --password $env:WP_APP_PASSWORD --url ${env:WP_SITE_URL}
        $connection_test = $LASTEXITCODE
    } else {
        Write-Host "⚠️  WordPress credentials not found in .wp_publisher.env"
        $connection_test = 1
    }
} else {
    $connection_test = 1
}

Write-Host ""
Write-Host "🎉 Setup complete!"
Write-Host "For more: admin-node/scripts/setup_wp_publisher.sh"

if ($connection_test -eq 0) {
    Write-Host "✅ Connection tested OK"
} else {
    Write-Host "⚠️  Please configure credentials or check connectivity"
}
