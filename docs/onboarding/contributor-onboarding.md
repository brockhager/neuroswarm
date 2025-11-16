# Contributor Onboarding & Skill Assessment

This document outlines the recommended contributor onboarding flow, a minimal skill assessment process, and resources to help new contributors ramp up quickly.

## Goals
- Provide a clear, low-friction onboarding experience for contributors
- Validate minimal technical and governance knowledge required to contribute
- Map contributors to working groups and recommend starter tasks

## Flow (High-level)
1. Sign the contributor CLA and read the `CONTRIBUTOR-GUIDE.md`.
2. Fill out a short onboarding questionnaire (link to issue template) to capture background and desired contribution areas.
3. Run local development environment with a single-command script and verify local tests.
4. Complete a quick skill assessment (automated or hands-on) — ideally a small task in the repo which, when completed, demonstrates capability.
5. Submit PR for starter tasks (documentation, small bugfixes, test additions); maintainers review and give feedback.
6. Assign mentor within the working group for continued onboarding and code review support.

## Assessment (Suggested)
- Basics:
  - Fork repo, run `pnpm install -w`, `pnpm -C neuro-services test`, `pnpm -C neuro-services run lint`.
  - Create PR that fixes a minor doc or test bug.
- Developer tasks:
  - Implement a small Playwright test or add an e2e check to an existing spec.
- Governance tasks:
  - Draft a PR for an improvement to docs or risk analysis.

## Resources
- `CONTRIBUTOR-GUIDE.md` — step-by-step guide for first PR
- `README.md` (root) — local dev environment setup
- `docs/changelog/` — release notes and backlog history

## Notes
- This onboarding flow is intentionally lightweight and flexible. For high-impact changes or core infra, maintainers must validate security and compliance before approving a merge.
