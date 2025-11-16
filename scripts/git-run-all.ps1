param(
  [string]$Root = $(Get-Location),
  [switch]$DryRun,
  [switch]$Pull,
  [int]$Depth = 2,
  [string[]]$ExcludeDirs = @('node_modules','dist','tmp','.cache')
)
try {
  $searchPath = Resolve-Path -Path $Root
} catch {
  Write-Error "Invalid root path: $Root"; exit 1
}
Write-Host "Searching for git repos under $searchPath (max depth: $Depth)"
$repos = @()
try {
  $children = Get-ChildItem -Path $searchPath -Directory -Force -ErrorAction SilentlyContinue
  foreach ($c in $children) {
    if ($ExcludeDirs -contains $c.Name) { continue }
    $gitDir = Join-Path $c.FullName '.git'
    if (Test-Path $gitDir) { $repos += $c }
  }
  if ($repos.Count -eq 0 -and $Depth -gt 1) {
    $repos = Get-ChildItem -Path $searchPath -Directory -Recurse -Depth $Depth -Force -ErrorAction SilentlyContinue | Where-Object { 
      if ($ExcludeDirs -contains $_.Name) { return $false } ; Test-Path (Join-Path $_.FullName '.git') }
  }
} catch {
  Write-Warning "Search failed: $_"; exit 1
}
if ($repos.Count -eq 0) {
  Write-Host "No git repositories found under $searchPath"
  exit 0
}

foreach ($r in $repos) {
  $repo = $r.FullName
  Write-Host "`n== Repo: $repo =="
  Write-Host "git -C $repo fetch --all --prune"
  Write-Host "git -C $repo status -sb"
  Write-Host "git -C $repo rev-parse --abbrev-ref HEAD"
  Write-Host "git -C $repo log -1 --oneline"
  Write-Host "git -C $repo remote -v"
  Write-Host "git -C $repo branch -r"
  if ($DryRun) {
    Write-Host "DRY RUN: not executing commands for $repo"
  } else {
    git -C $repo fetch --all --prune
    git -C $repo status -sb
    git -C $repo rev-parse --abbrev-ref HEAD
    git -C $repo log -1 --oneline
    git -C $repo remote -v
    git -C $repo branch -r
    if ($Pull) {
      try { Start-Job -ScriptBlock { git -C "$args[0]" pull --ff-only } -ArgumentList $repo | Wait-Job -Timeout 30 | Out-Null } catch { Write-Warning "Pull failed or timed out for $repo" }
    }
  }

}

Write-Host "`nDone. Found $($repos.Count) repositories."
