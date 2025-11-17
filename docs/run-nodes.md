# Run Nodes (Standalone & Integrated)

> NOTE: This doc is synced to the project Wiki and the GitHub Wiki is the canonical source for contributors and users: https://github.com/brockhager/neuro-infra/wiki

This document describes how to run the NeuroSwarm nodes (ns-node, gateway-node, vp-node) individually and together, how to validate connectivity, log outputs, and run basic consensus/PoS tests.

Prerequisites
- Node.js 20+ and pnpm installed
- Use `pnpm` workspace to install dependencies
- Ports required: ns-node (3000), gateway-node (8080), vp-node (4000), unless overridden

Checklist Before Running Nodes

1. Dependencies & Build
   - Install workspace dependencies:

     ```powershell
     pnpm install -w
     pnpm -w build
     ```

   - (Optional) Build per package:

     ```powershell
     pnpm -C neuroswarm build
     pnpm -C neuro-services build
     ```

   - Ensure unit tests pass (fix any open handles): `pnpm -w test:ci`

2. Configuration
   - Default ports:
     - ns-node: 3000 (PORT=3000)
     - gateway-node: 8080 (PORT=8080)
     - vp-node: 4000 (PORT=4000)
   - Gateway expects `NS_NODE_URL`:
     - Set `NS_NODE_URL=http://localhost:3000` when starting gateway
   - vp-node also expects `NS_NODE_URL`:
     - Set `NS_NODE_URL=http://localhost:3000` when starting vp-node
   - Check `neuroswarm/gateway-node/README.md` and `neuroswarm/ns-node/README.md` for other env vars (e.g., `NS_CHECK_RETRIES`, `NS_CHECK_EXIT_ON_FAIL`)

3. Logging & Cleanup
   - Logs are written to `tmp/logs` or console (depending on package). The test harness uses `startServerWithLogs` to capture logs.
   - In tests, the helper `killChild()` is used for cleanup; ensure you follow the same pattern in local scripts when starting nodes.
   - If starting nodes manually, redirect stdout/stderr to files and capture pid for cleanup, e.g.:

     ```powershell
     node neuroswarm/ns-node/server.js > tmp/ns.log 2> tmp/ns.err ; echo $LASTEXITCODE
     node neuroswarm/gateway-node/server.js > tmp/gw.log 2> tmp/gw.err ; echo $LASTEXITCODE
     node neuroswarm/vp-node/server.js > tmp/vp.log 2> tmp/vp.err ; echo $LASTEXITCODE
     ```

4. Health & Connectivity Checks
   - Each node exposes `/health` endpoint. Example:

     ```powershell
     curl -s http://localhost:3000/health
     curl -s http://localhost:8080/health
     curl -s http://localhost:4000/health
     ```

   - Debug endpoints:
     - `GET /debug/peers` (gateway & ns) — check peer visibility
     - `GET /debug/gateways` (ns) — check gateways reported
   - Run `scripts/checkNodeConnectivityClean.mjs` to validate gateway ↔ ns forwarding (CI-friendly `--ci` flag):

     ```powershell
     node neuroswarm/scripts/checkNodeConnectivityClean.mjs --ns http://localhost:3000 --gateway http://localhost:8080 --timeout 2000 --ci
     ```

Standalone Runs
----------------
Run each node standalone to validate it starts and exposes health endpoints.

1. ns-node alone (Port 3000):

   ```powershell
   cd neuroswarm
   PORT=3000 node ns-node/server.js > tmp/ns.log 2> tmp/ns.err & echo $! > tmp/ns.pid
   curl --silent --fail http://localhost:3000/health
   ```

2. gateway-node alone (Port 8080):

   ```powershell
   cd neuroswarm
   PORT=8080 NS_NODE_URL=http://127.0.0.1:3000 NS_CHECK_EXIT_ON_FAIL=false node gateway-node/server.js > tmp/gw.log 2> tmp/gw.err & echo $! > tmp/gw.pid
   curl --silent --fail http://localhost:8080/health
   ```

