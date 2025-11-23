# NeuroSwarm Story Refinement Validator
# Validates draft stories against the refinement checklist

param(
    [Parameter(Mandatory=$true)]
    [string]$StoryId,

    [switch]$Checklist,
    [switch]$Validate,
    [switch]$Report
)

$projectId = 3
$owner = "brockhager"

function Get-StoryDetails {
    param([string]$storyId)

    try {
        $items = gh project item-list $projectId --owner $owner --format json | ConvertFrom-Json
        $story = $items.items | Where-Object { $_.id -eq $storyId }

        if (-not $story) {
            Write-Error "Story with ID '$storyId' not found"
            return $null
        }

        # Get full item details
        $itemDetails = gh project item-edit --project-id PVT_kwHOAIdS4c4BH_bs --id $storyId --format json 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $itemDetails | ConvertFrom-Json
        }

        return $story
    }
    catch {
        Write-Error "Failed to get story details: $_"
        return $null
    }
}

function Test-RefinementCriteria {
    param([object]$story)

    $results = @{
        Passed = @()
        Failed = @()
        Warnings = @()
        Score = 0
        TotalCriteria = 6
    }

    $title = $story.title
    $body = $story.content.body

    # 1. Clear Outcome
    if ($title -match "\[.*\].*" -and $body -match "(outcome|deliverable|result)" -and $body -match "(measure|metric|validate)") {
        $results.Passed += "Clear Outcome"
        $results.Score++
    } else {
        $results.Failed += "Clear Outcome - Missing specific deliverable or success metrics"
    }

    # 2. Acceptance Criteria
    if ($body -match "(acceptance|given.*when.*then|criteria)" -and $body -match "(requirement|must|should)") {
        $results.Passed += "Acceptance Criteria"
        $results.Score++
    } else {
        $results.Failed += "Acceptance Criteria - Missing acceptance criteria or requirements"
    }

    # 3. Subsystem Classification
    $subsystemLabels = @("shared-contracts", "on-chain-core", "services-layer", "web-node", "networking", "security", "governance", "website")
    $hasSubsystemLabel = $subsystemLabels | Where-Object { $title -match $_ -or $body -match $_ }

    if ($hasSubsystemLabel) {
        $results.Passed += "Subsystem Classification"
        $results.Score++
    } else {
        $results.Failed += "Subsystem Classification - Missing section label"
    }

    # 4. Size & Effort Estimation
    if ($body -match "(point|estimate|hour|day|size|effort)" -and $body -match "(\d+)") {
        $results.Passed += "Size & Effort Estimation"
        $results.Score++
    } else {
        $results.Failed += "Size & Effort Estimation - Missing size or time estimate"
    }

    # 5. Priority Assignment
    if ($body -match "(priority|high|medium|low)" -and ($title -match "priority-" -or $body -match "priority-")) {
        $results.Passed += "Priority Assignment"
        $results.Score++
    } else {
        $results.Failed += "Priority Assignment - Missing priority label or assessment"
    }

    # 6. Definition of Ready (Optional)
    if ($body -match "(context|link|doc|design|migration|breaking)" -and -not ($body -match "(tbd|todo|unknown)")) {
        $results.Passed += "Definition of Ready"
        $results.Score++
    } else {
        $results.Warnings += "Definition of Ready - Could benefit from more context or links"
    }

    return $results
}

function Show-Checklist {
    Write-Host "🗂️ NeuroSwarm Story Refinement Checklist" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "✅ REQUIRED CRITERIA:" -ForegroundColor Green
    Write-Host "1. Clear Outcome - Specific deliverable with success metrics"
    Write-Host "2. Acceptance Criteria - Given/When/Then format with requirements"
    Write-Host "3. Subsystem Classification - Appropriate section label applied"
    Write-Host "4. Size & Effort Estimation - Story points and time estimate"
    Write-Host "5. Priority Assignment - priority-high/medium/low label"
    Write-Host ""

    Write-Host "📋 OPTIONAL CRITERIA:" -ForegroundColor Yellow
    Write-Host "6. Definition of Ready - Context, links, migration notes"
    Write-Host ""

    Write-Host "🎯 QUALITY GATES:" -ForegroundColor Red
    Write-Host "- Stories failing required criteria cannot move to Ready"
    Write-Host "- Stories >13 points should be split"
    Write-Host "- All ambiguities must be resolved"
    Write-Host ""

    Write-Host "📊 VALIDATION COMMAND:" -ForegroundColor Magenta
    Write-Host ".\validate-story.ps1 -StoryId 'PVTI_xxx' -Validate"
}

function Show-ValidationReport {
    param([string]$storyId)

    $story = Get-StoryDetails -storyId $storyId
    if (-not $story) { return }

    Write-Host "🔍 Story Refinement Validation Report" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "📋 Story: $($story.title)" -ForegroundColor White
    Write-Host "🆔 ID: $storyId" -ForegroundColor Gray
    Write-Host ""

    $validation = Test-RefinementCriteria -story $story

    Write-Host "✅ PASSED ($($validation.Passed.Count)/$($validation.TotalCriteria)):" -ForegroundColor Green
    foreach ($item in $validation.Passed) {
        Write-Host "  ✓ $item" -ForegroundColor Green
    }
    Write-Host ""

    if ($validation.Failed.Count -gt 0) {
        Write-Host "❌ FAILED ($($validation.Failed.Count)):" -ForegroundColor Red
        foreach ($item in $validation.Failed) {
            Write-Host "  ✗ $item" -ForegroundColor Red
        }
        Write-Host ""
    }

    if ($validation.Warnings.Count -gt 0) {
        Write-Host "⚠️ WARNINGS ($($validation.Warnings.Count)):" -ForegroundColor Yellow
        foreach ($item in $validation.Warnings) {
            Write-Host "  ! $item" -ForegroundColor Yellow
        }
        Write-Host ""
    }

    $percentage = [math]::Round(($validation.Score / $validation.TotalCriteria) * 100)
    Write-Host "📊 REFINEMENT SCORE: $percentage% ($($validation.Score)/$($validation.TotalCriteria))" -ForegroundColor Magenta

    if ($validation.Score -ge 5) {
        Write-Host "🎉 STATUS: READY TO MOVE TO READY COLUMN" -ForegroundColor Green
    } elseif ($validation.Score -ge 3) {
        Write-Host "🔄 STATUS: NEEDS MINOR REFINEMENT" -ForegroundColor Yellow
    } else {
        Write-Host "❌ STATUS: REQUIRES SIGNIFICANT REFINEMENT" -ForegroundColor Red
    }
}

# Main execution
if ($Checklist) {
    Show-Checklist
} elseif ($Validate) {
    if (-not $StoryId) {
        Write-Error "StoryId parameter is required for validation"
        exit 1
    }
    Show-ValidationReport -storyId $StoryId
} elseif ($Report) {
    Write-Host "Bulk validation report feature coming soon..."
} else {
    Write-Host "NeuroSwarm Story Refinement Validator"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\validate-story.ps1 -Checklist                    # Show refinement checklist"
    Write-Host "  .\validate-story.ps1 -StoryId 'PVTI_xxx' -Validate # Validate specific story"
    Write-Host "  .\validate-story.ps1 -Report                       # Bulk validation report"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\validate-story.ps1 -Checklist"
    Write-Host "  .\validate-story.ps1 -StoryId 'PVTI_lAHOAIdS4c4BH_bszghJQLQ' -Validate"
}
