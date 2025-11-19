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

... (content copied from `neuroswarm/docs/run-nodes.md`)

````
