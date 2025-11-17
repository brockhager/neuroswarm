## PNPM-only policy

This repository uses `pnpm` as the canonical package manager across all Node.js projects in the monorepo.

Rules:
- Use `pnpm install -w` to install workspace dependencies.
- Use `pnpm -C <pkg>` for per-package installation where needed (e.g., `pnpm -C neuro-services install --frozen-lockfile`).
- Do not commit `package-lock.json` files. CI will fail if a `package-lock.json` file is present; please remove the file and perform `pnpm install -w`.
- Use `pnpm` for all developer scripts and local test flows.
- If you need to pin Playwright browsers or other native artifacts, do so via `pnpm` and the repository's `pnpm-lock.yaml`.

CI Enforcement:
- The `run-nodes-integration.yml` workflow includes a step that checks for `package-lock.json` and fails the job if found. 
- If you accidentally commit a `package-lock.json`, remove it and update your PR so the integration checks pass.

Developer tips:
- If migrating from `npm`, remove local `package-lock.json` files and re-run `pnpm install -w`. Your `node_modules` will be managed by pnpm's workspace.
- To ensure CI reproducibility, use `pnpm -w install` and `pnpm -C <pkg> install --frozen-lockfile` where appropriate.

If you believe a `package-lock.json` is required for a specific package, please open an issue so we can discuss the tradeoffs.

## Using `publishUpdate.mjs` for Release Notes and Wiki Updates

`publishUpdate.mjs` helps you create wiki updates and PRs for release notes. Common flags:

- `--title "Title"` — the headline for the update
- `--body "Body text"` — body content to include in the PR and the wiki entry
- `--pr` — create a branch and commit the wiki update (default: use branch update-YYYYMMDD-title)
- `--open-pr` — after pushing, attempt to open a PR (requires `gh` CLI or a `GITHUB_TOKEN`)
- `--push` — push the updates directly to the default branch
- `--dry-run` — do not push or open PRs; generate entry and optionally append to local `wiki/Updates.md` (useful for validation)

Example (dry-run):
```
node scripts/publishUpdate.mjs --title "Release 0.2.0" --body "Notes about the release" --dry-run --pr
```

Example (create & push PR):
```
node scripts/publishUpdate.mjs --title "Release 0.2.0" --body "Notes about the release" --pr --open-pr
```

When a PR is merged, the `docs-wiki-sync` GitHub Action will automatically push updates to the wiki, keeping it canonical.
