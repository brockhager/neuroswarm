# PR Summary — CI, E2E, and Safety (Admin Node)

Short summary:
 - This PR pins Playwright to v1.56.1 for test stability, enforces `pnpm` install in e2e CI jobs, updates seed scripts to write the computed genesis hash to `governance-timeline.jsonl` in both repo root and `admin-node` for observability alignment, adds SafetyService with a `/v1/admin/shutdown` endpoint, and improves AnchorService to honor `verificationStatus` and multiple txSignature fields.

Why this change:
- Fixes flaky Playwright e2e tests by ensuring seeded governance timeline entries are consumed by the Admin Node observability endpoints.
- Adds safe-mode (maintenance) features for controlled mutating operations and tests to ensure these APIs do not alter state during safe mode.
- Improves CI reproducibility via `npm ci` and lockfile validation.

Validation steps (quick):
1. Local unit tests
   - cd admin-node && pnpm -C admin-node install --frozen-lockfile && pnpm -C admin-node test
2. Playwright E2E (Serial for deterministic results)
   - cd admin-node && npx playwright install --with-deps
   - npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1
3. CI Run
   - Confirm the admin-node workflow runs `pnpm -C admin-node install --frozen-lockfile`, validates the lockfile, installs Playwright, seeds the timeline before e2e tests, and runs tests with `--workers=1`.

Notes & reviewer tips:
- The change introduces a maintenance mode (safety mode). Please review the `SafetyService` code and the `shutdown` route for founder-only access controls.
- Check that the seed script computes `genesisSha256` correctly and writes to both paths.

Links:
- PR Checklist for CI validation: `docs/review/pr-checklist-ci.md`
- Changelog entry: `docs/changelog/changelog-112025.md`
