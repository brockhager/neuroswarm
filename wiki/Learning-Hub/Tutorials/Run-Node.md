# Tutorial: Run a NeuroSwarm Node

[← Learning Hub](../README.md) | [← Tutorials](./README.md)

**Difficulty**: Beginner  
**Time**: 5-15 minutes (depending on method)  
**Prerequisites**: Docker (recommended) or Node.js 18+

## What You'll Learn

- How to run different node types (NS, Gateway, VP, Admin)
- Docker vs native setup trade-offs
- Production configuration and monitoring
- Troubleshooting common issues

---

## Quick Start (< 5 minutes)

**Automated setup with Docker:**

### Windows (PowerShell)
```powershell
cd neuroswarm\onboarding
.\onboard.ps1

# With detached mode (background)
.\onboard.ps1 -Detach

# Specific service only
.\onboard.ps1 -Service "ns-node"
```

### Linux/macOS (Bash)
```bash
cd neuroswarm/onboarding
./onboard.sh

# With detached mode
./onboard.sh --detach

# Specific service
./onboard.sh --service ns-node
```

**What happens:**
1. ✅ Checks Docker installation
2. ✅ Validates docker-compose.yml
3. ✅ Starts all 6 services with health checks
4. ✅ Waits for services to be healthy
5. ✅ Runs connectivity tests
6. ✅ Displays status dashboard

---

## Understanding Node Types

> 📌 **Port Reference**: See [Port Configuration](../../Ports.md) for complete port assignments and configuration.

### NS Node (Brain) — Port 3009
**Purpose**: Consensus engine, canonical chain authority, mempool management

**When to run:**
- You want to participate in consensus
- You're running a validator node
- You need full chain state

**Resource requirements:**
- CPU: 2+ cores
- Memory: 2GB+ RAM
- Disk: 10GB+ (grows with chain)

**Configuration:**
```javascript
// ns-node/config.json
{
  "port": 3009,
  "network": {
    "maxPeers": 50,
    "discoveryInterval": 30000
  },
  "consensus": {
    "blockTime": 5000,
    "validatorStake": 1000
  }
}
```

### Gateway Node — Port 8080
**Purpose**: API gateway, mempool admission, source validation

**When to run:**
- You're building a frontend application
- You need REST API access
- You want to submit transactions

**Resource requirements:**
- CPU: 1+ cores
- Memory: 512MB+ RAM
- Disk: 1GB

**Configuration:**
```javascript
// gateway-node/config.json
{
  "port": 8080,
  "nsNodeUrl": "http://localhost:3009",
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 100
  }
}
```

### VP Node (Validator/Producer) — Port 3002
**Purpose**: Block production, IPFS publishing, attestation

**When to run:**
- You're a registered validator
- You have stake in the network
- You want to earn validation rewards

**Resource requirements:**
- CPU: 2+ cores
- Memory: 4GB+ RAM
- Disk: 20GB+ (IPFS storage)

**Configuration:**
```javascript
// vp-node/config.json
{
  "port": 3002,
  "nsNodeUrl": "http://localhost:3009",
  "validator": {
    "privateKey": "path/to/validator.key",
    "stake": 5000
  },
  "ipfs": {
    "enabled": true,
    "apiUrl": "http://localhost:5001"
  }
}
```

### Admin Node — Port 3000
**Purpose**: Dashboard, governance, monitoring

**When to run:**
- You need visual monitoring
- You're managing governance proposals
- You want real-time metrics

**Resource requirements:**
- CPU: 1 core
- Memory: 256MB RAM
- Disk: 500MB

---

## Setup Methods Comparison

| Feature | Docker (Recommended) | Native |
|---------|---------------------|--------|
| **Setup Time** | < 5 minutes | 15-30 minutes |
| **Dependencies** | Docker only | Node.js, pnpm, IPFS, etc. |
| **Isolation** | ✅ Containerized | ❌ System-wide installs |
| **Updates** | `docker-compose pull` | Manual git pull + rebuild |
| **Debugging** | `docker logs <service>` | Direct log access |
| **Performance** | ~5% overhead | Native speed |
| **Best For** | Production, testing | Development, debugging |

---

## Method 1: Docker Setup (Recommended)

### Prerequisites
```powershell
# Verify Docker is running
docker --version
# Expected: Docker version 24.0.0 or higher

docker-compose --version
# Expected: Docker Compose version v2.20.0 or higher
```

### Start All Services
```powershell
cd neuroswarm/onboarding
docker-compose up -d
```

