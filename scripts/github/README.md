# GitHub Actions cancellation helpers

Small helper scripts to cancel queued GitHub Actions runs for the repository.

Options:

- PowerShell (preferred if you use GH CLI): `cancel-queued-actions.ps1` — uses `gh run list` + `gh run cancel` and requires `gh auth login`.
- Node.js (alternative): `cancel-queued-actions.js` — uses the GitHub REST API and requires `GITHUB_TOKEN` environment variable with appropriate permissions.

Usage examples (PowerShell):

```powershell
# Dry-run (show queued runs only):
.
# ./cancel-queued-actions.ps1 -Owner "brockhager" -Repo "neuroswarm" -DryRun

# Cancel (interactive confirmation):
.
# ./cancel-queued-actions.ps1 -Owner "brockhager" -Repo "neuroswarm"

# Non-interactive cancel (AutoYes):
.
# ./cancel-queued-actions.ps1 -Owner "brockhager" -Repo "neuroswarm" -AutoYes
```

Usage example (Node.js):

```bash
# set token (bash example)
export GITHUB_TOKEN=ghp_xxx

# dry run
node cancel-queued-actions.js --owner=brockhager --repo=neuroswarm --dry-run

# cancel - requires typing YES or passing --yes
node cancel-queued-actions.js --owner=brockhager --repo=neuroswarm --yes
```

Security note: Make sure `GITHUB_TOKEN` is stored securely; don't commit tokens to source control.
