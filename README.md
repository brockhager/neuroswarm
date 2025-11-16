# neuroswarm


## About

NeuroSwarm is a decentralized AI platform where personal AI agents run locally on user devices and connect to a shared Global Brain. The system combines local personalization with collaborative, auditable knowledge sharing.

## What it does


# NeuroSwarm coordination and documentation

## Updates Page & Discord integration

We maintain an `Updates.md` page in the `neuroswarm/wiki/` folder for project updates.
To post updates to both the wiki and a Discord channel at the same time, use the `publish-update` GitHub Action in `.github/workflows/publish-update.yml`.

Quick steps:

1. Create a Discord channel and add a webhook. Copy the webhook URL.
2. Add the webhook URL to your repository secrets under `DISCORD_WEBHOOK`.
3. From the Actions UI, run the `Publish Update` workflow and provide a `title` and `body`.
4. The workflow will append the update to `neuroswarm/wiki/Updates.md` and post it to the configured Discord webhook URL.

Local usage / demo:

You can test locally by running:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "My Update" --body "This is the update content" --author "Your Name"
```

To push the change back to the repository, use `--push` and ensure you have credentials to push:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "Release" --body "New release notes" --author "Release Bot" --push
```

PR flow:

To create a branch and open a PR (for review) instead of committing to main, use the `--pr` flag. The script will:

- Create a branch named `update-YYYYMMDD-title` using your title.
- Append the update to `neuroswarm/wiki/Updates.md` in that branch.
- Commit and push the branch to the remote automatically.
- Optionally open a PR using `--open-pr` (the script tries the `gh` CLI and falls back to the REST API if `GITHUB_TOKEN` and `GITHUB_REPOSITORY` are set).
 - If creating a PR, you can add labels and request reviewers using `--labels "label1,label2"` and `--reviewers "user1,user2"`. The workflow also exposes inputs `labels` and `reviewers` for action-based runs.

Example PR flow (local):

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "My Update" --body "This is the update content" --author "Your Name" --pr --no-push
You can request specific reviewers and add labels to the PR by using `--reviewers` and `--labels` with comma-separated values:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "My Update" --body "This is the update content" --author "Your Name" --pr --no-push --labels "release,docs" --reviewers "alice,bob"

Template options
----------------
You can use `--template` to use one of the built-in templates (plain or full). `full` produces a structured PR body and an Updates.md entry with metadata; `plain` keeps the current behavior.

Example:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "My Update" --body "Summary: ...\nImpact: ...\nNext Steps: ..." --pr --open-pr --template full --labels "ops" --reviewers "alice"
```

You may also provide a template file with `--template-file` containing placeholders like `{{title}}`, `{{body}}`, `{{author}}`, `{{date}}`, `{{labels}}`, and `{{reviewers}}`.

Example with a custom template:

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "My Update" --body "..." --pr --open-pr --template-file ./scripts/my-pr-template.md --labels "ops"
For example, a sample template is available at `neuroswarm/scripts/publishTemplate.md` which you can pass with `--template-file neuroswarm/scripts/publishTemplate.md`.
```
```
```

Dry run example (show what would have been executed without pushing or posting):

```bash
node neuroswarm/scripts/publishUpdate.mjs --title "Preview Update" --body "Testing" --dry-run
```

Example PR flow with automatic PR creation using GitHub token (in CI/action):

```bash
GITHUB_TOKEN=${GITHUB_TOKEN} node neuroswarm/scripts/publishUpdate.mjs --title "Release" --body "Notes" --author "Release Bot" --pr --open-pr
```

Notes:
- The script expects to run in a git repo (present in GitHub Actions or locally). If your working tree is dirty the script will warn but will continue.
- The workflow is configured to run the ESM script and can be triggered from Actions UI. It will push PR branch and optionally open the PR if requested.


- Anyone can run their own Personal AI locally.
## Documentation

Key design and developer docs (in the `docs/` folder):

- [Docs index](docs/README.md)
 - [Contributor onboarding](docs/onboarding/contributor-onboarding.md)
 - [Project Wiki (living docs)](https://github.com/brockhager/neuro-infra/wiki)
 - [Getting Started (Wiki)](https://github.com/brockhager/neuro-infra/wiki/Getting-Started)

Submissions package:
- `submissions/` — contains submission router, CLI, and validation for contributors to submit data (fingerprint + metadata) to the NeuroSwarm Brain. Mounts at `/v1/brain/submit`.



