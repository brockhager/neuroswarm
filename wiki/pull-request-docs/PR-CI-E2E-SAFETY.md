# PR: CI / E2E / Docs / Safety Updates

This bundle PR collects changes made during the November 2025 E2E stabilization session:

Changes included:
- CI: Use `npm ci` and verify lockfile unchanged, ensure Playwright browsers are installed and visible
- E2E: Add `timeline.spec.ts`, `latestAnchor.spec.ts` improvements, `shutdown-e2e.spec.ts`, `anchor-mismatch.spec.ts`, and `accessibility.spec.ts`
- Server: `POST /v1/admin/shutdown` and `SafetyService` + unit & integration tests
- Docs: Onboarding, APIs, analytics, governance, changelog and PR templates; updated `README` and `docs/todo.md`
- Seed script: Write seed to repo root and `admin-node` path to match `AnchorService` log path
- Tests: Unit & integration tests updated and added; all local tests passed in this session

Suggested PR title: `ci: e2e/ci/test/docs - stabilize Playwright, seed timeline, add shutdown and safety controls`

Suggested description:
```
This PR stabilizes E2E tests, improves CI reproducibility, implements a safety/shutdown mechanism for admin node, and adds onboarding and governance documentation.

It contains tests and documentation to help reviewers validate changes locally and in CI and to improve contributor experience.
```

Commands to test locally:
```powershell
cd C:\JS\ns\neuroswarm\admin-node
npm ci
npx playwright install --with-deps
NODE_ENV=test npm test
npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1
```

Notes:
- After opening the PR, run the CI `admin-node-integration.yml`; it will now perform seed step, browser validation, lockfile validation.
- The `shutdown` endpoint is founder-only; ensure run with a founder token for testing.
