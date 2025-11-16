# Installation & One-click Local Setup

> NOTE: This document is synchronized to the project Wiki and the GitHub Wiki is the canonical source: https://github.com/brockhager/neuro-infra/wiki

This document provides a one-click local install flow for end-users to run NeuroSwarm nodes and for developers to build installers.

Sections:
- One-click installers (Windows, macOS, Linux)
- Launchers and one-click flow
- Developer packaging & CI

One-click installers:
- We provide pre-built zipped installers for each node (ns-node, gateway-node, vp-node) per platform. These are built via GitHub Actions and uploaded as Release artifacts.

Launchers & UX:
- Each installer contains a platform binary (`ns-node`, `gateway-node`, `vp-node`) and platform start scripts: `start.sh` (Linux/macOS) and `start.bat` (Windows).
- The `start` scripts set default environment variables (PORT, NS_NODE_URL) and start the binary. For the gateway installer, the start script also opens the system default browser at the gateway URL after confirming the `/health` endpoint is responsive.

Developer packaging and CI:
- CI builds per-platform artifacts using `pkg` and uploads zipped installers to Release artifacts.
- A workflow `neuroswarm/.github/workflows/build-release-installers.yml` runs on `release` and `workflow_dispatch` to create installers.
- Developers can reproduce packaging locally by running:

```bash
pnpm -C neuroswarm package:bins -- --os linux
pnpm -C neuroswarm package:bins -- --os macos
pnpm -C neuroswarm package:bins -- --os win
```

Note: These installers are self-contained and do not require Node or pnpm on end-user machines.

For more details see the `neuroswarm/scripts/package-binaries.mjs` script and `neuroswarm/scripts/launch-node.mjs`.