3. vp-node alone (Port 4000):

   ```powershell
   cd neuroswarm
   PORT=4000 NS_NODE_URL=http://127.0.0.1:3000 node vp-node/server.js > tmp/vp.log 2> tmp/vp.err & echo $! > tmp/vp.pid
   curl --silent --fail http://localhost:4000/health
   ```

Integrated Run: Start nodes and validate network
-----------------------------------------------
Follow this sequence to start an integrated environment and run simple connectivity and consensus steps.

1. Start ns-node first, port 3000

   ```powershell
   pnpm -w install
   cd neuroswarm
   PORT=3000 node ns-node/server.js > tmp/ns.log 2> tmp/ns.err & echo $! > tmp/ns.pid
   ```

2. Start gateway-node pointing to ns-node

   ```powershell
   PORT=8080 NS_NODE_URL=http://127.0.0.1:3000 NS_CHECK_EXIT_ON_FAIL=false node gateway-node/server.js > tmp/gw.log 2> tmp/gw.err & echo $! > tmp/gw.pid
   ```

3. Start vp-node pointing to ns-node

   ```powershell
   PORT=4000 NS_NODE_URL=http://127.0.0.1:3000 node vp-node/server.js > tmp/vp.log 2> tmp/vp.err & echo $! > tmp/vp.pid
   ```

4. Verify /health endpoints

   ```powershell
   curl --silent --fail http://localhost:3000/health
   curl --silent --fail http://localhost:8080/health
   curl --silent --fail http://localhost:4000/health
   ```

5. Post a test transaction to gateway to confirm forwarding

   ```powershell
   curl -s -X POST http://localhost:8080/v1/tx -H "Content-Type: application/json" -d '{"type":"chat","fee":1,"content": "connectivity test"}'
   # Check ns-node mempool
   curl -s http://localhost:3000/v1/mempool
   ```

6. Produce a block via vp-node (if you have a validator key), which posts to NS via `POST /blocks/produce`.
   - Tests use signed validator keys; for a manual run you can use test keys in `neuro-services/tests/test-keys`.
   - Example (from tests):

     ```powershell
     # Example produceBlock script from tests; adapt values as needed
     curl -s -X POST http://localhost:4000/blocks/produce -H "Content-Type: application/json" -d '{"header": {...}, "txs": [...], "signature": "..." }'
     ```

7. Verify the block was accepted by ns (we assume server return `ok: true` or a 200 status) and check logs for SPV proof generation.

Using the installers
--------------------

For end users: download the ZIP for your platform from the GitHub Release page for the project. Extract the ZIP and run the bundled `start.sh` or `start.bat` file. The default gateway installer will attempt to open your browser at `http://localhost:8080` when the gateway is ready.

Start script behavior (Windows `start.bat`) and logging
-------------------------------------------------------

- The packaged `start.bat` script now runs the node in the foreground so logs stream into the current cmd window instead of launching a separate background window.
- If you package using the `--keep-open` flag (or the installer includes the `start.bat` with this behavior), the `start.bat` script will append a `pause` only if the node process exits with a non-zero exit code (i.e., the script will not keep the window open on normal exit).
- When packaged with the `--status` flag, the start scripts set the `STATUS=1` env var inside the script to enable periodic heartbeat messages and connection/disconnect logs from the node. Example packaging command with status logging and keep-open behavior:

```bash
pnpm -C neuroswarm package:bins -- --keep-open --status
```

With `--status` logs you will see timestamped lines such as:

```
[NS-NODE] [2025-11-17T12:00:00.000Z] Heartbeat: gateways=http://localhost:8080:OK validators=2 mempool=0 height=3
[GATEWAY] [2025-11-17T12:00:05.100Z] Connected to ns-node http://localhost:3000
[VP-NODE] [2025-11-17T12:00:30.000Z] Heartbeat: ns=http://localhost:3000 nsReachable=true lastProduceSuccess=true validator=val-xxx
```

