# NeuroSwarm Launch Scripts

Individual batch scripts for starting each NeuroSwarm component independently.

## Quick Start

### Minimal Setup (Chat Only)
```cmd
start-ns-node.bat
```
Access at: http://localhost:3009

### Core Network (3 Nodes)
```cmd
start-ns-node.bat
start-gateway-node.bat
start-vp-node.bat
```

### Full Stack
```cmd
start-all-nodes.bat
```
Opens all services automatically.

## Available Scripts

### Infrastructure Services
- **`start-ipfs.bat`** - IPFS daemon (port 5001)
- **`start-ollama.bat`** - Ollama AI engine (port 11434)
- **`start-postgres.bat`** - PostgreSQL database (port 5433)

### Core NeuroSwarm Nodes
- **`start-ns-node.bat`** - NS Node (port 3009) - Core brain/consensus ⭐ **START THIS FIRST**
- **`start-gateway-node.bat`** - Gateway Node (port 8080) - Mempool validation
- **`start-vp-node.bat`** - VP Node (port 4000) - Validator/Producer

### Services & APIs
- **`start-ns-llm.bat`** - NS-LLM Server (port 3006)
- **`start-router-api.bat`** - Router API (port 4001)
- **`start-neuro-services.bat`** - neuro-services (port 3007)
- **`start-neuro-runner.bat`** - neuro-runner (port 3008)
- **`start-alert-sink.bat`** - alert-sink (port 3010)
- **`start-admin-node.bat`** - Admin Node (port 3000)

### Web Interfaces
- **`start-neuro-web.bat`** - neuro-web (port 3005) - Main web UI

## Dependency Order

Some services depend on others:

1. **NS Node** must run first (other nodes connect to it)
2. **Postgres** must run before Router API
3. **Ollama** should run before NS-LLM

## Features

Each script:
- ✅ Validates dependencies exist
- ✅ Shows clear error messages
- ✅ Displays service URL and port
- ✅ Notes required dependencies
- ✅ Handles relative paths correctly

## Troubleshooting

**"Address already in use" error?**
- Service is already running
- Check with: `netstat -ano | findstr :<port>`

**"Directory not found" error?**
- Run scripts from the `start/` folder
- Or double-click the .bat file

**Service won't start?**
- Check if dependencies are installed (IPFS, Ollama, Docker, Node.js)
- Read the error message for missing requirements
