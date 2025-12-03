# NeuroSwarm Port Allocation

This document lists the reserved ports for all NeuroSwarm services and nodes.

## Core Services

| Service | Port | Description |
| :--- | :--- | :--- |
| **NS-Server** | `3009` | Canonical chain authority (ns-node/server.js) |
| **NS-Node Client (Browser)** | `3009` | Browser-based NS client (NS-B) |
| **NS-Node Client (Electron)** | `3011` | Electron Desktop App (NS-E) |
| **Gateway Node** | `8080` | Anti-spam gateway with mempool |
| **VP Node** | `4000` | Block producer and consensus engine |
| **Admin Node** | `3000` | Dashboard, governance, monitoring |
| **NS-LLM** | `8080` | Local AI inference service (NS-LLM Server) |
| **NS-Web** | `3010` | React web interface (Phase E) |
| **Router API** | `4001` | Router API service |

## Additional Services
| Service | Port | Description |
| :--- | :--- | :--- |
| **Neuro Services** | `3007` | API Gateway & Adapter Service |
| **Neuro Runner** | `3008` | AI Bridge |
| **Neuro Web (Alt)** | `3005` | Chat Interface & Frontend |
| **Alert Sink** | `3010` | Alert monitoring and notification service |
| **Agent 9 Discord Bot** | N/A | Discord integration (connects to NS-LLM) |
| **Postgres (Router API)** | `5433` | PostgreSQL database for Router API |
| **Neuro Web (Alt)** | `3005` | Chat Interface & Frontend |

## External Dependencies

| Service | Port | Description |
| :--- | :--- | :--- |
| **IPFS Daemon** | `5001` | Decentralized storage API |
| **Ollama** | `11434` | Local LLM inference engine |
## Configuration Notes

- **NS-Server**: Uses `PORT` env var. Defaults to 3009.
- **Gateway Node**: Uses `PORT` env var. Defaults to 8080. Requires `NS_NODE_URL` to point to NS-Server.
- **VP Node**: Uses `PORT` env var. Defaults to 4000. Requires `NS_NODE_URL` and `GATEWAY_URL`.
- **Admin Node**: Uses `PORT` env var. Defaults to 3000.
- **NS-LLM**: Uses `PORT` env var. Defaults to 8080. Connects to Ollama at 11434.
- **Router API**: Uses `PORT` env var. Defaults to 4001. Requires `DATABASE_URL` for Postgres connection.
- **Neuro Services**: Uses `PORT` env var. Defaults to 3007.
- **NS-Web**: Next.js app. Uses `PORT` env var. Defaults to 3010.
- **Alert Sink**: Uses `PORT` env var. Defaults to 3010.
- **Agent 9**: Discord bot. Requires `DISCORD_BOT_TOKEN` and connects to NS-LLM at port 8080.
- **Postgres**: Docker container. Maps to host port 5433.
- **NS-LLM**: Uses `PORT` env var. Defaults to 5555. Connects to Ollama at 11434.
- **Neuro Services**: Uses `PORT` env var. Defaults to 3007.
- **NS-Web**: Next.js app. Uses `PORT` env var. Defaults to 3010.

## Port Conflicts

If you encounter port conflicts, you can override the default ports using environment variables:

```powershell
# Windows PowerShell
$env:PORT=3019; node ns-node/server.js

# Bash
PORT=3019 node ns-node/server.js
```

## Quick Reference (Docker Compose)

See `neuroswarm/onboarding/docker-compose.yml` for the complete service configuration with all port mappings and health checks.

## Related Documentation

---

**Source of Truth**: `neuroswarm/shared/ports.js`  
**Launch Scripts**: `neuroswarm/start/` directory contains individual batch scripts for each service  
**Last Updated**: December 3, 2025
---

**Source of Truth**: `neuroswarm/shared/ports.js`  
**Last Updated**: November 28, 2025
