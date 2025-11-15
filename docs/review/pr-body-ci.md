PR Title: CI/E2E: Stabilize Admin Node tests, add SafetyService, and enforce reproducible CI

Overview
- This PR addresses stability issues surrounding the Admin Node e2e tests and CI reproducibility. Key changes include:
  - Pin Playwright to a stable version used locally to reduce test flakiness.
  - Enforce deterministic installs using `npm ci` with a CI lockfile validation step.
  - Update seed scripts to compute and write the real `genesisSha256` to `governance-timeline.jsonl` in the repository root and `admin-node` copy so the observability endpoints match seeded data.
  - Add `SafetyService` (safe mode + `POST /v1/admin/shutdown`) to protect mutating endpoints under maintenance.
  - Improve `AnchorService` to honor verification state and multiple txSignature fields reported by observability.
  - Harden Playwright e2e tests with proper auth headers, robust selectors, clipboard & permission handling, and serial execution to avoid global state conflicts.

Files/areas changed (high-level):
- `admin-node/` — safety service, seed script updates, services, routes, unit/integration tests, e2e tests
- `.github/workflows/admin-node-integration.yml` — enforced `npm ci`, Playwright validation, seed timeline step, serial e2e tests (`--workers=1`)
- `docs/review/` — added PR checklist & PR helper docs

Why this matters
- CI stability and reproducibility are essential for developer velocity and rapid PR iteration. Improving seeding, test determinism, and adding safe mode protect both tests and production behavior.

Validation steps and reviewer tips
- Use `docs/review/pr-checklist-ci.md` as your main reference for validation steps.
- Quick commands:
  - Run the local checklist helper script:
    - PowerShell: `./scripts/run-pr-checklist.ps1`
    - Bash: `./scripts/run-pr-checklist.sh`
  - Or run the commands manually:
    ```powershell
    cd admin-node
    npm ci
    git diff --exit-code package-lock.json || (echo "Lockfile changed"; exit 1)
    npx playwright install --with-deps
    npm test
    npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1
    ```

Extra notes
- The Playwright config used in e2e is `e2e/playwright.config.ts` — we run it hitting the Admin Node environment.
- Run Playwright in serial (`--workers=1`) while we have global state toggles, e.g., shutdown tests.

References
- PR Checklist: `docs/review/pr-checklist-ci.md`
- Changelog: `docs/changelog/changelog-112025.md`