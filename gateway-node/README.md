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