### Verify Health
```powershell
docker-compose ps

# Expected output:
# NAME           STATUS         PORTS
# ns-node        Up (healthy)   0.0.0.0:3009->3009/tcp
# gateway-node   Up (healthy)   0.0.0.0:8080->8080/tcp
# vp-node        Up (healthy)   0.0.0.0:3002->3002/tcp
# admin-node     Up (healthy)   0.0.0.0:3000->3000/tcp
# ns-llm         Up (healthy)   0.0.0.0:5555->5555/tcp
# ns-web         Up (healthy)   0.0.0.0:3010->3010/tcp
```

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f ns-node

# Last 50 lines
docker-compose logs --tail=50 gateway-node
```

### Stop Services
```powershell
# Graceful shutdown
docker-compose down

# With volume cleanup
docker-compose down -v
```

---

## Method 2: Native Setup

### Prerequisites
```powershell
# Install Node.js 18+
node --version  # v18.0.0 or higher

# Install pnpm
npm install -g pnpm@10

# Install dependencies
cd neuroswarm
pnpm install -w
```

### Start NS Node (Required First)
```powershell
cd neuroswarm
$env:PORT=3009
node ns-node/server.js
```

**Wait for:** `NS-node listening on port 3009`

### Start Gateway Node (New Terminal)
```powershell
cd neuroswarm
$env:PORT=8080
$env:NS_NODE_URL="http://127.0.0.1:3009"
$env:NS_CHECK_EXIT_ON_FAIL="false"
node gateway-node/server.js
```

**Wait for:** `Gateway-node listening on port 8080`

### Start VP Node (New Terminal)
```powershell
cd neuroswarm
$env:PORT=3002
$env:NS_NODE_URL="http://127.0.0.1:3009"
node vp-node/server.js
```

### Start Admin Node (New Terminal)
```powershell
cd neuroswarm/admin-node
$env:PORT=3000
pnpm start
```

### Verify Connectivity
```powershell
node neuroswarm/scripts/checkNodeConnectivityClean.mjs --ns http://localhost:3009 --gateway http://localhost:8080 --ci
```

---

## Production Configuration

### Environment Variables

**NS Node:**
```bash
PORT=3009
LOG_LEVEL=info
NETWORK_ID=mainnet
MAX_PEERS=100
BLOCK_TIME_MS=5000
```

**Gateway Node:**
```bash
PORT=8080
NS_NODE_URL=http://ns-node:3009
NS_CHECK_RETRIES=5
NS_CHECK_EXIT_ON_FAIL=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

**VP Node:**
```bash
PORT=3002
NS_NODE_URL=http://ns-node:3009
VALIDATOR_PRIVATE_KEY=/secrets/validator.key
IPFS_API_URL=http://localhost:5001
BLOCK_PRODUCTION_ENABLED=true
```

### Security Hardening

**1. Use secrets management:**
```yaml
# docker-compose.yml
services:
  vp-node:
    secrets:
      - validator_key
      
secrets:
  validator_key:
    file: ./secrets/validator.key
```

**2. Enable TLS:**
```javascript
// ns-node/config.json
{
  "tls": {
    "enabled": true,
    "cert": "/certs/server.crt",
    "key": "/certs/server.key"
  }
}
```

**3. Firewall rules:**
```bash
# Allow only necessary ports
sudo ufw allow 3009/tcp  # NS node
sudo ufw allow 8080/tcp  # Gateway (if public)
sudo ufw deny 3002/tcp   # VP node (internal only)
```

### Resource Limits

**Docker Compose:**
```yaml
services:
  ns-node:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

**Native (systemd):**
```ini
[Service]
MemoryLimit=2G
CPUQuota=200%  # 2 cores
TasksMax=4096
```

---

## Monitoring

### Health Checks

**HTTP endpoints:**
```bash
# NS Node
curl http://localhost:3009/health
# Expected: {"status":"ok","uptime":1234,"peers":5}

# Gateway
curl http://localhost:8080/health
# Expected: {"status":"ok","nsConnected":true}

# VP Node
curl http://localhost:3002/health
# Expected: {"status":"ok","ipfsConnected":true,"validatorActive":true}
```

### Prometheus Metrics

**Start monitoring stack:**
```powershell
cd neuro-services
pnpm monitoring:start
```

**Access dashboards:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

**Key metrics:**
- `neuroswarm_block_height` — Current chain height
- `neuroswarm_mempool_size` — Pending transactions
- `neuroswarm_peer_count` — Connected peers
- `neuroswarm_inference_latency_p95` — AI latency (ms)

### Log Aggregation

**With Docker:**
```yaml
# docker-compose.yml
services:
  ns-node:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**With ELK Stack:**
