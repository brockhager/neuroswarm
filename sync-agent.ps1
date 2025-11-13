# NeuroSwarm Kanban Sync Agent
# Monitors docs/todo.md for changes and synchronizes with GitHub Project board

param(
    [switch]$Monitor,
    [switch]$Sync,
    [int]$IntervalMinutes = 60
)

$projectId = 3
$owner = "brockhager"
$todoFile = "docs/todo.md"
$logFile = "wp_publish_log.jsonl"

function Get-TodoContent {
    if (Test-Path $todoFile) {
        return Get-Content $todoFile -Raw
    }
    return $null
}

function Get-FileHash {
    param([string]$filePath)
    if (Test-Path $filePath) {
        return Get-FileHash $filePath -Algorithm SHA256 | Select-Object -ExpandProperty Hash
    }
    return $null
}

function Log-Action {
    param(
        [string]$action,
        [string]$task,
        [string]$status,
        [string]$details = ""
    )

    $logEntry = @{
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.ffffff"
        action = $action
        task = $task
        status = $status
        details = $details
        project_id = $projectId
    }

    $logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Sync-TodoToBoard {
    Write-Host "🔄 Starting sync from $todoFile to GitHub Project board..."

    $todoContent = Get-TodoContent
    if (-not $todoContent) {
        Write-Warning "Todo file not found: $todoFile"
        return
    }

    # Parse In Progress tasks
    $inProgressPattern = '(?m)^## In Progress$(.*?)(?=^##|\z)'
    $inProgressMatch = [regex]::Match($todoContent, $inProgressPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

    if ($inProgressMatch.Success) {
        $inProgressTasks = [regex]::Matches($inProgressMatch.Groups[1].Value, '(?m)^- \[ \] (.+)$')
        foreach ($task in $inProgressTasks) {
            $taskTitle = $task.Groups[1].Value.Trim()
            Write-Host "📋 Processing In Progress: $taskTitle"

            # Check if card already exists
            $existingCards = gh project item-list $projectId --owner $owner --format json | ConvertFrom-Json
            $existingCard = $existingCards.items | Where-Object { $_.title -eq $taskTitle }

            if (-not $existingCard) {
                # Create new card
                gh project item-create $projectId --owner $owner --title $taskTitle --body "Auto-synced from docs/todo.md on $(Get-Date -Format 'yyyy-MM-dd'). Status: In Progress."
                Log-Action -action "auto_sync" -task $taskTitle -status "In progress" -details "Created new In Progress card"
                Write-Host "✅ Created: $taskTitle"
            }
        }
    }

    # Parse Backlog tasks
    $backlogPattern = '(?m)^## Backlog \(to be done\)$(.*?)(?=^## Done|\z)'
    $backlogMatch = [regex]::Match($todoContent, $backlogPattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

    if ($backlogMatch.Success) {
        $backlogTasks = [regex]::Matches($backlogMatch.Groups[1].Value, '(?m)^- \[ \] (.+)$')
        foreach ($task in $backlogTasks) {
            $taskTitle = $task.Groups[1].Value.Trim()
            Write-Host "📋 Processing Backlog: $taskTitle"

            # Check if card already exists
            $existingCards = gh project item-list $projectId --owner $owner --format json | ConvertFrom-Json
            $existingCard = $existingCards.items | Where-Object { $_.title -eq $taskTitle }

            if (-not $existingCard) {
                # Create new card
                gh project item-create $projectId --owner $owner --title $taskTitle --body "Auto-synced from docs/todo.md on $(Get-Date -Format 'yyyy-MM-dd'). Status: Backlog."
                Log-Action -action "auto_sync" -task $taskTitle -status "Backlog" -details "Created new Backlog card"
                Write-Host "✅ Created: $taskTitle"
            }
        }
    }

    Write-Host "✅ Sync complete!"
}

function Start-Monitoring {
    Write-Host "👀 Starting continuous monitoring of $todoFile..."
    Write-Host "⏰ Check interval: $IntervalMinutes minutes"
    Write-Host "Press Ctrl+C to stop monitoring"

    $lastHash = Get-FileHash $todoFile

    while ($true) {
        Start-Sleep -Seconds ($IntervalMinutes * 60)

        $currentHash = Get-FileHash $todoFile
        if ($currentHash -ne $lastHash) {
            Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Change detected in $todoFile"
            Sync-TodoToBoard
            $lastHash = $currentHash
        } else {
            Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - No changes detected"
        }
    }
}

# Main execution
if ($Monitor) {
    Start-Monitoring
} elseif ($Sync) {
    Sync-TodoToBoard
} else {
    Write-Host "NeuroSwarm Kanban Sync Agent"
    Write-Host "Usage:"
    Write-Host "  .\sync-agent.ps1 -Sync              # Run one-time sync"
    Write-Host "  .\sync-agent.ps1 -Monitor           # Start continuous monitoring"
    Write-Host "  .\sync-agent.ps1 -Monitor -IntervalMinutes 30  # Monitor with custom interval"
}