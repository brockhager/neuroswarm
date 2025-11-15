#!/usr/bin/env bash
# Bash script to validate PR checklist.
# Ensure you have permissions to run this script (chmod +x).
set -euo pipefail

echo "Starting PR checklist validation (bash)"

# Determine script location and admin-node root
SCRIPT_DIR=$(dirname "$(realpath "$0")")
ADMIN_ROOT=$(dirname "$SCRIPT_DIR")
cd "$ADMIN_ROOT"

echo "Running npm ci"
npm ci

echo "Checking lockfile for uncommitted changes"
if ! git diff --name-only --exit-code package-lock.json; then
  echo "package-lock.json has changed. Run 'npm ci' locally and commit the updated lockfile or revert package changes."
  exit 1
fi

echo "Installing Playwright browsers"
npx playwright install --with-deps

echo "Run unit & integration tests"
npm test

echo "Run Playwright e2e tests in serial"
npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1

echo "PR checklist validation completed successfully"
