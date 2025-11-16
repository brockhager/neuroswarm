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
node neuroswarm/scripts/publishUpdate.js --title "My Update" --body "This is the update content" --author "Your Name"
```

To push the change back to the repository, use `--push` and ensure you have credentials to push:

```bash
node neuroswarm/scripts/publishUpdate.js --title "Release" --body "New release notes" --author "Release Bot" --push
```


- Anyone can run their own Personal AI locally.
## Documentation

Key design and developer docs (in the `docs/` folder):

- [Docs index](docs/README.md)
 - [Contributor onboarding](docs/onboarding/contributor-onboarding.md)
 - [Project Wiki (living docs)](https://github.com/brockhager/neuro-infra/wiki)
 - [Getting Started (Wiki)](https://github.com/brockhager/neuro-infra/wiki/Getting-Started)

Submissions package:
- `submissions/` — contains submission router, CLI, and validation for contributors to submit data (fingerprint + metadata) to the NeuroSwarm Brain. Mounts at `/v1/brain/submit`.



