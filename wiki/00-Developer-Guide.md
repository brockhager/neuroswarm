# NeuroSwarm — Developer Guide (Quick Start)

This landing page is for engineers who will develop features, fix bugs, or run the services locally.
It focuses on local setup, running emulators, architectural orientation, and links to the project master task list.

## Local setup & recommended first steps
- Clone the repository and install workspace dependencies with pnpm (workspace enforced):

  ```powershell
  # from repository root
  pnpm install -w
  pnpm -C neuroswarm install --frozen-lockfile
  ```

- Start the core local dev services (example):

  ```powershell
  # run core services in separate terminals
  # NS node (brain)
  $env:PORT=3009; node neuroswarm/ns-node/server.js

  # Gateway
  $env:PORT=8080; $env:NS_NODE_URL="http://127.0.0.1:3009"; node neuroswarm/gateway-node/server.js
  ```

## Useful developer docs
- Master Task List (high-level priorities): `wiki/NEUROSWARM_LAUNCH/task-list-2.md`
- Local testing & emulators: `shared/tests/firestore-emulator-utils.mjs` and `scripts/test-with-firestore-emulator.mjs`
- Core runtime and services layout: Explore `/neuroswarm` folders (`ns-node`, `gateway-node`, `vp-node`, `admin-node`)

## Architecture overview
- The main coordination services live under `neuroswarm/` (NS brain, VP node, Gateway, Admin).  
- Shared utilities and cryptographic flows are under `shared/` (idempotency store, key-management, transit connector).  
- Application-level microservices live under `neuro-services/` (this repo’s `APP-01` family).

## Development guides & tests
- Use `scripts/test-with-firestore-emulator.mjs` for integrated tests that require the Firestore emulator and mock KMS.  
- Each package has tests and a package.json script, e.g.: `pnpm -C neuroswarm test` or `pnpm -C neuro-services test`.

## Join the work
- Active tasks and priorities are tracked in `wiki/NEUROSWARM_LAUNCH/task-list-2.md`.
- Current active developer work: APP-02 — Background worker / job queue.
