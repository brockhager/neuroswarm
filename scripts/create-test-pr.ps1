param(
  [string]$branchName = 'test/validate-packaging-wiki',
  [string]$prTitle = 'Test: validate packaging & wiki',
  [string]$prBody = 'This PR triggers packaging and wiki validate workflows as a test.',
  [string]$baseBranch = 'master'
)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Error 'git not found in PATH'; exit 1 }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { Write-Error 'gh (GitHub CLI) not found in PATH'; exit 1 }

git status --porcelain
if ($LASTEXITCODE -ne 0) { Write-Error 'Not a git repo or git unavailable'; exit 1 }

git checkout -b $branchName
git add -A
git commit -m "$prTitle" -q
git push -u origin $branchName

gh pr create --title "$prTitle" --body "$prBody" --base $baseBranch

Write-Host "Created PR from branch $branchName"
