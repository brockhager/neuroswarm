Param(
  [string]$Source = "website/kb",
  [string]$Out = "tmp/neuroswarm-wiki-export",
  [string]$WikiRepo = $null,
  [switch]$Push = $false
)

Write-Host "Migrating KB from $Source to $Out"
if ($WikiRepo) { Write-Host "Wiki repo: $WikiRepo" }

$nodeArgs = @("scripts/migrate-kb-to-wiki.js", "--src=$Source", "--out=$Out")
if ($WikiRepo) { $nodeArgs += "--wiki-repo=$WikiRepo" }
if ($Push) { $nodeArgs += "--push" }

node $nodeArgs -ErrorAction Stop

Write-Host "Done. Exported to $Out" -ForegroundColor Green
