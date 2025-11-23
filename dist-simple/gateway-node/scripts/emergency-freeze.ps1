# Emergency Freeze Script for NeuroSwarm Security
# This script implements emergency security measures to protect the project

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("freeze", "unfreeze", "status")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Reason,

    [Parameter(Mandatory=$false)]
    [int]$DurationHours = 72
)

# Configuration
$GitHubOrg = "neuroswarm"  # Replace with actual org name
$Repository = "neuroswarm"
$GitHubToken = $env:GITHUB_TOKEN

# Branch protection settings for emergency freeze
$FreezeProtection = @{
    required_status_checks = @{
        strict = $true
        contexts = @("security-check", "build", "test")
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
        required_approving_review_count = 3
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $true
        dismissal_restrictions = @{}
    }
    restrictions = @{
        users = @("owner", "core-team")
        teams = @("core-team")
        apps = @()
    }
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $true
}

# Normal branch protection settings
$NormalProtection = @{
    required_status_checks = @{
        strict = $true
        contexts = @("build", "test")
    }
    enforce_admins = $false
    required_pull_request_reviews = @{
        required_approving_review_count = 2
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $true
        dismissal_restrictions = @{}
    }
    restrictions = $null
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
}

function Get-BranchProtection {
    $url = "https://api.github.com/repos/$GitHubOrg/$Repository/branches/main/protection"
    try {
        $response = Invoke-RestMethod -Uri $url -Headers @{
            "Authorization" = "Bearer $GitHubToken"
            "Accept" = "application/vnd.github+json"
        }
        return $response
    }
    catch {
        Write-Warning "Failed to get branch protection: $($_.Exception.Message)"
        return $null
    }
}

function Set-BranchProtection {
    param([hashtable]$ProtectionSettings)

    $url = "https://api.github.com/repos/$GitHubOrg/$Repository/branches/main/protection"
    $body = $ProtectionSettings | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri $url -Method Put -Headers @{
            "Authorization" = "Bearer $GitHubToken"
            "Accept" = "application/vnd.github+json"
        } -Body $body -ContentType "application/json"

        Write-Host "✅ Branch protection updated successfully - URL: $($response.url)"
        return $true
    }
    catch {
        Write-Error "Failed to update branch protection: $($_.Exception.Message)"
        return $false
    }
}

function Write-EmergencyLog {
    param([string]$Action, [string]$Reason)

    $logEntry = @{
        timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
        action = $Action
        reason = $Reason
        user = $env:USERNAME
        repository = "$GitHubOrg/$Repository"
    }

    $logFile = Join-Path $PSScriptRoot "emergency_log.jsonl"
    $logEntry | ConvertTo-Json -Compress | Out-File -FilePath $logFile -Append -Encoding UTF8

    Write-Host "📝 Emergency action logged to $logFile"
}

function Send-Notification {
    param([string]$Message)

    # Send notification to security team (implement based on your notification system)
    Write-Host "🚨 SECURITY ALERT: $Message"

    # Example: Send to Slack, Discord, or email
    # This would need to be implemented based on your notification preferences
}

# Main execution logic
switch ($Action) {
    "freeze" {
        if (-not $Reason) {
            Write-Error "Reason is required for freeze action"
            exit 1
        }

        Write-Host "🔒 Initiating emergency freeze..."
        Write-Host "Reason: $Reason"
        Write-Host "Duration: $DurationHours hours"

        # Apply emergency branch protection
        if (Set-BranchProtection -ProtectionSettings $FreezeProtection) {
            Write-EmergencyLog -Action "freeze" -Reason $Reason
            Send-Notification -Message "Emergency freeze activated: $Reason"

            # Schedule unfreeze if duration specified
            if ($DurationHours -gt 0) {
                $unfreezeTime = (Get-Date).AddHours($DurationHours)
                Write-Host "⏰ Freeze will automatically lift at: $unfreezeTime"

                # Create a scheduled task to unfreeze (Windows Task Scheduler)
                $taskName = "NeuroSwarm_Emergency_Unfreeze"
                $taskAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"$PSCommandPath`" -Action unfreeze -Reason `"Automatic unfreeze after $DurationHours hours`""
                $taskTrigger = New-ScheduledTaskTrigger -Once -At $unfreezeTime
                Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -User $env:USERNAME -RunLevel Highest
            }
        }
    }

    "unfreeze" {
        Write-Host "🔓 Lifting emergency freeze..."

        if (Set-BranchProtection -ProtectionSettings $NormalProtection) {
            Write-EmergencyLog -Action "unfreeze" -Reason $Reason
            Send-Notification -Message "Emergency freeze lifted"

            # Remove scheduled task if it exists
            try {
                Unregister-ScheduledTask -TaskName "NeuroSwarm_Emergency_Unfreeze" -Confirm:$false
                Write-Host "⏰ Removed scheduled unfreeze task"
            }
            catch {
                # Task might not exist, ignore
            }
        }
    }

    "status" {
        Write-Host "📊 Checking emergency freeze status..."

        $protection = Get-BranchProtection
        if ($protection) {
            $isFrozen = $protection.restrictions -and $protection.restrictions.users.Count -gt 0

            if ($isFrozen) {
                Write-Host "🔒 EMERGENCY FREEZE ACTIVE"
                Write-Host "Restricted users: $($protection.restrictions.users -join ', ')"
                Write-Host "Required approvals: $($protection.required_pull_request_reviews.required_approving_review_count)"
            }
            else {
                Write-Host "🔓 Normal operation"
                Write-Host "Required approvals: $($protection.required_pull_request_reviews.required_approving_review_count)"
            }
        }
        else {
            Write-Host "❌ Unable to retrieve branch protection status"
        }
    }
}

Write-Host "✅ Emergency script completed"