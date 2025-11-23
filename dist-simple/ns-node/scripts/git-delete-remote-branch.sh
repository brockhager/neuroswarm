#!/usr/bin/env bash
ROOT=${1:-$(pwd)}
BRANCH=${2:-}
DELETE_LOCAL=${3:-false}
if [ -z "$BRANCH" ]; then echo "Usage: $0 <repo-root> <branch> [delete-local]"; exit 1; fi
if [ ! -d "$ROOT/.git" ]; then echo "$ROOT is not a git repo"; exit 1; fi
echo "Checking remote branch origin/$BRANCH in $ROOT"
if git -C "$ROOT" ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
  read -p "Delete origin/$BRANCH from $ROOT? (y/N) " ans
  if [ "$ans" != "y" ]; then echo "Aborted"; exit 0; fi
  git -C "$ROOT" push origin --delete "$BRANCH"
  echo "Deleted remote origin/$BRANCH in $ROOT"
  if [ "$DELETE_LOCAL" = true ]; then
    git -C "$ROOT" branch -D "$BRANCH" || echo "No local branch $BRANCH to delete"
  fi
else
  echo "Remote branch origin/$BRANCH not found in $ROOT"
fi
