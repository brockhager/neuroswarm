# NeuroSwarm Port Allocation

This document lists the reserved ports for all NeuroSwarm services and nodes.

| Service | Port | Description |
| :--- | :--- | :--- |
| **NS-B (Browser)** | `3009` | Browser-based NS Node (Moved from 3000) |
| **NS-E (Electron)** | `3011` | Electron Desktop App (Moved from 3000) |
| **Neuro Services** | `3007` | API Gateway & Adapter Service (Moved from 3001/3006) |
| **Neuro Runner** | `3008` | AI Bridge (Moved from 3002) |
| **Neuro Web** | `3005` | Chat Interface & Frontend (Moved from 3003) |
| **VP Node** | `4000` | Validator & Consensus Node |
| **Gateway Node** | `8080` | Public HTTP Gateway |
| **IPFS Daemon** | `5001` | Decentralized Storage API |
| **Ollama** | `11434` | Local AI Inference Engine |

## Configuration Notes
- **Neuro Services**: Uses `PORT` env var. Defaults to 3006 in `start-all-nodes.bat`.
- **Neuro Web**: Next.js app. Proxies `/v1` requests to `localhost:3006`.
