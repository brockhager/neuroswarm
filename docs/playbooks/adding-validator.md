# Contributor Playbook: Adding a Validator Node

This playbook guides you through the complete process of adding a new validator node to the NeuroSwarm network.

## Overview

Validators are critical network participants that:
- Verify transaction integrity
- Participate in consensus
- Sign attestations for content provenance
- Maintain network security

## Prerequisites

- [x] Completed [Getting Started](../../getting-started.md)
- [x] Familiar with [Development Workflow](../../development.md)
- [x] Access to validator hardware meeting [requirements](../../docs/distribution.md#validator-node)
- [x] Solana keypair for validator identity

## Step 1: Plan Your Validator

### 1.1 Choose Validator Type
```bash
# Full Validator (recommended for production)
NODE_MODE=validator
SOLANA_RPC_URL=https://api.mainnet.solana.com

# Test Validator (for development)
NODE_MODE=validator
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 1.2 Prepare Infrastructure
- **Hardware Requirements:**
  - CPU: 4-8 cores (AMD EPYC or Intel Xeon)
  - RAM: 16-32 GB
  - Storage: 1TB+ NVMe SSD
  - Network: 1Gbps+ dedicated connection

- **Software Requirements:**
  - Ubuntu 20.04+ or RHEL 8+
  - Docker 20.10+
  - systemd for service management

## Step 2: Set Up Validator Identity

### 2.1 Generate Solana Keypair
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"

# Generate new keypair
solana-keygen new --outfile ~/validator-keypair.json

# Or use existing keypair
# cp /path/to/existing-keypair.json ~/validator-keypair.json
```

### 2.2 Configure Validator Identity
```bash
# Set keypair path
export SOLANA_KEYPAIR_PATH=~/validator-keypair.json

# Verify public key
solana-keygen pubkey $SOLANA_KEYPAIR_PATH
```

### 2.3 Fund Validator Account
```bash
# Check balance
solana balance

# Request airdrop on devnet (if testing)
solana airdrop 1

# Or fund from wallet
solana transfer <validator-pubkey> 1 --allow-unfunded-recipient
```

## Step 3: Deploy Validator Software

### 3.1 Using Docker (Recommended)
```bash
# Pull latest image
docker pull ghcr.io/brockhager/neuro-infra:latest

# Create validator data directory
mkdir -p ~/neuroswarm-validator/data
mkdir -p ~/neuroswarm-validator/logs

# Run validator
docker run -d \
  --name neuroswarm-validator \
  --restart unless-stopped \
  -p 8080:8080 \
  -v ~/validator-keypair.json:/app/keys/validator-keypair.json:ro \
  -v ~/neuroswarm-validator/data:/app/data \
  -v ~/neuroswarm-validator/logs:/app/logs \
  -e NODE_MODE=validator \
  -e SOLANA_RPC_URL=https://api.mainnet.solana.com \
  -e SOLANA_KEYPAIR_PATH=/app/keys/validator-keypair.json \
  -e LOG_LEVEL=info \
  ghcr.io/brockhager/neuro-infra:latest
```

### 3.2 Using Systemd Service
```bash
# Download binary
wget https://github.com/brockhager/neuro-infra/releases/download/v0.1.0/nsd-linux-amd64
chmod +x nsd-linux-amd64
sudo mv nsd-linux-amd64 /usr/local/bin/nsd

# Create validator user
sudo useradd -r -s /bin/false neuroswarm

# Create directories
sudo mkdir -p /var/lib/neuroswarm-validator
sudo chown neuroswarm:neuroswarm /var/lib/neuroswarm-validator

# Copy keypair
sudo cp ~/validator-keypair.json /var/lib/neuroswarm-validator/
sudo chown neuroswarm:neuroswarm /var/lib/neuroswarm-validator/validator-keypair.json
sudo chmod 600 /var/lib/neuroswarm-validator/validator-keypair.json

# Create systemd service
sudo tee /etc/systemd/system/neuroswarm-validator.service > /dev/null <<EOF
[Unit]
Description=NeuroSwarm Validator
After=network.target
Wants=network.target

[Service]
Type=simple
User=neuroswarm
Group=neuroswarm
ExecStart=/usr/local/bin/nsd start --mode validator
Restart=always
RestartSec=5
LimitNOFILE=65536

Environment=NODE_MODE=validator
Environment=SOLANA_RPC_URL=https://api.mainnet.solana.com
Environment=SOLANA_KEYPAIR_PATH=/var/lib/neuroswarm-validator/validator-keypair.json
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable neuroswarm-validator
sudo systemctl start neuroswarm-validator
```

## Step 4: Configure Network Participation

### 4.1 Bootstrap Peers
```yaml
# /etc/neuroswarm/validator.yaml
network:
  listen_addr: "0.0.0.0:8080"
  external_addr: "your-public-ip:8080"
  bootstrap_peers:
    - "validator1.neuroswarm.io:8080"
    - "validator2.neuroswarm.io:8080"
    - "validator3.neuroswarm.io:8080"

validator:
  identity_keypair: "/var/lib/neuroswarm-validator/validator-keypair.json"
  vote_account: "your-vote-account-pubkey"
  authorized_withdrawer: "your-authorized-withdrawer-pubkey"
```

### 4.2 Register with Network
```bash
# Check validator status
curl http://localhost:8080/status

# Verify peer connections
curl http://localhost:8080/peers

# Check Solana connection
curl http://localhost:8080/solana/status
```

## Step 5: Monitor and Maintain

### 5.1 Set Up Monitoring
```bash
# Start monitoring stack
cd neuro-services
npm run monitoring:start

# Access dashboards
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

### 5.2 Key Metrics to Monitor
- **Validator Health:** Uptime, peer connections, Solana sync status
- **Performance:** CPU usage, memory consumption, network I/O
- **Consensus:** Blocks validated, attestations signed, vote success rate
- **Security:** Failed authentication attempts, unusual network activity

### 5.3 Log Analysis
```bash
# View recent logs
docker logs neuroswarm-validator --tail 100

# Follow logs in real-time
docker logs neuroswarm-validator -f

# Systemd logs
journalctl -u neuroswarm-validator -f
```

## Step 6: Validator Economics

### 6.1 Staking and Rewards
```bash
# Check staking balance
solana stakes

# Delegate stake to validator
solana delegate-stake <stake-account> <validator-pubkey>

# Check rewards
solana stakes --owner <owner-pubkey>
```

### 6.2 Commission and Fees
- Default commission: 10%
- Network fees: 0.000005 SOL per signature
- Reward distribution: Automatic

## Troubleshooting

### Common Issues

**❌ Validator not syncing:**
```bash
# Check Solana connection
curl http://localhost:8080/solana/status

# Verify RPC endpoint
curl $SOLANA_RPC_URL -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

**❌ Low peer connections:**
```bash
# Check firewall
sudo ufw status
sudo ufw allow 8080

# Verify external IP configuration
curl ifconfig.me
```

**❌ High resource usage:**
```bash
# Monitor system resources
htop
iotop

# Check validator logs for issues
docker logs neuroswarm-validator | grep ERROR
```

### Getting Help

- **Documentation:** [Validator Operations](../../docs/VALIDATOR-NODES.md)
- **Issues:** [GitHub Issues](https://github.com/brockhager/neuroswarm/issues)
- **Community:** Discord/Telegram channels
- **Security:** Report issues to security@neuroswarm.io

## Success Criteria

✅ **Validator is running:** `systemctl status neuroswarm-validator` shows active
✅ **Network connected:** At least 3 peer connections established
✅ **Solana synced:** Validator height matches network height
✅ **Metrics visible:** Validator appears in monitoring dashboards
✅ **Rewards earned:** Validator receives staking rewards

## Next Steps

- [ ] Set up backup and recovery procedures
- [ ] Configure log rotation and retention
- [ ] Implement monitoring alerts
- [ ] Plan for validator key rotation
- [ ] Consider joining validator collective for shared responsibilities

---

**Time Estimate:** 2-4 hours for initial setup
**Difficulty:** Advanced (requires infrastructure knowledge)
**Prerequisites:** Solana CLI, Docker/systemd, network configuration