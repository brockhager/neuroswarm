# NeuroSwarm Wiki (Canonical Home)

Welcome to the NeuroSwarm Wiki. This is the canonical, single source of truth for installation, node operations, architecture, governance, and contributor workflow. If a README or code comment conflicts with the wiki, the wiki wins — please open an issue or PR to reconcile.

---
## Essential Pages
- [Installation](Installation) – One‑click installers & manual setup.
- [Running Nodes](Running-Nodes) – Operating `ns-node`, `gateway-node`, `vp-node` + health & logs.
- [Data Flow Architecture](Data-Flow-Architecture) – End‑to‑end pipeline, consensus, reorg handling.
- [Contributor Policy](Contributor-Policy) – pnpm only (no `package-lock.json`), branching & PR rules.
- [Updates / Changelog](Updates) – Release notes, breaking changes, migration guidance.

---
## Operator Quick Start
1. Go to [Installation](Installation) and download platform-specific ZIPs.
2. Unpack; run provided start script (`start-gateway`, `start-ns`, `start-vp`).
3. Wait for automatic health poll; gateway script opens browser when ready.
4. Verify `/health` returns JSON status for each node.
5. Run connectivity: `node scripts/checkNodeConnectivityClean.mjs`.
6. Smoke blocks: `node scripts/smokeProduce.mjs` (see Running Nodes for expected output).

---
## Contributor Quick Start
1. Clone the monorepo; run `pnpm install -w` (never commit `package-lock.json`).
2. Read [Contributor Policy](Contributor-Policy) for pnpm + workflow conventions.
3. Make a doc/code change; run tests (PoS & block production in `neuro-services`).
4. Use `scripts/publishUpdate.mjs` for release prep → open PR → announce in Discord → merge → CI syncs wiki.
5. Confirm changes appear here after the `docs-wiki-sync` workflow completes.

---
## Scripts & Automation
- Packaging: `scripts/package-binaries.mjs` (builds multi‑OS binaries & ZIP installers).
- Unified launcher: `scripts/launch-node.mjs` (health polling + browser open for gateway).
- Connectivity: `scripts/checkNodeConnectivityClean.mjs`.
- Smoke / block production: `scripts/smokeProduce.mjs`.
- Release / update: `scripts/publishUpdate.mjs`.
- Git hygiene (multi-repo): `scripts/git-run-all.*`, branch cleanup helpers.

---
## CI / CD
- Installer build matrix: `build-release-installers.yml`.
- Validation / dry‑run sync: `validate-packaging-and-wiki.yml`.
- Documentation sync: `docs-wiki-sync.yml` (pushes `docs/wiki/*` here).
- Integration & PoS testing: see `run-nodes-integration.yml` (may vary by branch).

Artifacts include: packaged binaries (`ns-node`, `gateway-node`, `vp-node`) and start scripts with health wait logic.

---
## Architecture & Governance
- [Data Flow Architecture](Data-Flow-Architecture) outlines ingestion → consensus → finalization.
- Governance anchors & proposer rotation documented (see future Governance pages / Updates).
- PoS, equivocation & reorg handling covered in test suites (`neuro-services/tests`).

---
## Support & Feedback
- GitHub Discussions: https://github.com/brockhager/neuro-infra/discussions
- Issues: open if a page is stale or missing.
- PRs: small, frequent, pnpm‑compliant.

If a page you need is missing, create a PR; CI will sync it here. This Home page is auto‑refreshed from `neuroswarm/docs/wiki/Home.md` via `pushDocsToWiki.mjs`.

Last updated: 2025-11-16