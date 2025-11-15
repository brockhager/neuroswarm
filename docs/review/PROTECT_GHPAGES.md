# Protecting gh-pages Branch

This document outlines a recommended branch protection policy for the `gh-pages` branch to ensure only CI can push site content.

Why protect gh-pages?
- Prevent accidental manual pushes that overwrite or remove reports
- Ensure our GitHub Pages content is only deployed by CI workflows

Recommended settings (GitHub UI):
1. Go to Settings > Branches > Branch protection rules.
2. Add a rule for `gh-pages`.
3. Enable:
   - Require status checks to pass before merging (if PRs go to gh-pages)
   - Restrict who can push to matching branches — only allow GitHub Actions or a specific service account
   - Require signed commits (optional)
   - Require linear history (optional)

If using GitHub CLI to configure:
```powershell
# Example (requires admin rights and --json parsing to confirm)
# Replace <owner>, <repo> with correct values and ensure you have permissions.
gh api --method PUT /repos/<owner>/<repo>/branches/gh-pages/protection -f required_status_checks.contexts="[\"ci\"]" -f enforce_admins.enabled=false
# To restrict pushes, set the relevant payload `restrictions` with users/teams/apps allowed.
```

Notes:
- If you restrict pushes to a specific GitHub App or user/token, ensure the CI uses an appropriate token with permission to push.
- If you lock down pushes and only allow the `GITHUB_TOKEN`, ensure the runner is set with `permissions: pages: write` and the repository policies permit it.
