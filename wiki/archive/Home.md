# NeuroSwarm Wiki (Canonical Home)

Welcome to the NeuroSwarm Wiki. This is the canonical, single source of truth for installation, node operations, architecture, governance, and contributor workflow. If a README or code comment conflicts with the wiki, the wiki wins — please open an issue or PR to reconcile.

---
## Essential Pages
- [Download](Download) – Pre-built release artifacts and platform installers.
- [Running Nodes](Running-Nodes) – Operating `ns-node`, `gateway-node`, `vp-node` + health & logs.
- [Data Flow Architecture](Data-Flow-Architecture) – End‑to‑end pipeline, consensus, reorg handling.
- [Contributor Policy](Contributor-Policy) – pnpm only (no `package-lock.json`), branching & PR rules.
- [Updates / Changelog](Updates) – Release notes, breaking changes, migration guidance.

---
## Operator Quick Start
1. Go to [Download](Download) and download platform-specific ZIPs.
2. Unpack; run provided start script (`start-gateway`, `start-ns`, `start-vp`).
3. Wait for automatic health poll; gateway script opens browser when ready.
4. Verify `/health` returns JSON status for each node.
5. Run connectivity: `node scripts/checkNodeConnectivityClean.mjs`.
6. Smoke blocks: `node scripts/smokeProduce.mjs` (see Running Nodes for expected output).
7. Troubleshooting: see `Troubleshooting.md`. If you are missing docs on the wiki, open an issue.

---
## Architecture (short)
```
User -> Gateway (mempool + source validation) -> VP (block producer + IPFS publisher) -> NS (verifier & chain state) -> Gateway (requeue after reorg)
```

## Links & Docs
- [System Overview](System-Overview.md)
- [Architecture](Architecture.md)
- [Sources / Allie-AI](Sources.md)
- [Testing & CI](Testing.md)
- [Troubleshooting](Troubleshooting.md)
- [How to Contribute](Contributing.md)
