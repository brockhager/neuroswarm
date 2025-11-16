param(
  [string]$RepoPath = $(Get-Location),
  [string]$BranchName,
  [switch]$DeleteLocal,
  [switch]$Confirm
)

if (-not $BranchName) { Write-Error 'Please provide a branch name to delete (e.g., update-20251116-local-pr-test)'; exit 1 }
if (-not (Test-Path $RepoPath)) { Write-Error "Repo path not found: $RepoPath"; exit 1 }
if (-not (Test-Path (Join-Path $RepoPath '.git'))) { Write-Error "Not a git repo: $RepoPath"; exit 1 }

$exists = git -C $RepoPath ls-remote --heads origin $BranchName | Out-String
if (-not $exists) { Write-Warning "Remote branch 'origin/$BranchName' not found in $RepoPath"; exit 0 }

Write-Host "Remote branch origin/$BranchName found in $RepoPath"
if (-not $Confirm) { $yes = Read-Host "Delete remote branch origin/$BranchName from $RepoPath? (y/N)"; if ($yes -ne 'y') { Write-Host 'Aborted by user'; exit 0 } }

try {
  git -C $RepoPath push origin --delete $BranchName
  Write-Host "Deleted remote branch origin/$BranchName from $RepoPath"
  if ($DeleteLocal) {
    try { git -C $RepoPath branch -D $BranchName } catch { Write-Warning "Local branch $BranchName does not exist or deletion failed" }
  }
} catch {
  Write-Error "Failed to delete remote branch: $_"; exit 1
}
