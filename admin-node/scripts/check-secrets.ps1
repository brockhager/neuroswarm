# check-secrets.ps1
# Run from the root of your project (where /secrets/ lives)

$requiredFiles = @(
    "secrets/admin-node.jwt.key",
    "secrets/admin-node.jwt.pub"
)

$optionalFiles = @(
    "secrets/founder.jwt.key"
)

Write-Host "`nChecking required secrets for Admin Node startup:`n"

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "BEGIN RSA PRIVATE KEY" -or $content -match "BEGIN PUBLIC KEY") {
            Write-Host "OK: $file exists and appears to be a valid PEM key."
        } else {
            Write-Host "WARN: $file exists but may be incorrectly formatted."
        }
    } else {
        Write-Host "MISSING: $file"
    }
}

Write-Host "`nChecking optional governance key:`n"
foreach ($file in $optionalFiles) {
    if (Test-Path $file) {
        Write-Host "Optional key found: $file"
    } else {
        Write-Host "Optional key not present (only needed for manual governance signing)."
    }
}

Write-Host "`nSecrets folder check complete.`n"
