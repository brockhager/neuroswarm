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

function Get-FileSHA256Hash {
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
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.ffffff")
        action = $action
        task = $task
        status = $status
        details = $details
        project_id = $projectId
    }

    $logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Log-GovernanceEvent {
    param(
        [string]$eventType,
        [string]$severity,
        [string]$description,
        [string]$violations = "",
        [string]$remediation = ""
    )

    $governanceEntry = @{
        timestamp = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss.ffffff')
        event_type = $eventType
        severity = $severity
        description = $description
        violations = $violations
        remediation = $remediation
        component = "structural-hygiene"
        governance_action = "monitor"
    }

    $governanceEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Check-StructuralHygiene {
    Write-Host "🔍 Checking structural hygiene..."

    $violations = @()
    $warnings = @()

    # Check for scripts in root directory
    $rootScripts = Get-ChildItem -Path "." -File | Where-Object {
        $_.Extension -in @('.ps1', '.py', '.sh', '.bash')
    }
    if ($rootScripts) {
        $violations += "Scripts found in root directory: $($rootScripts.Name -join ', ')"
    }

    # Check for test files outside tests/ directory
    $testFilesOutsideTests = Get-ChildItem -Path "." -Recurse -File | Where-Object {
        $_.Name -match '\.(test|spec)\.(ts|js|py)$' -and $_.FullName -notmatch '\\tests\\'
    }
    if ($testFilesOutsideTests) {
        $violations += "Test files found outside tests/ directory: $($testFilesOutsideTests.Name -join ', ')"
    }

    # Check for missing script documentation
    if (-not (Test-Path "docs/scripts/README.md")) {
        $warnings += "Script registry missing: docs/scripts/README.md"
    }

    # Check for missing test documentation
    if (-not (Test-Path "docs/tests/README.md")) {
        $warnings += "Test documentation missing: docs/tests/README.md"
    }

    # Check for required directories
    $requiredDirs = @("src/governance", "scripts", "tests", "docs")
    foreach ($dir in $requiredDirs) {
        if (-not (Test-Path $dir)) {
            $violations += "Required directory missing: $dir"
        }
    }

    # Log violations as governance events
    if ($violations.Count -gt 0) {
        Log-GovernanceEvent -eventType "structural_violation" -severity "high" -description "Structural hygiene violations detected" -violations ($violations -join '; ') -remediation "Run hygiene enforcement scripts and update documentation"
        Write-Host "🚨 Structural violations found:" -ForegroundColor Red
        $violations | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }

    if ($warnings.Count -gt 0) {
        Log-GovernanceEvent -eventType "structural_warning" -severity "medium" -description "Structural hygiene warnings detected" -violations ($warnings -join '; ') -remediation "Create missing documentation files"
        Write-Host "⚠️ Structural warnings:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }

    if ($violations.Count -eq 0 -and $warnings.Count -eq 0) {
        Log-GovernanceEvent -eventType "structural_compliance" -severity "info" -description "Structural hygiene check passed" -remediation ""
        Write-Host "✅ Structural hygiene check passed" -ForegroundColor Green
    }

    return $violations.Count -eq 0
}

function Sync-TodoToBoard {
    Write-Host "🔄 Starting sync from $todoFile to GitHub Project board..."

    # Run structural hygiene check as part of sync
    $hygienePassed = Check-StructuralHygiene

    $todoContent = Get-TodoContent
    if (-not $todoContent) {
        Write-Warning "Todo file not found: $todoFile"
        return
    }

    # Parse In Progress tasks
    $inProgressPattern = '(?m)^## In Progress$(.*?)(?=^##|\z)'
    $inProgressMatch = [regex]::Match($todoContent, $inProgressPattern, 'Singleline')

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
    $backlogMatch = [regex]::Match($todoContent, $backlogPattern, 'Singleline')

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

    $lastHash = Get-FileSHA256Hash $todoFile
    $lastHygieneCheck = Get-Date

    while ($true) {
        Start-Sleep -Seconds ($IntervalMinutes * 60)

        # Check structural hygiene every 4 hours
        $hygieneInterval = [TimeSpan]::FromHours(4)
        if ((Get-Date) - $lastHygieneCheck -gt $hygieneInterval) {
            Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Running scheduled structural hygiene check"
            Check-StructuralHygiene
            $lastHygieneCheck = Get-Date
        }

        $currentHash = Get-FileSHA256Hash $todoFile
        if ($currentHash -ne $lastHash) {
            Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - Change detected in $todoFile"
            Sync-TodoToBoard
            $lastHash = $currentHash
        } else {
            $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            Write-Host "$timestamp - No changes detected"
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