# NeuroSwarm Story Refinement Validator
# Validates draft stories against the refinement checklist

param(
    [switch]$Checklist,
    [switch]$Validate,
    [string]$StoryId
)

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
}

# Main execution
if ($Checklist) {
    Show-Checklist
} elseif ($Validate) {
    if (-not $StoryId) {
        Write-Error "StoryId parameter is required for validation. Use -StoryId 'PVTI_xxx'"
        exit 1
    }
    Write-Host "🔍 Story Validation Feature Coming Soon..."
    Write-Host "Story ID: $StoryId"
} else {
    Write-Host "NeuroSwarm Story Refinement Validator"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\validate-story.ps1 -Checklist                    # Show refinement checklist"
    Write-Host "  .\validate-story.ps1 -Validate -StoryId 'PVTI_xxx' # Validate specific story"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\validate-story.ps1 -Checklist"
    Write-Host "  .\validate-story.ps1 -Validate -StoryId 'PVTI_lAHOAIdS4c4BH_bszghJQLQ'"
}