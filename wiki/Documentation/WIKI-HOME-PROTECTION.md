# Wiki Home.md Protection Policy

## Overview
The wiki `Home.md` page is the canonical entry point for all users and contributors. To prevent accidental deletion or corruption, automated systems **must not** modify `Home.md` without explicit permission.

## Protection Mechanisms

### 1. Source-Level Protection
- `neuroswarm/wiki/Home.md` and `neuroswarm/docs/wiki/Home.md` are protected in the source repository
- Empty or missing `Home.md` files trigger automatic restoration from `scripts/default-Home.md`
- CI validates `Home.md` exists and contains non-empty content before allowing wiki sync

### 2. Automation Guards
All automation scripts that touch wiki content include Home.md protection:

#### `pushDocsToWiki.mjs`
- Blocks `Home.md` overwrite unless `ALLOW_WIKI_HOME_OVERWRITE=1` **AND** `--allow-home-overwrite` flag
- If source `Home.md` is empty, automatically restores from `default-Home.md` template
- Logs all blocked attempts with timestamps: `[WIKI][timestamp] ERROR: Attempted overwrite of Home.md blocked`
 - Ensures `Home.md` is present in the wiki clone before commit; if missing, the script will restore `Home.md` from the canonical source (`neuroswarm/wiki/Home.md`), fallback to `neuroswarm/docs/wiki/Home.md`, or finally `neuroswarm/scripts/default-Home.md`.
 - Stages only the files written by the script to avoid accidental deletion of unrelated files in the wiki repo.

#### `restore-wiki-home.mjs`
- Checks wiki repo for missing/empty `Home.md`
- Automatically restores from source or default template
- Commits and pushes restoration with message: `"Restore Home.md content (automation safeguard)"`
- Usage:
  ```bash
  node neuroswarm/scripts/restore-wiki-home.mjs         # Restore if needed
  node neuroswarm/scripts/restore-wiki-home.mjs --check-only  # Check only (exit 1 if invalid)
  node neuroswarm/scripts/restore-wiki-home.mjs --dry-run     # Show what would be done
  ```

### 3. CI Enforcement
`.github/workflows/protect-wiki-home.yml` runs:
- On every push to main/master that touches wiki files
- Every 6 hours via scheduled cron
- On manual workflow dispatch

The workflow:
1. Validates source `Home.md` is non-empty
2. Runs `restore-wiki-home.mjs` to check/restore wiki repo
3. Fails the job if restoration fails (requires manual intervention)

### 4. Default Template
`scripts/default-Home.md` contains the fallback content used for restoration:
- Simple, safe default structure
- Links to essential wiki pages
- Auto-updated timestamp
- Never deleted or left empty

## For Contributors

### ✅ Allowed Actions
- **Edit `Home.md` via PR**: Make intentional changes to `neuroswarm/wiki/Home.md` and open a PR
- **Review changes**: All `Home.md` changes go through PR review before merging
- **Test locally**: Use `--dry-run` flags to test wiki sync without pushing

### ❌ Prohibited Actions
- **Never commit empty `Home.md`**: CI will block and fail the build
- **No direct automation edits**: Don't bypass protection with scripts
- **No force pushes to wiki repo**: Wiki repo is protected

### Making Intentional Home.md Changes
1. Edit `neuroswarm/wiki/Home.md` or `neuroswarm/docs/wiki/Home.md` in your branch
2. Ensure content is non-empty and well-formatted
3. Open PR with clear description of Home.md changes
4. After PR merge, the automated wiki sync will update the wiki with explicit permission

To manually sync after PR merge (maintainers only):
```bash
export ALLOW_WIKI_HOME_OVERWRITE=1
node neuroswarm/scripts/pushDocsToWiki.mjs --allow-home-overwrite
```

## Emergency Restoration

If `Home.md` is accidentally deleted or corrupted in the wiki repo:

### Automatic (Preferred)
Wait for the next scheduled CI run (every 6 hours), or trigger manually:
- Go to Actions → "Protect Wiki Home Page" → "Run workflow"

### Manual (Immediate)
```bash
export GH_PAT=your_github_token
node neuroswarm/scripts/restore-wiki-home.mjs
```

This will:
1. Clone the wiki repo
2. Check `Home.md` status
3. Restore from source or default template if needed
4. Commit and push restoration

## Validation Commands

Check if Home.md needs restoration:
```bash
node neuroswarm/scripts/restore-wiki-home.mjs --check-only
```

Preview restoration without making changes:
```bash
node neuroswarm/scripts/restore-wiki-home.mjs --dry-run
```

Verify source Home.md is valid:
```bash
test -s neuroswarm/wiki/Home.md || echo "ERROR: Home.md is empty"
```

## Audit Trail
All Home.md protection events are logged with timestamps:
- `[WIKI][timestamp] ERROR: Attempted overwrite of Home.md blocked`
- `[WIKI][timestamp] INFO: Restored Home.md from default template`
- `[WIKI-RESTORE][timestamp] ✅ Successfully restored and pushed Home.md to wiki`

Check git logs for restoration commits:
```bash
git log --all --oneline --grep="Restore Home.md"
```

## Troubleshooting

### CI Fails with "Home.md is empty"
1. Check `neuroswarm/wiki/Home.md` or `neuroswarm/docs/wiki/Home.md` in your branch
2. Ensure file contains valid markdown content
3. If accidentally emptied, restore from git history or `scripts/default-Home.md`

### Wiki Shows Old Home.md Content
1. Check if recent PR modified Home.md without proper permissions
2. Trigger manual wiki sync with overwrite permission (maintainers only)
3. Verify automated CI sync completed successfully

### Restoration Script Fails
1. Verify `GH_PAT` or `GITHUB_TOKEN` is set and valid
2. Check wiki repo permissions (requires push access)
3. Review script logs for specific error messages
4. If persistent, restore manually via GitHub wiki web interface

## Security Considerations
- `GH_PAT` token is redacted from all logs
- Wiki repo URLs with tokens are sanitized before logging
- CI secrets are managed via GitHub Actions secrets
- Restoration commits are signed and auditable

## Related Files
- `neuroswarm/scripts/pushDocsToWiki.mjs` - Wiki sync with Home.md protection
- `neuroswarm/scripts/restore-wiki-home.mjs` - Restoration automation
- `neuroswarm/scripts/default-Home.md` - Default template
- `neuroswarm/.github/workflows/protect-wiki-home.yml` - CI protection
- `neuroswarm/wiki/Home.md` - Source of truth for wiki home page

---
*Last updated: 2025-11-18*