These logs are human-readable, timestamped, and printed to stdout so they are visible in the `start.bat` cmd window.

Building installers locally (advanced)
-------------------------------------

Developers can reproduce installers locally by running the packaging script (requires Node 20 and pnpm installed):

```bash
pnpm -C neuroswarm package:bins -- --os linux
pnpm -C neuroswarm package:bins -- --os macos
pnpm -C neuroswarm package:bins -- --os win
```

The packaged ZIP files will be in `neuroswarm/dist/` after the build.


Reverse start order (Gateway first)
-----------------------------------

To validate gateway startup tolerance (so nodes can be started in any order, or gateway starts before ns):

1. Start gateway without ns up and ensure it stays alive (must set `NS_CHECK_EXIT_ON_FAIL=false`):

  ```powershell
  PORT=8080 NS_NODE_URL=http://127.0.0.1:3000 NS_CHECK_EXIT_ON_FAIL=false node gateway-node/server.js > tmp/gw.log 2> tmp/gw.err & echo $! > tmp/gw.pid
  curl -s http://localhost:8080/health
  ```

2. Start ns-node afterwards:

  ```powershell
  PORT=3000 node ns-node/server.js > tmp/ns.log 2> tmp/ns.err & echo $! > tmp/ns.pid
  curl -s http://localhost:3000/health
  ```

3. Validate the gateway sees ns via `GET /debug/peers` and `nsOk: true`:

  ```powershell
  curl -s http://localhost:8080/debug/peers
  ```

4. Start vp-node and validate registration and block production as above.


Validation & Tests (Local)
-------------------------
- Run connectivity smoke test:

  ```powershell
  node neuroswarm/scripts/checkNodeConnectivityClean.mjs --ns http://localhost:3000 --gateway http://localhost:8080 --timeout 2000 --ci
  ```

- Run full service tests in `neuro-services`:

  ```powershell
  pnpm -C neuro-services test:ci
  ```

- Run PoS/equivocation tests if you have local test-key files configured:

  ```powershell
  pnpm -C neuro-services test pos-multi-equivocation.test.ts
  ```

CI Integration Checklist
-------------------------
Use the `neuroswarm/.github/workflows/run-nodes-integration.yml` (or equivalent) to: 
- Run pnpm install -w
- Start ns-node (PORT 3000)
- Start gateway-node (PORT 8080) with `NS_NODE_URL` configured and `NS_CHECK_EXIT_ON_FAIL=false`
- Start vp-node (PORT 4000) with `NS_NODE_URL` configured
- Wait for `/health` endpoints
- Run `node neuroswarm/scripts/checkNodeConnectivityClean.mjs --ci` to validate forwarding
- Run `pnpm -w --filter neuro-services test:ci` (or `pnpm -C neuro-services test:ci`) to run consensus tests (CI-friendly)

Note: PoS test suite (`neuro-services` PoS integration tests) are now required in CI. If these tests fail in integration runs, the CI job will fail and block merges until fixed. Use the locally available tests (e.g., `pnpm -C neuro-services test -- tests/pos-*.test.ts`) to reproduce issues locally and inspect `neuroswarm/tmp/logs` for detailed node logs.
- Capture logs and upload as artifacts if tests fail

Notes & Troubleshooting
------------------------
- If a node fails to start due to missing modules, ensure you ran `pnpm install -w` at the repository root.
- If Node reports ESM issues (require is not defined), convert `require` statements to `import` for ESM packages.
- If a gateway exits on startup because NS is unreachable, verify `NS_CHECK_EXIT_ON_FAIL` is set to `false` in your local environment or CI for integration runs.

References
- Gateway startup behavior and env vars: `neuroswarm/gateway-node/README.md` and `gateway-node/server.js`
- Connectivity check script: `neuroswarm/scripts/checkNodeConnectivityClean.mjs` (CI-friendly)
- Tests for block production: `neuro-services/tests/*` (pos-* tests)
