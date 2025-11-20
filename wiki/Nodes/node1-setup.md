# NeuroSwarm Node1 Setup Guide

## Overview
This guide provides step-by-step instructions for setting up and running NeuroSwarm Node1, a standard (non-admin) node in the NeuroSwarm network.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.x or higher
- **pnpm**: Package manager (recommended)
- **Operating System**: Linux, macOS, or Windows
- **Network**: Internet connection for swarm communication

### Installation Steps

#### 1. Install Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (using Homebrew)
brew install node

# Windows (download from nodejs.org)
# Download and install LTS version from https://nodejs.org/
```

#### 2. Install pnpm
```bash
npm install -g pnpm
```

#### 3. Verify Installations
```bash
node --version  # Should show v18.x.x
pnpm --version  # Should show version number
```

## Environment Setup

### 1. Navigate to Node Directory
```bash
cd /neuroswarm/node1/
```

### 2. Review Configuration
The `.env` file contains:
- Node name: `node1`
- Port: `9090`
- Gateway URL: `https://gateway.neuroswarm.net`
- Genesis config path
- Device fingerprint

### 3. Review Genesis Configuration
The `config/ns-genesis.json` contains:
- Swarm join parameters
- Allowed contributor roles
- Device/IP whitelist
- Network discovery settings

## Running the Node

### Unix/Linux/macOS
```bash
# Make script executable (first time only)
chmod +x scripts/start-node.sh

# Start the node
./scripts/start-node.sh
```

### Windows PowerShell
```powershell
# Run with execution policy bypass if needed
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Start the node
.\scripts\start-node.ps1
```

## Verification

### 1. Check Node Status
```bash
curl http://localhost:9090/v1/status
```

Expected response:
```json
{
  "node": "node1",
  "status": "active",
  "type": "standard",
  "uptime": "0d 0h 5m",
  "connections": 1
}
```

### 2. Check Metrics
```bash
curl http://localhost:9090/v1/metrics
```

Expected response includes:
- CPU usage
- Memory usage
- Network I/O
- Governance log entries

### 3. Check Logs
```bash
# View recent logs
tail -f logs/node1.log

# Check for governance logging
grep "governance" logs/node1.log
```

## Governance Logging

Node1 is configured to automatically log governance actions. Check the main governance log:

```bash
# From project root
tail -f wp_publish_log.jsonl | grep node1
```

Expected governance log entry:
```json
{
  "action": "node-provision",
  "node": "node1",
  "details": "Standard NS node provisioned in /neuroswarm/node1/ with configs, scripts, and docs",
  "timestamp": "2025-11-13 12:00"
}
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 9090
lsof -i :9090  # Linux/macOS
netstat -ano | findstr :9090  # Windows

# Kill process or change port in .env
PORT=9091
```

#### Permission Errors
```bash
# Fix script permissions
chmod +x scripts/start-node.sh
```

#### Network Connection Issues
- Verify internet connectivity
- Check firewall settings for port 9090
- Ensure gateway.neuroswarm.net is reachable

### Logs Location
- Application logs: `logs/node1.log`
- Governance logs: `../../wp_publish_log.jsonl`
- System logs: Check system journal/logs

## Next Steps

1. **Monitor Node Health**: Use `/v1/status` and `/v1/metrics` endpoints
2. **Participate in Governance**: Node will automatically log governance actions
3. **Contribute to Swarm**: Node1 can now participate in the NeuroSwarm network
4. **Scale Up**: Consider provisioning additional nodes (node2, node3, etc.)

## Support

For issues or questions:
- Check the main NeuroSwarm documentation
- Review governance logs for errors
- Contact the NeuroSwarm community

---

*Node1 Setup Complete - Ready for NeuroSwarm participation!*