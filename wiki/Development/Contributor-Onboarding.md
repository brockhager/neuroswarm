# Contributor Onboarding
[← Index](../Index.md)

Overview

This page summarizes how new contributors can get started with NeuroSwarm: developer environment setup, running tests locally, and onboarding tasks.

Prerequisites
- Node.js (18 or 20 recommended)
- npm
- Basic familiarity with Git and GitHub

How-to
1. Setup repo:
   ```bash
   git clone https://github.com/brockhager/neuroswarm.git
   cd neuroswarm
   pnpm install -w
   ```
2. Run unit and integration tests:
   ```bash
   cd admin-node
   npm test
   ```
3. Run Playwright E2E locally (serial to avoid global state interactions):
   ```bash
   npx playwright install --with-deps
   npx playwright test -c e2e/playwright.config.ts --project=chromium --workers=1
   ```
4. Seed timeline for testing with the helper script:
   ```bash
   node scripts/seed-e2e-timeline.js
   ```

Onboarding tasks & First PR ideas
- Read `docs/onboarding/contributor-onboarding.md`
- Try running a local e2e test and documenting any pain points
- Add a `data-testid` or a more reliable selector for a brittle UI element

References
- [Contributor Guide (Wiki)](https://github.com/brockhager/neuroswarm/wiki/Contributor-Guide)
- `docs/onboarding/contributor-onboarding.md`
- `docs/review/pr-checklist-ci.md`

Last updated: 2025-11-15