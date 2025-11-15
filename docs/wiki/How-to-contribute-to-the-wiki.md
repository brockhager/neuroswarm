# How to Contribute to the NeuroSwarm Wiki
[← Index](Index.md)

Overview

This page explains how contributors can update the Wiki content kept under `docs/wiki/` in the repository.

Style guide & structure
- Keep pages small and focused: Overview → Details → How‑to → References
- Use bullet lists for steps, code fences for commands, and `Last updated:` at the bottom
- Use `data-` attributes or `data-testid` in UI code as required to help Playwright selectors

How-to edit the wiki files (preferred flow)
1. Create a branch: `git checkout -b feat/wiki/YOUR_TOPIC`
2. Update or add a page under `docs/wiki/<Page-name>.md` with the structure described above.
3. Run the local checks if you changed docs or workflows:
   - Run `./admin-node/scripts/run-pr-checklist.ps1` or the bash script for tests and validation
4. Open a PR with a short title describing the changes and add reviewers.
5. Wait for the PR CI to run; CI will run the `pr-checklist` and `admin-node-integration` workflows.
6. After the PR is merged, the Wiki will be synced automatically to the GitHub Wiki via `sync-wiki.yml` (see below).

Continuous updates & Kanban flow
- Add a task to the Wiki column on the project Kanban board when you plan to make a change.
- Move the Kanban task through the workflows: Backlog → In Progress → Review → Done.
- For sensitive changes (CI, governance, security), add a PR label like `security`, `ci`, or `governance` and request a governance reviewer.
- Once merged, confirm the `sync-wiki` workflow run succeeded and the updated page is visible in the Wiki.

Review process
- Small cosmetic changes can be merged with 1 reviewer.
- Structural changes (adding pages to critical areas like Governance or Security) require at least 2 reviewers and a member of the governance team (founder/admin) to sign off.
- If you are changing sensitive endpoints, include a code review, test evidence, and a security check.

How to sync to GitHub wiki (automated)
- The GitHub Action `sync-wiki.yml` (added) will automatically copy `docs/wiki/` to the GitHub wiki (repository.wiki.git) on merges to `main`.

References
- `docs/review/pr-checklist-ci.md`
- `docs/review/pr-body-ci.md`

Last updated: 2025-11-15