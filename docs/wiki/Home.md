# NeuroSwarm — Wiki Home

Welcome to the NeuroSwarm documentation wiki. This is the canonical source for contributors and users — use the links below to find installation instructions, architecture details, tooling, governance and contributor resources.

If you're contributing, start with "Getting Started" and the contributor resources section; if you're running nodes, go straight to "Installation & Running Nodes".

---

🚀 Getting Started
- [Installation (One-click installers)](Installation)
- [Running Nodes (ns-node, gateway-node, vp-node)](Running-Nodes)
- [pnpm Policy & Developer Workflow](Contributor-Policy)

🧠 Architecture
- [Data Flow Architecture](Data-Flow-Architecture)
- Consensus & PoS (see `neuro-services` PoS tests in the repo)

🔧 Tools & Scripts
- [Connectivity Check (scripts/checkNodeConnectivityClean.mjs)](Running-Nodes#health--connectivity)
- [Smoke produce script (scripts/smokeProduce.mjs)](Running-Nodes#smoke-produce)
- Packaging/Installers (CI builds, `scripts/package-binaries.mjs`)
- Updates & publish flow (`scripts/publishUpdate.mjs`, GitHub Releases)

📜 Governance & Updates
- [Project Updates (changelog / Updates page)](Updates)
- PR flow, publishing & Discord integration (see `publish-update` action)

🛠️ Contributor Resources
- CI workflows (`.github/workflows/*`) including `run-nodes-integration.yml`, `connectivity-check.yml` and others
- Test harness: `neuro-services/tests/*` (PoS, block production, equivocation, reorg, etc.)
- Logs & artifacts: `tmp/logs/` for local testing; CI artifact uploads for PRs

---

If you don't see a page you need, open an issue or create a PR — we sync `neuroswarm/docs/` into this wiki via CI. This front page is refreshed from `neuroswarm/docs/wiki/Home.md` in the repository (see `pushDocsToWiki.mjs`).
# Welcome to NeuroSwarm

## Mission
NeuroSwarm is building a decentralized AI platform that emphasizes transparent governance, contributor-first collaboration, and auditable decision-making. This wiki is the centralized source for onboarding, architecture, governance, and operational playbooks.

## Quick Start
1. Check out our contributor onboarding guide: [Contributor Onboarding](Contributor-Onboarding.md)
2. Set up your dev environment: `pnpm install -w` and run the Admin Node tests (see [CI-CD-and-Testing](CI-CD-and-Testing.md))
3. For governance rituals and proposer flow: [Governance & Anchoring](Governance-Anchoring.md)

## Contributor Quick Links
- New contributor? Start with a small documentation PR: [How to Contribute to the Wiki](How-to-contribute-to-the-wiki.md)
- Need to run tests locally? Use the PR Checklist helper script: `admin-node/scripts/run-pr-checklist.ps1` (or `.sh`)
- Want to verify the genesis anchor? Follow the guide: [Contributor Genesis Anchor Verification](../contributor-anchor-verification.md)

## Need help?
- Join our Discussions: https://github.com/brockhager/neuro-infra/discussions
- Open an issue or ask for clarification on repository issues.

See the full index for more pages: [Index](Index.md)

Last updated: 2025-11-15