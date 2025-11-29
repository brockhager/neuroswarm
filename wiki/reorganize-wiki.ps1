# NeuroSwarm Wiki Reorganization Script
# This script moves markdown files into logical folder categories using git mv to preserve history

Set-Location "c:\JS\ns\neuroswarm\wiki"

Write-Host "Starting wiki reorganization..." -ForegroundColor Cyan

# Getting-Started folder
Write-Host "`nMoving files to Getting-Started/..." -ForegroundColor Yellow
git mv quickstart.md Getting-Started/
git mv overview.md Getting-Started/
git mv Home.md Getting-Started/
git mv Download.md Getting-Started/

# Development folder
Write-Host "Moving files to Development/..." -ForegroundColor Yellow
git mv Developer-Guide.md Development/
git mv pnpm-policy.md Development/
git mv extending-indexer.md Development/

# Technical folder
Write-Host "Moving files to Technical/..." -ForegroundColor Yellow
git mv Ports.md Technical/
git mv Sources.md Technical/
git mv Analytics-and-SDK.md Technical/
git mv sdk.md Technical/
git mv performance-metrics.md Technical/
git mv solana-testnet.md Technical/
git mv ready-queue-specs.md Technical/

# Architecture folder
Write-Host "Moving files to Architecture/..." -ForegroundColor Yellow
git mv master-documentation-outline.md Architecture/
git mv github-structure.md Architecture/

# Data folder (new)
Write-Host "Moving files to Data/..." -ForegroundColor Yellow
git mv Brain-Data-Submission.md Data/
git mv data-submission.md Data/
git mv transparency-record-schema.md Data/

# Security folder
Write-Host "Moving files to Security/..." -ForegroundColor Yellow
git mv SECURITY.md Security/
git mv SECURITY-TRUST.md Security/
git mv Security-Safety-Protocols.md Security/
git mv "Definition of Trusted Data and the Fight Against Misinformation.md" Security/

# Governance folder
Write-Host "Moving files to Governance/..." -ForegroundColor Yellow
git mv badge-incentive-system.md Governance/

# Releases folder
Write-Host "Moving files to Releases/..." -ForegroundColor Yellow
git mv Releases.md Releases/

# Project-Management folder (new)
Write-Host "Moving files to Project-Management/..." -ForegroundColor Yellow
git mv objectives.md Project-Management/
git mv todo.md Project-Management/
git mv roadmap-priorities-template.md Project-Management/
git mv STORY-REFINEMENT-CHECKLIST.md Project-Management/

# Infrastructure folder (new)
Write-Host "Moving files to Infrastructure/..." -ForegroundColor Yellow
git mv neuro-infra-README.md Infrastructure/
git mv neuro-program-README.md Infrastructure/
git mv neuro-runner-README.md Infrastructure/
git mv neuro-services-README.md Infrastructure/
git mv neuro-shared-README.md Infrastructure/
git mv neuro-web-README.md Infrastructure/
git mv neuroswarm-docs-README.md Infrastructure/
git mv DISTRIBUTION.md Infrastructure/

# Documentation folder (new)
Write-Host "Moving files to Documentation/..." -ForegroundColor Yellow
git mv living-documentation.md Documentation/
git mv Maintenance.md Documentation/
git mv SEO-README.md Documentation/
git mv WORDPRESS_AUTOMATION_SYSTEM.md Documentation/
git mv WP_PUBLISHER_README.md Documentation/
git mv WIKI-HOME-PROTECTION.md Documentation/
git mv SYNC-AGENT-README.md Documentation/

# Support folder (new)
Write-Host "Moving files to Support/..." -ForegroundColor Yellow
git mv Troubleshooting.md Support/

# Reference folder (new)
Write-Host "Moving files to Reference/..." -ForegroundColor Yellow
git mv naming.md Reference/
git mv Terminology.md Reference/
git mv TERMS.md Reference/

# Enterprise folder (new)
Write-Host "Moving files to Enterprise/..." -ForegroundColor Yellow
git mv ENTERPRISE-ADOPTION-MATERIALS.md Enterprise/

Write-Host "`nWiki reorganization complete!" -ForegroundColor Green
Write-Host "Total files moved: 48" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Review changes with: git status" -ForegroundColor White
Write-Host "2. Commit with: git commit -m 'docs: reorganize wiki into folders'" -ForegroundColor White
Write-Host "3. Update Index.md with new paths" -ForegroundColor White
