# Fix broken internal wiki links after reorganization
# This script updates relative paths to Index.md and Home.md

Set-Location "c:\JS\ns\neuroswarm\wiki"

Write-Host "Fixing broken wiki links..." -ForegroundColor Cyan

$filesFixed = 0
$linksFixed = 0

# Fix Index.md links in subdirectories (should be ../Index.md)
$subdirFiles = Get-ChildItem -Path . -Recurse -Include *.md -Exclude Index.md,README.md | Where-Object { $_.DirectoryName -ne (Get-Location).Path }

foreach ($file in $subdirFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Fix direct Index.md references (should be ../Index.md)
    $content = $content -replace '\]\(Index\.md\)', '](../Index.md)'
    
    # Fix Home.md references
    $content = $content -replace '\]\(Home\.md\)', '](../Getting-Started/Home.md)'
    
    # Fix getting-started.md references
    $content = $content -replace '\]\(\.\./getting-started\.md\)', '](../Getting-Started/Getting-Started.md)'
    $content = $content -replace '\]\(getting-started\.md\)', '](../Getting-Started/Getting-Started.md)'
    $content = $content -replace '\]\(\.\./\.\./getting-started\.md\)', '](../../Getting-Started/Getting-Started.md)'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesFixed++
        Write-Host "  Fixed: $($file.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Green
    }
}

# Fix links in Getting-Started folder to Index.md (should be ../Index.md)
$gettingStartedFiles = Get-ChildItem -Path "Getting-Started" -Filter *.md

foreach ($file in $gettingStartedFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Fix Index.md references from Getting-Started
    $content = $content -replace '\]\(Index\.md\)', '](../Index.md)'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesFixed++
        Write-Host "  Fixed: Getting-Started\$($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nLink fixing complete!" -ForegroundColor Green
Write-Host "Files updated: $filesFixed" -ForegroundColor Cyan
Write-Host "`nNote: Some specialized links may need manual review." -ForegroundColor Yellow
Write-Host "Check for:" -ForegroundColor Yellow
Write-Host "  - Cross-folder references" -ForegroundColor White
Write-Host "  - Deeply nested paths (../../..)" -ForegroundColor White
Write-Host "  - References to moved files" -ForegroundColor White
