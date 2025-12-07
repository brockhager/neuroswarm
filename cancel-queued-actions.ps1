<#
.SYNOPSIS
  Cancel queued GitHub Actions runs for this repository.

.DESCRIPTION
  Prefer the GitHub CLI 'gh' (must be authenticated). If not available, fall back to REST API
  via `GITHUB_TOKEN` environment variable. Displays queued runs, cancels them on confirmation,
  prints a summary and pauses at the end so the window stays open.

.PARAMETER Owner
  The GitHub owner/org (default: brockhager)

.PARAMETER Repo
  The repository name (default: neuroswarm)

.PARAMETER DryRun
  Switch: list queued runs but do not cancel.

.PARAMETER Auto
  Switch: non-interactive cancellation (equivalent to confirming yes).

Usage:
  # Dry-run (inspect queued runs)
  .\cancel-queued-actions.ps1 -Owner brockhager -Repo neuroswarm -DryRun

  # Interactive cancellation
  .\cancel-queued-actions.ps1

  # Non-interactive cancel
  .\cancel-queued-actions.ps1 -Auto

Security:
  If using REST fallback, set GITHUB_TOKEN in your session and do not paste it into chat.
  Example (PowerShell): $env:GITHUB_TOKEN = 'ghp_xxx'  # remove when done
#>

param(
  [string]$Owner = 'brockhager',
  [string]$Repo  = 'neuroswarm',
  [switch]$DryRun,
  [switch]$Auto
)

function PauseExit([int]$Code=0) {
  Write-Host "\nPress Enter to close..." -ForegroundColor Cyan
  Read-Host | Out-Null
  if ($script:transcriptStarted) { try { Stop-Transcript } catch {} }
  exit $Code
}

# initialize transcript/logging so we keep a persistent copy of output
$logPath = Join-Path -Path (Split-Path -Parent $MyInvocation.MyCommand.Path) -ChildPath 'cancel-queued-actions.log'
try { Start-Transcript -Path $logPath -Append -ErrorAction SilentlyContinue; $script:transcriptStarted = $true } catch { $script:transcriptStarted = $false }

Write-Host "Repository: $Owner/$Repo" -ForegroundColor Green

# counters
$total = 0
$cancelled = 0
$failed = 0

