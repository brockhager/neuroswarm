#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR=${1:-$(pwd)}
DRY=${2:-true}
PULL=${3:-false}
MAX_DEPTH=${4:-2}
EXCLUDE_DIRS=(node_modules dist tmp .cache)

echo "Scanning for git repos under ${ROOT_DIR}"
mapfile -t REPOS < <(find "${ROOT_DIR}" -maxdepth ${MAX_DEPTH} -type d -name .git -prune -print 2>/dev/null | sed 's/\.git$//')
if [ ${#REPOS[@]} -eq 0 ]; then
  echo "No git repositories found under ${ROOT_DIR}";
  exit 0
fi

for repo in "${REPOS[@]}"; do
  skip=false
  for ex in "${EXCLUDE_DIRS[@]}"; do
    if echo "${repo}" | grep -q "${ex}"; then skip=true; break; fi
  done
  if [ "$skip" = true ]; then continue; fi
  echo "\n== Repo: ${repo} =="
  echo "git -C ${repo} fetch --all --prune"
  echo "git -C ${repo} status -sb"
  echo "git -C ${repo} rev-parse --abbrev-ref HEAD"
  echo "git -C ${repo} log -1 --oneline"
  echo "git -C ${repo} remote -v"
  echo "git -C ${repo} branch -r"
  if [ "$DRY" = true ]; then
    echo "DRY RUN: not executing commands for ${repo}"
  else
    git -C "${repo}" fetch --all --prune
    git -C "${repo}" status -sb
    git -C "${repo}" rev-parse --abbrev-ref HEAD
    git -C "${repo}" log -1 --oneline
    git -C "${repo}" remote -v
    git -C "${repo}" branch -r
    if [ "$PULL" = true ]; then
      # Only do a fast-forward safe pull
      git -C "${repo}" pull --ff-only || echo "Pull failed for ${repo}, skipping"
    fi
  fi
done

echo "\nDone. Found ${#REPOS[@]} repositories."
