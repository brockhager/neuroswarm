# Testing & CI: How to validate the NeuroSwarm pipeline
[← Home](Home.md)

This page documents the tests and CI workflow used to validate the system including `ns-node` (brain), `gateway-node` (mempool), `vp-node` (producer), and IPFS integration.

## Integration test scripts
- `scripts/integration/gateway-to-ns.mjs` — checks gateway → ns forwarding and gateway mempool behavior.
- `scripts/integration/ns-to-gateway.mjs` — checks NS forwarding and gateway behavior.
- `scripts/integration/vp-block-ipfs.mjs` — ensures VP publishes payloads to IPFS; NS validates payload signature and merkle root.
- `scripts/integration/sources-allie.mjs` — validates Allie‑AI source flow; a negative test tamper checks sources mismatch.
- `scripts/integration/gateway-requeue-test.mjs` — ensures gateway requeue after reorg behavior.
- `scripts/integration/gateway-sources-policy.mjs` — ensures gateway rejects txs that request too many adapters.

## Unit tests
- `neuroswarm/tests/sources-root.test.mjs` — test for deterministic `sourcesRoot` computation.

## CI workflows
- `validate-start-scripts.yml` – builds and runs smoke tests across platforms, starts IPFS in runners, and runs integration tests.
- `run-nodes-integration.yml` – integrated test setup to run full stack (ns/gateway/vp) and run tests.

## Running tests locally (quick)
1. Start a local IPFS daemon:
```bash
docker run -d --name ipfs -p 5001:5001 ipfs/go-ipfs:latest
```
2. Start nodes in separate shells:
```bash
# NS
PORT=3000 node neuroswarm/ns-node/server.js
# Gateway
PORT=8080 NS_NODE_URL=http://localhost:3000 node neuroswarm/gateway-node/server.js
# VP
PORT=4000 NS_NODE_URL=http://localhost:3000 IPFS_API=http://localhost:5001 node neuroswarm/vp-node/server.js
```
3. Run integration smoke tests:
```bash
node neuroswarm/scripts/integration/vp-block-ipfs.mjs --gateway http://localhost:8080 --ns http://localhost:3000 --vp http://localhost:4000
node neuroswarm/scripts/integration/sources-allie.mjs --gateway http://localhost:8080 --ns http://localhost:3000 --vp http://localhost:4000
```

## Adding tests
- Add unit tests under `neuroswarm/tests/` and integration tests under `scripts/integration/`.
- Update `neuroswarm/package.json` with `test:…` scripts (CI uses `pnpm -C neuroswarm test` or `test:sources`.
- Add CI steps that start `ns`, `gateway`, `vp` in a runner, wait for `/health`, and run the integration scripts.