try {
  # Prefer gh if available
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    Write-Host "Using GitHub CLI (gh)." -ForegroundColor Cyan
    try {
      # 'htmlUrl' isn't a field from `gh run list`; use 'url' instead which is returned by the CLI
      $json = gh run list --repo "$Owner/$Repo" --limit 500 --json databaseId,status,name,url,createdAt 2>&1
      if ($LASTEXITCODE -ne 0) {
        Write-Error "gh run list failed: $json"
        throw "gh-list-failed"
      }
      $runs = $json | ConvertFrom-Json
    } catch {
      Write-Error "gh run list failed or returned invalid JSON. Falling back to REST if GITHUB_TOKEN is available. Error: $_"
      $gh = $null
    }
  }

  if ($gh) {
    $queued = $runs | Where-Object { $_.status -eq 'queued' }
    $total = $queued.Count

    if ($total -eq 0) {
      Write-Host "No queued runs found." -ForegroundColor Yellow
      PauseExit 0
    }

    Write-Host "Found $total queued run(s):" -ForegroundColor Yellow
    $queued | ForEach-Object { Write-Host " - ID=$($_.databaseId)  Name='$($_.name)'  Url:$($_.url)  Created:$($_.createdAt)" }

    if ($DryRun) {
      Write-Host "Dry-run requested; not cancelling any runs." -ForegroundColor Cyan
      PauseExit 0
    }

    if (-not $Auto) {
      $confirm = Read-Host "Cancel ALL $total queued run(s)? Type 'yes' to continue"
      if ($confirm -ne 'yes') { Write-Host 'Aborted by user.' -ForegroundColor Yellow; PauseExit 0 }
    }

    foreach ($r in $queued) {
      $id = $r.databaseId
      Write-Host "Cancelling run $id ..." -NoNewline
      $out = gh run cancel $id --repo "$Owner/$Repo" 2>&1
      if ($LASTEXITCODE -ne 0) {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  $out" -ForegroundColor Red
        $failed++
      } else {
        Write-Host " OK" -ForegroundColor Green
        $cancelled++
      }
    }

    Write-Host "\nSummary:" -ForegroundColor Cyan
    Write-Host "  Queued runs found: $total" -ForegroundColor Cyan
    Write-Host "  Cancelled: $cancelled  Failed: $failed" -ForegroundColor Cyan
    PauseExit 0
  }

  # Fallback: use REST API and GITHUB_TOKEN
  if (-not $env:GITHUB_TOKEN) {
    Write-Error "Neither 'gh' succeeded nor is GITHUB_TOKEN set. Authenticate with gh (gh auth login) or set GITHUB_TOKEN in your session."
    PauseExit 1
  }

  Write-Host "Using REST API fallback with GITHUB_TOKEN environment variable." -ForegroundColor Cyan

  $headers = @{ Authorization = "Bearer $($env:GITHUB_TOKEN)"; Accept = 'application/vnd.github.v3+json' }
  $apiUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runs?status=queued&per_page=100"
  Write-Host "Fetching queued runs via REST API..." -ForegroundColor Cyan
  try {
    $resp = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method Get -ErrorAction Stop
  } catch {
    # Provide a clearer guidance when the token is unauthorized
    if ($_.Exception.Response -ne $null -and $_.Exception.Response.StatusCode.Value__ -eq 401) {
      Write-Error 'REST API returned 401 Unauthorized. Your GITHUB_TOKEN is missing or invalid; try: gh auth login or set a valid GITHUB_TOKEN in this session.'
      PauseExit 1
    }
    throw
  }
  $queuedRuns = $resp.workflow_runs | Where-Object { $_.status -eq 'queued' }
  $total = $queuedRuns.Count

  if ($total -eq 0) { Write-Host 'No queued runs found.' -ForegroundColor Yellow; PauseExit 0 }

  Write-Host "Found $total queued run(s):" -ForegroundColor Yellow
  $queuedRuns | ForEach-Object { Write-Host " - ID=$($_.id) Name='$($_.name)' Url:$($_.html_url) Created:$($_.created_at)" }

  if ($DryRun) { Write-Host 'Dry-run requested; not cancelling.' -ForegroundColor Cyan; PauseExit 0 }

  if (-not $Auto) {
    $confirm = Read-Host "Cancel ALL $total queued run(s)? Type 'yes' to continue"
    if ($confirm -ne 'yes') { Write-Host 'Aborted by user.' -ForegroundColor Yellow; PauseExit 0 }
  }

  foreach ($r in $queuedRuns) {
    $id = $r.id
    Write-Host "Cancelling run $id ..." -NoNewline
    try {
      $cancelUrl = "https://api.github.com/repos/$Owner/$Repo/actions/runs/$id/cancel"
      Invoke-RestMethod -Uri $cancelUrl -Headers $headers -Method Post -ErrorAction Stop | Out-Null
      Write-Host ' OK' -ForegroundColor Green
      $cancelled++
    } catch {
      if ($_.Exception.Response -ne $null) {
        $status = $_.Exception.Response.StatusCode.Value__
        Write-Host " FAILED (HTTP $status)" -ForegroundColor Red
        if ($status -eq 401) {
          Write-Host "  Hint: 401 Unauthorized - check GITHUB_TOKEN and permissions or 'gh auth login'" -ForegroundColor Yellow
        }
      } else {
        Write-Host " FAILED: $_" -ForegroundColor Red
      }
      $failed++
    }
  }

  Write-Host "\nSummary:" -ForegroundColor Cyan
  Write-Host "  Queued runs found: $total" -ForegroundColor Cyan
  Write-Host "  Cancelled: $cancelled  Failed: $failed" -ForegroundColor Cyan
  PauseExit 0

} catch {
  Write-Error "Unexpected error: $_"
  PauseExit 2
}
