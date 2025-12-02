Automated helpers
------------------

Run these scripts locally to create a PR and dispatch a validation workflow to test packaging & wiki sync.

Requirements:
- `git` and `gh` installed and authenticated (use `gh auth login`).
- Run from repository root.

Create and open a test PR (Windows PowerShell):

```powershell
pwsh ./neuroswarm/scripts/create-test-pr.ps1 -branchName 'test/validate-packaging-wiki'
```

Create and open a test PR (Linux/macOS):

```bash
bash ./neuroswarm/scripts/create-test-pr.sh
```

Dispatch validation workflow manually via CLI against a branch reference (e.g., your PR branch):

```bash
bash ./neuroswarm/scripts/dispatch-validate-workflow.sh validate-packaging-and-wiki.yml test/validate-packaging-wiki
```

Notes:
- The validation workflow will build per-OS installers and run a dry-run for the Wiki sync, generating artifacts for review.
- After validation completes, you can publish a release to run the full `build-release-installers.yml` workflow, which publishes installers as Release assets.
