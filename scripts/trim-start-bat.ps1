$path = 'C:\JS\ns\neuroswarm\start-all-nodes.bat'
Write-Host "Checking $path for duplicated @echo off sections..."
$text = Get-Content -Raw -LiteralPath $path
$matches = [regex]::Matches($text,'@echo off')
Write-Host "Found matches: $($matches.Count)"
if ($matches.Count -gt 1) {
    $firstIndex = $text.IndexOf('@echo off')
    $secondIndex = $text.IndexOf('@echo off', $firstIndex + 1)
    if ($secondIndex -ge 0) {
        $new = $text.Substring(0, $secondIndex)
        Set-Content -LiteralPath $path -Value $new -Encoding Ascii
        Write-Host "Trimmed file at position $secondIndex. New length: $((Get-Content -Raw -LiteralPath $path).Length)"
        exit 0
    }
}
Write-Host "No duplicated copy detected or nothing to do." 
exit 0