```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-8.0.0-linux-x86_64.tar.gz

# Configure
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/neuroswarm/*.log
```

---

## Troubleshooting

### Issue: NS node won't start

**Symptoms:**
```
Error: EADDRINUSE: address already in use :::3009
```

**Solution:**
```powershell
# Find process using port 3009
netstat -ano | findstr :3009

# Kill process (replace <PID> with actual PID)
taskkill /PID <PID> /F

# Or use different port
$env:PORT=3019; node ns-node/server.js
```

---

### Issue: Gateway can't connect to NS

**Symptoms:**
```
Warn: NS health check failed, retrying...
```

**Solution:**
```powershell
# 1. Verify NS node is running
curl http://localhost:3009/health

# 2. Check NS_NODE_URL
echo $env:NS_NODE_URL
# Should be: http://127.0.0.1:3009 (not localhost if Docker)

# 3. Increase retries
$env:NS_CHECK_RETRIES=10
$env:NS_CHECK_INITIAL_DELAY_MS=5000
```

---

### Issue: VP node not producing blocks

**Symptoms:**
- No blocks created after 60 seconds
- `validatorActive: false` in health check

**Solution:**
```powershell
# 1. Verify validator registration
curl http://localhost:3009/api/validators/<your-pubkey>

# 2. Check stake
# Minimum stake: 1000 tokens

# 3. Verify private key
# File must exist and be readable
ls vp-node/validator.key

# 4. Check logs
docker-compose logs vp-node | grep -i "error"
```

---

### Issue: High memory usage

**Symptoms:**
- Docker container OOM killed
- Process using > 4GB RAM

**Solution:**
```powershell
# 1. Check mempool size
curl http://localhost:3009/api/mempool | jq '.count'

# 2. Increase memory limit
# docker-compose.yml
services:
  ns-node:
    deploy:
      resources:
        limits:
          memory: 4G

# 3. Clear old data
docker-compose down -v  # WARNING: Deletes all data
```

---

### Issue: Slow inference (NS-LLM)

**Symptoms:**
- P95 latency > 200ms
- Timeout errors

**Solution:**
```powershell
# 1. Check Ollama status
curl http://localhost:11434/api/tags

# 2. Verify model loaded
curl http://localhost:5555/health
# Expected: {"status":"ok","model":"llama3.2:1b","loaded":true}

# 3. Warm up cache
curl -X POST http://localhost:5555/api/infer -d '{"prompt":"hello"}'

# 4. Reduce concurrency
# ns-llm/config.json
{
  "maxConcurrentInferences": 2  # Default: 4
}
```

---

## Performance Tuning

### NS Node Optimization

**Increase block size:**
```javascript
// ns-node/config.json
{
  "consensus": {
    "maxBlockSize": 1024,  // Default: 512 transactions
    "blockTime": 3000      // Default: 5000ms
  }
}
```

**Tune mempool:**
```javascript
{
  "mempool": {
    "maxSize": 10000,           // Default: 5000
    "evictionPolicy": "fifo",   // or "fee-based"
    "maxAge": 3600000           // 1 hour in ms
  }
}
```

### Gateway Node Optimization

**Enable caching:**
```javascript
// gateway-node/config.json
{
  "cache": {
    "enabled": true,
    "ttl": 60000,        // 1 minute
    "maxSize": 1000      // entries
  }
}
```

**Increase rate limits:**
```javascript
{
  "rateLimit": {
    "windowMs": 60000,
    "maxRequests": 1000  // Default: 100
  }
}
```

### VP Node Optimization

**IPFS tuning:**
```bash
# Increase IPFS connection limit
ipfs config Swarm.ConnMgr.HighWater 1000
ipfs config Swarm.ConnMgr.LowWater 600

# Enable experimental features
ipfs config --json Experimental.Libp2pStreamMounting true
```

---

## Next Steps

✅ **Join the network** — Register as validator and start earning rewards
✅ **Build applications** — Use Gateway API to integrate NeuroSwarm
✅ **Monitor performance** — Set up Grafana dashboards
✅ **Contribute** — Submit proposals or develop plugins

---

## Related Resources

- [Architecture Overview](../Core-Concepts/Architecture.md) — Understand how nodes interact
- [API Reference](../../API/Gateway-API.md) — Complete endpoint documentation
- [Governance Guide](../Core-Concepts/Governance.md) — Participate in decision-making
- [Onboarding Quick Setup](../../Onboarding/Quick-Setup.md) — Automated setup details
- [Performance Benchmarks](../../Performance/Benchmark-Results.md) — Expected performance metrics

---

Last updated: 2025-01-28
