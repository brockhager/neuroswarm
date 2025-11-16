#!/usr/bin/env bash
# Bash script to validate PR checklist.
# Ensure you have permissions to run this script (chmod +x).
set -euo pipefail

echo "Starting PR checklist validation (bash)"

# Determine script location and admin-node root
SCRIPT_DIR=$(dirname "$(realpath "$0")")
ADMIN_ROOT=$(dirname "$SCRIPT_DIR")
cd "$ADMIN_ROOT"

echo "Running pnpm install for admin-node (frozen lockfile)"
npm install -g pnpm@8
pnpm -C . install --frozen-lockfile

echo "Checking lockfile for uncommitted changes"
if ! git diff --name-only --exit-code pnpm-lock.yaml; then
  echo "pnpm-lock.yaml has changed. Run 'pnpm -C . install --frozen-lockfile' locally and commit the updated lockfile or revert package changes."
  exit 1
fi

echo "Installing Playwright browsers"
npx playwright install --with-deps

echo "Run unit & integration tests"
npm test

echo "Run Playwright e2e tests in serial and produce JSON results"
mkdir -p playwright-results
set +e
npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1 --reporter=json > playwright-results/results.json
E2E_EXIT=$?
set -e

echo "Compute Playwright JSON summary"
if [ -f "playwright-results/results.json" ]; then
  node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('playwright-results/results.json')); let passed=0, failed=0, skipped=0; const walk=(s)=>{ if(s.tests){ s.tests.forEach(t=>{ if(t.status==='passed') passed++; else if(t.status==='failed') failed++; else if(t.status==='skipped') skipped++; }) } if(s.suites) s.suites.forEach(walk); }; walk(r); fs.writeFileSync('playwright-results/summary.json', JSON.stringify({passed,failed,skipped})); console.log(JSON.stringify({passed,failed,skipped}));"
fi
exit ${E2E_EXIT}

echo "PR checklist validation completed successfully"
echo "Generate Playwright HTML report (if tests produced results)"
if [ -d "playwright-report" ]; then
  echo "playwright-report already exists";
else
  echo "Attempting to generate Playwright HTML report"
  npx playwright show-report || true
fi
