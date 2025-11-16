# PR Checklist — CI Validation (Admin Node PRs)

Use this checklist when reviewing PRs that change CI, tests, E2E, or runtime safety controls.
Reviewers should validate each item locally or confirm CI runs the checks and returns clean results.

 ## 1. Install & Setup
- [ ] Run `npm ci` in `admin-node` and confirm the lockfile did not change:
  ```powershell
  cd admin-node
  npm ci
  git diff --exit-code package-lock.json || (echo "Lockfile changed: check dependencies" && exit 1)
  ```

- [ ] Verify Playwright browsers are installed:
  ```powershell
  npx playwright show-browsers
  # Ensure chromium, firefox, and webkit are listed
  ```

Local helper scripts
- PowerShell: `admin-node/scripts/run-pr-checklist.ps1`
- Bash: `admin-node/scripts/run-pr-checklist.sh`

Run the preferred script from the repo root to validate the PR checklist locally. They run the same steps as the CI job.

## 2. Unit & Integration Tests
- [ ] Run all unit and integration tests:
  ```powershell
  NODE_ENV=test npm test
  ```

- [ ] Confirm `SafetyService` unit test passes:
  - `admin-node/src/services/safety-service.test.ts` — tests safe mode toggle and state.

- [ ] Confirm `anchor-service.test.ts` passes and validates `getGovernanceAnchoringStatus` parsing and fields.

## 3. End-to-End Tests
- [ ] Run Playwright E2E tests locally (serial for determinism):
  ```powershell
  npx playwright install --with-deps
  npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1
  ```

- [ ] Validate the critical E2E specs:
  - `latestAnchor.spec.ts`: shows seeded anchor, has clipboard/copy behavior, founder-only `set-tx-signature` success, and UI mark-verified behavior.
  - `timeline.spec.ts`: confirms timeline entries seeded and displayed in Governance Timeline.
  - `shutdown-e2e.spec.ts`: validates `mark-verified` is blocked in safe mode and shows service error.
  - `anchor-mismatch.spec.ts`: verifies anchor is not marked verified when the passed genesis hash mismatches.
  - `accessibility.spec.ts`: confirms modal open/close via keyboard, and `aria-label`s and `data-testid` presence for controls.

- [ ] Confirm Playwright artifacts are usable in CI (HTML report, screenshots, traces) and are uploaded to the PR as artifacts for reviewers to inspect.

## 4. CI Workflow Validation
- [ ] Confirm `seed-e2e-timeline` step runs before Playwright e2e tests in `neuroswarm/.github/workflows/admin-node-integration.yml`.
- [ ] Confirm the e2e step uses `--workers=1` or an equivalent to avoid global state conflicts.
- [ ] Check CI logs for:
  - Lockfile drift detection after `npm ci` (error/exit if mutated).
  - Playwright browser installation success; `npx playwright show-browsers` should list chromium/firefox/webkit.

## 5. Documentation & Changelog
- [ ] Confirm `README.md` references the onboarding doc and e2e setup.
- [ ] Confirm `docs/changelog/changelog-112025.md` or `PR-CI-E2E-SAFETY.md` accurately describes the PR changes.
- [ ] Confirm `.github/PULL_REQUEST_TEMPLATE.md` is present and references key tests or a link to this checklist.
- [ ] If docs or endpoints changed, update the `neuroswarm/wiki/*` page(s) or the wiki with the appropriate change; reference the wiki change in your PR.

---

If anything fails during the local checks, paste the failing log sections into the PR comments and request required fixes or follow-up changes.

This checklist is intentionally minimal and focused on CI/test validation for safety/CI/e2e changes. If the PR touches other modules, follow the appropriate dev-team checklists as well.
