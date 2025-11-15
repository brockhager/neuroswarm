# NeuroSwarm Knowledge Base (docs/wiki)

This folder contains the markdown pages that populate the project’s GitHub wiki. Pages under this folder are automatically synced to the repository’s GitHub Wiki after merges to `main` using `.github/workflows/sync-wiki.yml`.

Standards
- Each page: Overview → Details → How-to → References.
- Use headings and small, focused sections.
- Include `Last updated: YYYY-MM-DD` at the bottom of each page.
- Use `Index.md` as the top-level navigation.

How to use
- Edit pages under `docs/wiki` and open a PR using the `pr-checklist.yml` workflow to validate.
- After merge, `sync-wiki` will update the `repo.wiki` content automatically.

Support
- If you need help updating the wiki or the sync script, check `docs/review/pr-checklist-ci.md` or open a PR and tag `docs` and `admin-node` reviewers.

Last updated: 2025-11-15