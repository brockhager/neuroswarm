<#
.SYNOPSIS
  Cancel all queued GitHub Actions runs for this repository using the GitHub CLI (gh).

.DESCRIPTION
  This script lists workflow runs for the specified repository and cancels those with status 'queued'.
  - Requires the GitHub CLI (gh) to be installed and authenticated (gh auth login)
  - You can run this locally or on a trusted CI machine with repo access

.USAGE
  # interactive (confirm cancellations)
  ./cancel-queued-actions.ps1 -Owner "brockhager" -Repo "neuroswarm" -DryRun

  # actually cancel queued runs
  ./cancel-queued-actions.ps1 -Owner "brockhager" -Repo "neuroswarm"

.NOTES
  - This script intentionally requires confirmation to proceed unless you pass -AutoYes.
  - Gh CLI will need sufficient permissions to cancel runs on the target repo.
#>

param(
    [string]
    $Owner = 'brockhager',

    [string]
    $Repo = 'neuroswarm',

    [switch]
    $DryRun,

    [switch]
    $AutoYes
)

function Ensure-GhInstalled {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Error "The 'gh' CLI is required. Install from https://cli.github.com/ and run 'gh auth login'"
        exit 2
    }
}

Ensure-GhInstalled

$repoSpec = "$Owner/$Repo"
Write-Host "Listing workflow runs for repo: $repoSpec"

# Request up to 500 recent runs (adjust limit if needed). The gh CLI will paginate internally.
$json = gh run list --repo $repoSpec --limit 500 --json id,status,name,htmlUrl,createdAt -q '.'

if (-not $json) {
    Write-Host "No run data returned from 'gh run list'. Is the repo correct and is gh authenticated?"
    exit 0
}

$runs = $json | ConvertFrom-Json
$queued = $runs | Where-Object { $_.status -eq 'queued' }

if (-not $queued) {
    Write-Host "No queued runs found for $repoSpec. Nothing to cancel."
    exit 0
}

Write-Host "Found $($queued.Count) queued run(s):" -ForegroundColor Yellow
$queued | ForEach-Object { Write-Host " - $($_.id)  $($_.name)  $($_.createdAt)  $($_.htmlUrl)" }

if ($DryRun) {
    Write-Host "Dry run: no cancellations performed." -ForegroundColor Cyan
    exit 0
}

if (-not $AutoYes) {
    $resp = Read-Host "Cancel all $($queued.Count) queued runs? Type 'yes' to continue"
    if ($resp -ne 'yes') { Write-Host "Cancelled by user; no runs affected."; exit 0 }
}

$failures = @()
foreach ($r in $queued) {
    try {
        Write-Host "Cancelling run $($r.id) ($($r.name))..." -NoNewline
        gh run cancel $r.id --repo $repoSpec
        Write-Host " done" -ForegroundColor Green
    }
    catch {
        $failures += $r
        Write-Host " failed: $_" -ForegroundColor Red
    }
}

if ($failures.Count -gt 0) {
    Write-Error "Failed to cancel $($failures.Count) run(s). See messages above."
    exit 1
}

Write-Host "All queued runs cancelled successfully." -ForegroundColor Green
