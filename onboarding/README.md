# NeuroSwarm Onboarding Hub — Welcome, Contributor! 🧠

Welcome to the NeuroSwarm project. Your involvement is critical to achieving the sub-80ms latency target for our decentralized LLM validation service. This hub is your starting point — it provides a concise map to the codebase, required setup, and essential development guidelines.

## 1) What is NeuroSwarm?

NeuroSwarm is a decentralized, high-speed validation layer for large language models. Our core goal is to achieve reliable, high-integrity consensus on LLM outputs with sub-80ms latency across a distributed network of validation nodes.

At a high level the implementation focuses on two core subsystems:

- **The Validation Node (NS-LLM)** — The core service that runs inference, evaluates outputs against consensus rules, and reports results to the network.
- **The Consensus Protocol** — A weighted, high-speed protocol that ensures decentralized, verifiable agreement on LLM performance and output integrity.

## 2) Where to Start

Your next step depends on what you want to do. Pick the path that matches your goals.

| Path | Goal | Starting point |
|---|---|---|
| Run a Validator Node | Participate in the network, earn rewards, and contribute to consensus | `Quick-Setup.md` (see Quick Start) |
| Understand the architecture | Learn how NS-LLM, Dashboard, and Consensus Engine fit together | `../docs/Architecture.md` |
| Develop a scorer / filter | Contribute new validation logic to the core node | `../docs/Build-Validator-Guide.md` |

### Next step

Proceed directly to the Quick Start Guide to set up your environment and start a validator node locally.

## 3) Key Components Overview

The NS-LLM project structure contains the following main areas and example files you will interact with often:

| Directory | Purpose | Key files |
|---|---|---|
| `NS-LLM/` | Core Node Runtime — prototype server, model loading, scoring logic | `index.js`, `verify-models.js` |
| `governance/` | Network configuration, keys, seeding and governance initialization | `generate-keys.js`, `scripts/seed-e2e-timeline.js` |
| `dashboard/` | Contributor monitoring UI — React-based dashboards for node status and network activity | `App.jsx` |

## Quick Start (Zero-Configuration) — Target: < 5 minutes

These scripts are kept here to help new contributors get running quickly.

### Unix / Linux / macOS
```bash
./onboard.sh
```

### Windows (PowerShell)
```powershell
.\onboard.ps1
```

## What’s included

- `onboard.sh` — cross-platform onboarding for Unix-like systems
- `onboard.ps1` — onboarding for Windows/PowerShell
- `Quick-Setup.md` — the comprehensive developer setup and troubleshooting guide

## Usage examples

```bash
# Start core nodes (NS, Gateway, VP, Admin)
./onboard.sh

# Start the full stack (includes NS-LLM + Web UI)
./onboard.sh --full

# Run in background (detached)
./onboard.sh --detach

# Force rebuild images
./onboard.sh --rebuild

# Combine options
./onboard.sh --full --detach --rebuild
```

## Services started (defaults)

**Core (always)**
- NS Node (Brain): http://localhost:3009
- Gateway Node: http://localhost:8080
- VP Node (Validator): http://localhost:3002
- Admin Node (Dashboard): http://localhost:3000

**Optional (`--full`)**
- NS-LLM (AI prototype): http://localhost:5555
- Web UI: http://localhost:3010

## Documentation

📚 **Complete Guide**: [Quick-Setup.md](./Quick-Setup.md)

## Support

If you run into issues, check [Quick-Setup.md](./Quick-Setup.md#troubleshooting) first. If you still need help, open an issue and tag the release engineering team.

---

Part of Phase G (Ecosystem Expansion) — Contributor Empowerment Initiative
