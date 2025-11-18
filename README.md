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

Key design and developer docs (canonical pages are on the `Wiki`):

- [Home — Wiki](https://github.com/brockhager/neuro-infra/wiki)
- [Contributor onboarding — Wiki](https://github.com/brockhager/neuro-infra/wiki/Contributor-Onboarding)
- [Getting Started (Wiki)](https://github.com/brockhager/neuro-infra/wiki/Getting-Started)
- [Data flow architecture — Wiki](https://github.com/brockhager/neuro-infra/wiki/Data-Flow-Architecture)
 - [Data flow architecture (Wiki)](wiki/data-flow-architecture.md)

Run the nodes
------------

To run nodes individually or as a network, follow the step-by-step runbook on the wiki: `https://github.com/brockhager/neuro-infra/wiki/Running-Nodes` which contains details for environment variables, ports, and health checks.

Quick start:

```powershell
# Start ns-node on 3000
cd neuroswarm
PORT=3000 node ns-node/server.js > tmp/ns.log 2> tmp/ns.err & echo $! > tmp/ns.pid

# Start gateway on 8080 (point to ns)
PORT=8080 NS_NODE_URL=http://127.0.0.1:3000 NS_CHECK_EXIT_ON_FAIL=false node gateway-node/server.js > tmp/gw.log 2> tmp/gw.err & echo $! > tmp/gw.pid

# Start vp-node on 4000 (point to ns)
PORT=4000 NS_NODE_URL=http://127.0.0.1:3000 node vp-node/server.js > tmp/vp.log 2> tmp/vp.err & echo $! > tmp/vp.pid

# Run a quick connectivity check
node neuroswarm/scripts/checkNodeConnectivityClean.mjs --ns http://localhost:3000 --gateway http://localhost:8080 --ci
```

Note: This repository adopts a pnpm-only workflow. CI enforces that no `package-lock.json` files are checked in — use `pnpm install -w` and `pnpm -C <pkg>` for per-package installs.

Download & Run
--------------

Pre-built installers for `ns-node`, `gateway-node`, and `vp-node` are available on GitHub Releases under the "Assets" section of the release. Each installer is a ZIP file and contains a platform-appropriate binary and a start script. See the "Installation" wiki page for one-click install & run instructions:

 - https://github.com/brockhager/neuro-infra/wiki/Installation
 - https://github.com/brockhager/neuro-infra/wiki/Running-Nodes
 - https://github.com/brockhager/neuro-infra/wiki/Data-Flow-Architecture
 - https://github.com/brockhager/neuro-infra/wiki/Contributor-Policy
 - https://github.com/brockhager/neuro-infra/wiki/Updates

Tip: Packaging with live status logging
-------------------------------------

If you'd like to package installers that display live status messages in the console window and keep the window open only when the process exits unexpectedly, build with the `--status` and `--keep-open` flags:

```powershell
pnpm -C neuroswarm package:bins -- --keep-open --status
```
CI note — why the workflow uses separate folders
------------------------------------------------

The `validate-start-scripts` GitHub Action uses a pair of distinct folders when performing packaging and validation for `--status` vs `--status --keep-open`. This avoids nested or stale `dist/` content when copying artifacts and ensures the validation step always runs against a clean, specific package output. The action names the directories `dist-status-<target>-plain-<timestamp>` and `dist-status-<target>-keep-<timestamp>` to make it easy to debug artifacts for a specific workflow run.

If you add or change the build outputs you can review the artifacts under those folders in the workflow logs or in job artifact uploads.

Debugging the start-scripts workflow
-----------------------------------

To enable verbose debug logging inside the `validate-start-scripts` workflow (for debugging packaging or start script behavior), set the `DEBUG_START_SCRIPTS` workflow environment variable to `true`. This is off by default to keep logs tidy. When enabled, the job prints the artifact directory contents and the content of start scripts.

The smoke tests in CI now cover the `ns-node`, `gateway-node` (port 8080), and `vp-node` (heartbeat logs) to ensure we've got full coverage for health and status behavior across nodes.


This produces a `start.bat` that runs the node in the foreground so logs stream to the window and will append a pause only if the node exits with a non-zero exit code.


Submissions package:
- `submissions/` — contains submission router, CLI, and validation for contributors to submit data (fingerprint + metadata) to the NeuroSwarm Brain. Mounts at `/v1/brain/submit`.



