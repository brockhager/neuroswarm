# CI/CD & Testing

Overview

This page documents the project's CI/CD and Playwright e2e testing strategy and includes a checklist for maintainers and reviewers.

Key pieces
- GitHub Actions workflows:
  - `admin-node-integration.yml`: unit, integration, and Playwright e2e tests.
  - `pr-checklist.yml`: PR-level validation that runs `npm ci`, unit tests and a PR e2e smoke run
- Lockfile enforcement: CI uses `npm ci` and validates `package-lock.json` to prevent drift
- Playwright: pinned version and local/CI scripts to run E2E in serial mode (`--workers=1`) while tests rely on global state like `shutdown`.

How-to
1. Run the full integration job locally using the helper scripts in `admin-node/scripts/run-pr-checklist.*`.
2. If adding a new E2E test, ensure to:
   - Use `data-testid` selectors where possible.
   - Avoid expensive `wait` calls; prefer `waitForResponse` and `waitForRequest`
   - Use `--workers=1` to run tests in serial while the suite uses mutable global state.
3. If adding tests that require a seeded timeline, extend `scripts/seed-e2e-timeline.js` or call it from test fixtures.

Checklist for PR Reviewers
- [ ] `npm ci` does not change the lockfile
- [ ] Unit and integration tests pass locally and in CI
- [ ] Playwright e2e runs pass (or failures are recorded and saved as artifacts)
- [ ] Playwright HTML report and traces are uploaded to the workflow artifacts

References
- `.github/workflows/admin-node-integration.yml`
- `.github/workflows/pr-checklist.yml`
- `docs/review/pr-checklist-ci.md`

Last updated: 2025-11-15