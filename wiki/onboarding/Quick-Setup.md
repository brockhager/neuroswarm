# Quick Setup Guide

**⚡ Zero-Configuration Onboarding** | Target time: < 5 minutes

This guide walks you through setting up a complete NeuroSwarm development environment using our automated onboarding scripts.

## Prerequisites

### Required Software

**Docker Desktop** (includes Docker Compose)
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/) + [Docker Compose](https://docs.docker.com/compose/install/)

**Minimum System Requirements:**
- 8GB RAM (16GB recommended for full stack)
- 10GB free disk space
- Docker Desktop running

### Optional (For Native Development)

- **Node.js**: v18+ (if running services natively)
- **pnpm**: v10+ (package manager)
- **Rust**: Latest stable (for `neuro-infra` daemon)

## Quick Start (Automated)

### 1. Clone Repository

```bash
git clone https://github.com/brockhager/neuro-infra.git
cd neuro-infra/neuroswarm
```

### 2. Run Onboarding Script

**Unix/Linux/macOS:**
```bash
chmod +x onboard.sh
./onboard.sh
```

**Windows (PowerShell):**
```powershell
.\onboard.ps1
```

That's it! The script will:
1. ✓ Check Docker installation
2. ✓ Verify Docker Compose
3. ✓ Start all core services
4. ✓ Wait for health checks
5. ✓ Display access URLs

**Expected completion time: < 5 minutes**

### 3. Verify Services

Once started, you'll see:

```
✅ NeuroSwarm is running!

Dashboard: http://localhost:3000
API Docs:  http://localhost:3009/api-docs
```

**Core Services:**
- **NS Node (Brain)**: http://localhost:3009 — Consensus engine
- **Gateway Node**: http://localhost:8080 — API gateway and mempool
- **VP Node (Validator)**: http://localhost:3002 — Block production
- **Admin Node**: http://localhost:3000 — Governance dashboard

## Advanced Options

### Full Stack (with AI + Web UI)

```bash
# Unix/Linux/macOS
./onboard.sh --full

# Windows
.\onboard.ps1 -Full
```

**Additional services:**
- **NS-LLM**: http://localhost:5555 — Local AI inference
- **Web UI**: http://localhost:3010 — React frontend

### Background Mode (Detached)

```bash
# Unix/Linux/macOS
./onboard.sh --detach

# Windows
.\onboard.ps1 -Detach
```

Services run in background. Use `docker compose logs -f` to view logs.

### Rebuild (After Code Changes)

```bash
# Unix/Linux/macOS
./onboard.sh --rebuild

# Windows
.\onboard.ps1 -Rebuild
```

Forces rebuild of Docker images with latest code.

### Combine Options

```bash
# Full stack in background with rebuild
./onboard.sh --full --detach --rebuild
```

## What's Running?

### Core Services (Always Started)

| Service | Port | Purpose |
|---------|------|---------|
| **ns-node** | 3009 | Brain (consensus, validation) |
| **gateway-node** | 8080 | API gateway, mempool management |
| **vp-node** | 3002 | Validator/producer (block creation) |
| **admin-node** | 3000 | Governance dashboard |

### Optional Services (--full flag)

| Service | Port | Purpose |
|---------|------|---------|
| **ns-llm** | 5555 | Local AI inference (Ollama integration) |
| **ns-web** | 3010 | React web interface |

### Persistent Storage

**Docker Volumes:**
- `ns-data` — Blockchain data, manifests
- `ns-tmp` — Temporary files, logs
- `llm-models` — AI model cache (if using NS-LLM)

## Common Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f ns-node
docker compose logs -f gateway-node
```

### Check Status

```bash
docker compose ps
```

### Stop Services

```bash
docker compose down
```

### Restart Services

```bash
docker compose restart
```

### Clean Reset

```bash
# Stop and remove all containers, networks
docker compose down -v

# Remove volumes (fresh state)
docker volume prune
```

## Troubleshooting

### "Docker not found"

**Solution:** Install Docker Desktop and ensure it's running.

**Verify:**
```bash
docker --version
docker info
```

### "Port already in use"

**Error:** `bind: address already in use`

**Solution:** Another service is using the port. Find and stop it:

**Unix/Linux/macOS:**
```bash
lsof -i :3009  # Check which process uses port 3009
kill -9 <PID>  # Kill the process
```

**Windows:**
```powershell
netstat -ano | findstr :3009
taskkill /PID <PID> /F
```

### Services not healthy

**Symptom:** Services stuck in "starting" state

**Solution:**
1. Check logs: `docker compose logs <service-name>`
2. Verify dependencies: NS-node must be healthy first
3. Increase health check timeout (edit `docker-compose.yml`)

**Common causes:**
- Insufficient resources (increase Docker memory limit)
- Slow disk (especially on Windows with WSL2)

### Cannot connect to service

**Symptom:** `curl http://localhost:3009/health` fails

**Solution:**
1. Wait 30 seconds (services need startup time)
2. Check Docker network: `docker network ls`
3. Verify container status: `docker compose ps`
4. Restart specific service: `docker compose restart ns-node`

### NS-LLM fails to start (--full mode)

**Symptom:** ns-llm container exits immediately

**Solution:**
- Ensure Ollama models downloaded: `docker compose exec ns-llm ollama pull llama2`
- Check available RAM (LLM requires 4GB+)
- Review logs: `docker compose logs ns-llm`

## Next Steps

### For Contributors

1. **Read Contributor Guide**: [wiki/Development/Contributor-Guide.md](../wiki/Development/Contributor-Guide.md)
2. **Review Architecture**: [wiki/Technical/Architecture.md](../wiki/Technical/Architecture.md)
3. **Check Phase Progress**: [wiki/Progress/checklist.md](../wiki/Progress/checklist.md)
4. **Join Discord**: [Community channels](../README.md#community)

### Development Workflow

**Native development** (without Docker):
```bash
# Install dependencies
pnpm install -w

# Start NS node
cd neuroswarm
pnpm --filter ns-node start

# In another terminal: Start gateway
pnpm --filter gateway-node start
```

See [Native Development Guide](../wiki/Development/Native-Setup.md) for details.

### Testing Your Setup

**Smoke test** (verify connectivity):
```bash
cd neuroswarm
node scripts/checkNodeConnectivityClean.mjs --ns http://localhost:3009 --gateway http://localhost:8080 --ci
```

**Submit test transaction:**
```bash
curl -X POST http://localhost:8080/v1/tx \
  -H "Content-Type: application/json" \
  -d '{"type":"test","payload":"hello"}'
```

**Check mempool:**
```bash
curl http://localhost:3009/v1/mempool
```

## FAQ

### Q: Do I need Rust installed?

**A:** Not for Docker-based setup. Rust is only required for native `neuro-infra` daemon development.

### Q: Can I run individual nodes?

**A:** Yes, use Docker Compose profiles:
```bash
docker compose up ns-node gateway-node  # Only NS + Gateway
```

### Q: How do I update to latest code?

**A:**
```bash
git pull origin main
./onboard.sh --rebuild
```

### Q: Where are logs stored?

**A:** 
- **Docker mode**: `docker compose logs -f`
- **Native mode**: `neuroswarm/tmp/*.log`

### Q: Can I use this for production?

**A:** This setup is for **development only**. Production deployments should use:
- Proper secrets management (not environment variables)
- External database (not ephemeral containers)
- Load balancers and horizontal scaling
- TLS/SSL certificates

See [Production Deployment Guide](../wiki/Infrastructure/Production-Deployment.md) (coming soon).

## Support

**Issues?** Check:
1. [Troubleshooting Guide](../wiki/Support/Troubleshooting.md)
2. [Known Issues](https://github.com/brockhager/neuro-infra/issues)
3. [Discord Community](../README.md#community)

**Found a bug in onboarding?** File an issue:
- **Repo**: https://github.com/brockhager/neuro-infra
- **Label**: `onboarding`, `bug`

---

**Last Updated**: 2025-01-28  
**Tested On**: Docker Desktop 24.0+, Windows 11, macOS 14+, Ubuntu 22.04+
