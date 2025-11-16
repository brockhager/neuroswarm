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
