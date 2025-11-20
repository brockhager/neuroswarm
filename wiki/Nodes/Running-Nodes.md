````markdown
Gateway source policies (environment variables):
- `GATEWAY_SOURCES_MAX_PER_TX` (default 5) — maximum number of adapter queries allowed per `POST /v1/tx` to prevent abusive requests.
- `GATEWAY_SOURCES_QUERY_TIMEOUT_MS` (default 2000) — adapter query timeout in milliseconds (gateway will treat timeouts as adapter failures).
- `GATEWAY_SOURCES_CACHE_TTL_MS` (default 60000) — TTL for adapter response cache that reduces load on external sources.
Example usage when starting gateway:

```powershell
GATEWAY_SOURCES_MAX_PER_TX=3 GATEWAY_SOURCES_QUERY_TIMEOUT_MS=1500 GATEWAY_SOURCES_CACHE_TTL_MS=30000 PORT=8080 NS_NODE_URL=http://localhost:3000 node gateway-node/server.js
```

# Run Nodes (Standalone & Integrated)

> NOTE: This doc is synced to the project Wiki and the GitHub Wiki is the canonical source for contributors and users: https://github.com/brockhager/neuroswarm/wiki

This document describes how to run the NeuroSwarm nodes (ns-node, gateway-node, vp-node) individually and together, how to validate connectivity, log outputs, and run basic consensus/PoS tests.

Prerequisites
- Node.js 20+ and pnpm installed
- Use `pnpm` workspace to install dependencies
- Ports required: ns-node (3000), gateway-node (8080), vp-node (4000), unless overridden

## Windows (persistent CMD) and start scripts

For convenience we provide a Windows-specific start script `start-windows.bat` for each node. These scripts:
- Open a new Command Prompt window so the node runs in a persistent terminal for monitoring
- Default to `--status` (heartbeat enabled) to emit periodic heartbeats
- Keep the window open on exit so you can inspect errors

Example: Start `ns-node` from Windows Command Prompt:
```powershell
cd ns-node
start-windows.bat
```

If you prefer a direct foreground start for debugging you can run `node server.js --status` from the node folder.

### Example `start-windows.bat` (Windows ZIP artifacts)

Each Windows release ZIP contains a `start-windows.bat` helper that opens a new CMD window and launches the node with a default `--status` flag:

```
@echo off
rem Starts server in a new command window and keeps it open (for debugging/monitoring)
start cmd /k "node server.js --status"
```

The script above keeps the CMD window open so log output and crash traces remain visible.

### Verifying the Windows artifact & start script (maintainers)

To confirm a release package contains the `start-windows.bat` helper and that it defaults to emitting heartbeat `--status` in the Windows ZIP, run the following steps:

PowerShell example (after downloading the ZIP):

```powershell
# Extract ZIP to a temp folder
Expand-Archive ns-node-win-x64.zip -DestinationPath ns-node

# Verify the file exists
Test-Path ns-node\start-windows.bat

# Show contents and grep for expected flags
Get-Content ns-node\start-windows.bat | Select-String "--status"
Get-Content ns-node\start-windows.bat | Select-String "cmd /k"
```

CI will perform the same check automatically using the packaging validation step and `neuroswarm/scripts/confirm-heartbeat-from-logs.mjs`.

... (content copied from `neuroswarm/docs/run-nodes.md`)
### Heartbeats (status/monitoring)

When nodes are started with `--status` (or when the environment variable `STATUS=1` is set) they emit a standard heartbeat line once per `STATUS_INTERVAL_MS` (default 60 seconds). The format is intended to be human-friendly and machine-parsable by CI/monitoring scripts:

```
[NS|GW|VP][YYYY-MM-DDTHH:MM:SS.sssZ] heartbeat | gateways=http://...:OK,http://...:DOWN validators=3 mempool=12 height=42 verifiedBlocks=42 sourcesValid=4 uptime=47s
```

Fields you can expect:
- gateways: comma-separated url:OK|DOWN statuses
- validators: number of registered validators
- mempool: mempool size (or `unknown`), if available
- height: canonical chain height
- verifiedBlocks: blocks verified by this node
- sourcesValid: number of sources verified in recent blocks
- uptime: process uptime in seconds

This heartbeat format is used by `confirm-heartbeat-from-logs.mjs` in `neuroswarm/scripts/` and by CI to assert that nodes are active during integration scenarios.

````
