# Admin Node Production Setup Guide

## Overview
This guide covers the production setup and blockchain anchoring of the NeuroSwarm Admin Node 1.

## Prerequisites
- Solana CLI installed and configured
- Founder wallet with SOL for transaction fees
- Access to production environment
- Admin Node service deployed and running

## 1. Founder Wallet Setup

### Install Solana CLI
```bash
# Linux/macOS
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Windows (PowerShell as Admin)
iex ((New-Object System.Net.WebClient).DownloadString('https://release.solana.com/v1.18.4/install.ps1'))
```

### Configure Wallet
```bash
# Set Solana network
solana config set --url https://api.mainnet-beta.solana.com

# Create or import wallet
solana-keygen new --outfile ~/neuroswarm-founder-keypair.json

# Set as default
solana config set --keypair ~/neuroswarm-founder-keypair.json

# Check balance
solana balance

# Fund wallet if needed (airdrop on devnet for testing)
solana airdrop 1
```

### Environment Variables
Set the following environment variables securely:
```bash
export FOUNDER_WALLET="YourWalletAddressHere"
export SOLANA_RPC="https://api.mainnet-beta.solana.com"
```

## 2. Genesis Anchoring Execution

### Pre-Flight Checks
```bash
# Verify admin-genesis.json exists and is valid
cd /path/to/neuroswarm
ls -la docs/admin-genesis.json

# Check admin node is running
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/health

# Verify scripts are executable
ls -la scripts/genesis-anchor.*
```

### Execute Genesis Anchor
```bash
# Windows
cd C:\JS\ns\neuroswarm
.\scripts\genesis-anchor.ps1

# Linux/macOS
cd /path/to/neuroswarm
./scripts/genesis-anchor.sh
```

### Expected Output
```
Admin Node Genesis Anchor Tool
=================================
Genesis Hash: a1b2c3d4e5f6...
Founder Wallet: YourWalletAddress
Transaction Signature: 5xYz...
Explorer URL: https://explorer.solana.com/tx/5xYz...
Genesis anchor completed successfully!
```

### Update Documentation
After successful anchoring, update `docs/admin/admin-node-genesis.md`:

```markdown
## Blockchain Anchor Status
- **Transaction Signature**: `5xYz...`
- **Explorer URL**: https://explorer.solana.com/tx/5xYz...
- **Genesis Hash**: `a1b2c3d4e5f6...`
- **Anchored Date**: 2025-11-13
- **Network**: Solana Mainnet
```

## 3. Verification & Monitoring

### Automated Verification
```bash
# Windows
.\scripts\verify-anchor.ps1

# Linux/macOS
./scripts/verify-anchor.sh
```

### Dashboard Monitoring
Access the admin dashboard:
```
GET /v1/observability/anchor-status
Authorization: Bearer YOUR_TOKEN
```

Expected response:
```json
{
  "timestamp": "2025-11-13T23:00:00Z",
  "genesisFile": "/path/to/docs/admin-genesis.json",
  "verificationStatus": "verified",
  "lastVerification": "2025-11-13T23:00:00Z",
  "blockchainAnchor": {
    "network": "solana",
    "transactionSignature": "5xYz...",
    "explorerUrl": "https://explorer.solana.com/tx/5xYz...",
    "memo": "AdminNode1:a1b2c3d4e5f6..."
  },
  "localHash": "a1b2c3d4e5f6...",
  "blockchainHash": "a1b2c3d4e5f6...",
  "alerts": []
}
```

### Continuous Monitoring
- Set up automated verification every 6 hours
- Monitor governance logs for anchor verification events
- Alert on verification failures

## 4. Contributor Awareness

### Onboarding Documentation
Contributors should be aware of:

1. **Genesis Verification**: How to check anchor status
2. **Public Auditability**: Solana Explorer links
3. **Security Implications**: What the anchor proves
4. **Alert Monitoring**: How to respond to verification failures

### Verification Commands for Contributors
```bash
# Quick verification
curl -H "Authorization: Bearer TOKEN" \
  http://admin-node:8080/v1/observability/anchor-status

# Check Solana Explorer
open https://explorer.solana.com/tx/TRANSACTION_SIGNATURE
```

## Security Considerations

### Wallet Security
- Store founder keypair in secure HSM/Trezor when possible
- Use environment variables, never hardcode keys
- Implement multi-signature for critical operations

### Network Security
- Use mainnet for production anchoring
- Verify transaction confirmations
- Monitor for blockchain reorganizations

### Access Control
- Restrict admin endpoints to authorized personnel only
- Implement proper JWT token management
- Log all access attempts

## Troubleshooting

### Common Issues

**"solana CLI not found"**
```bash
# Check installation
which solana
solana --version

# Reinstall if needed
```

**"Insufficient funds"**
```bash
solana balance
# Fund wallet with SOL
```

**"Transaction failed"**
```bash
# Check network status
solana cluster-version

# Retry with higher priority fee
```

**"Genesis file not found"**
```bash
ls -la docs/admin-genesis.json
# Ensure correct working directory
```

## Success Criteria

✅ **Genesis Anchoring Complete**
- Transaction confirmed on Solana mainnet
- Hash recorded in docs/admin/admin-node-genesis.md
- Governance log entry created

✅ **Verification Working**
- Automated verification passes
- Dashboard shows "verified" status
- No security alerts

✅ **Contributor Awareness**
- Documentation updated
- Verification procedures documented
- Public auditability confirmed

## Next Steps

1. Execute genesis anchoring in production
2. Set up monitoring alerts
3. Train contributors on verification procedures
4. Consider multi-signature wallet for enhanced security