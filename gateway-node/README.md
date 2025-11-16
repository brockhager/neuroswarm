Gateway Node - Startup and configuration

The gateway node forwards `v1` requests and forwards transactions to `ns-node`. To configure startup behavior, set the following environment variables:

- `NS_NODE_URL` - the `ns-node` base URL (e.g., `http://localhost:3000`). If not set, the gateway will not attempt to check NS health.
- `NS_CHECK_RETRIES` - number of times to retry connecting to `ns-node` (default: `5`).
- `NS_CHECK_INITIAL_DELAY_MS` - initial backoff in ms between retries (default: `500`).
- `NS_CHECK_MAX_DELAY_MS` - maximum backoff in ms for retries (default: `30000`).
- `NS_CHECK_EXIT_ON_FAIL` - set to `true` to force the gateway to exit if `ns-node` is unreachable after retries; otherwise it continues running with degraded functionality (default: `false`).

Note: the gateway includes `GET /debug/peers` which reports whether the configured `ns-node` is reachable (`nsOk`), aiding debugging in CI and local dev.
Gateway Node (local test harness)
================================

This lightweight gateway is used for local development and automated tests.

Environment variables:
- `PORT` - port to listen on (default: 8080)
- `NS_NODE_URL` - URL to the ns-node service to check health on startup (optional)
- `NS_CHECK_RETRIES` - number of retries for healthchecking ns-node (default: 5)

The gateway will ping `NS_NODE_URL/health` on startup using an exponential backoff; if it remains unreachable, the gateway exits with a non-zero code. This is used to enforce that the gateway can't start without a reachable ns-node during test runs.

The gateway exposes these debug endpoints for tests:
- `GET /debug/last-message` - last message recorded
- `GET /history` - full message history
- `GET /health` - health information

It sanitizes logs by masking the Authorization header when printing messages.
# Gateway Node

A lightweight gateway node for NeuroSwarm used for testing and as a minimal gateway runtime.

Endpoints:
- POST /v1/chat - Accepts chat messages and returns an echo-like forwarded response
- GET /debug/last-message - Return the last message recorded by the gateway
- GET /history - Return recorded messages

Configuration:
- PORT - port to listen on (default 8080)

Usage:
```
cd gateway-node
npm ci
npm start
```
