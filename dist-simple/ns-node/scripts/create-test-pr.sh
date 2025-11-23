#!/usr/bin/env bash
branchName=${1:-test/validate-packaging-wiki}
prTitle=${2:-'Test: validate packaging & wiki'}
prBody=${3:-'This PR triggers packaging and wiki validate workflows as a test.'}
baseBranch=${4:-master}

if ! command -v git >/dev/null 2>&1; then echo 'Error: git not found'; exit 1; fi
if ! command -v gh >/dev/null 2>&1; then echo 'Error: gh CLI not found'; exit 1; fi

git status --porcelain || (echo 'Not a git repo or git unavailable' && exit 1)

git checkout -b "$branchName"
git add -A
git commit -m "$prTitle" || echo 'No changes to commit'
git push -u origin "$branchName"

gh pr create --title "$prTitle" --body "$prBody" --base "$baseBranch"
echo "Created PR from branch $branchName"
