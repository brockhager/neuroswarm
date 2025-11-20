# Contributor Genesis Anchor Verification Guide

## Overview
As a NeuroSwarm contributor, you have the ability to independently verify that the Admin Node 1 has been properly anchored to the blockchain. This provides cryptographic proof that the admin node was created by the founder and hasn't been tampered with.

## Why This Matters

The blockchain anchor serves as **immutable proof** that:
- Admin Node 1 was created by the founder (brockhager)
- The genesis configuration hasn't been modified since anchoring
- The system maintains cryptographic integrity
- All governance actions are publicly auditable

## Quick Verification Methods

### Method 1: Dashboard Check (Recommended)
1. Access the admin dashboard: `http://admin-node:8080/dashboard.html`
2. Check the "Genesis Anchor Status" card
3. Look for ✅ **VERIFIED** status
4. Verify the transaction link works

### Method 2: API Check
```bash
# Get anchor status via API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://admin-node:8080/v1/observability/anchor-status

# Expected response for verified anchor:
{
  "verificationStatus": "verified",
  "blockchainAnchor": {
    "transactionSignature": "5xYz...",
    "explorerUrl": "https://explorer.solana.com/tx/5xYz..."
  },
  "alerts": []
}
```

### Method 3: Manual Solana Verification
1. Get the transaction signature from the dashboard or docs
2. Visit: `https://explorer.solana.com/tx/TRANSACTION_SIGNATURE`
3. Verify the transaction contains a memo with format: `AdminNode1:HASH`
4. Confirm the hash matches the expected genesis hash

## What to Look For

### ✅ VERIFIED Status
- Green checkmark in dashboard
- `verificationStatus: "verified"`
- No alerts in the alerts array
- Transaction signature present and valid

### ⚠️ WARNING Signs
- Status shows "failed" or "error"
- Alerts present in the response
- Missing transaction signature
- Dashboard shows red indicators

### 🔍 Manual Verification Steps

1. **Check Genesis File Hash**
   ```bash
   # Compute SHA-256 of admin-genesis.json
   sha256sum docs/admin-genesis.json
   # Should match the hash in blockchain memo
   ```

2. **Verify Blockchain Transaction**
   ```bash
   # Check transaction on Solana
   solana confirm TRANSACTION_SIGNATURE
   ```

3. **Validate Memo Content**
   - Memo should be: `AdminNode1:HEX_HASH`
   - Hash should match local computation
   - Transaction should be confirmed

## Troubleshooting

### "verificationStatus": "error"
- Check if Solana CLI is installed and configured
- Verify network connectivity
- Check admin node logs for detailed error messages

### "No blockchain anchor found"
- Genesis anchoring hasn't been completed yet
- Check with project maintainers
- Monitor governance logs for anchoring events

### Transaction Not Found
- Verify the transaction signature is correct
- Check if using the right Solana cluster (mainnet-beta)
- Transaction may still be confirming

## Security Implications

### What the Anchor Proves
- **Authenticity**: Admin node was created by authorized founder
- **Integrity**: Configuration hasn't been tampered with
- **Transparency**: All actions are publicly auditable
- **Immutability**: Cannot be changed without new blockchain transaction

### What It Doesn't Prove
- Current operational status (use health checks)
- Real-time security (use monitoring alerts)
- Code integrity (use code signing)

## Contributing to Anchor Security

### Report Issues
If you discover verification problems:
1. Document the issue with screenshots/logs
2. Report via governance channels
3. Include transaction signature and error details
4. Suggest remediation steps

### Monitor Regularly
- Check anchor status weekly during development
- Verify after any admin node updates
- Monitor for unusual governance activity

## Technical Details

### Hash Algorithm
- SHA-256 for cryptographic integrity
- Computed on `docs/admin-genesis.json`
- Stored permanently on Solana blockchain

### Blockchain Network
- **Network**: Solana Mainnet Beta
- **Transaction Type**: Memo Program
- **Cost**: Minimal SOL transaction fee
- **Confirmation**: Finalized blocks

### Governance Integration
- All anchor operations logged in `wp_publish_log.jsonl`
- Verification attempts tracked
- Alerts generated for failures
- Audit trail maintained

## Questions?

If you have questions about anchor verification:
- Check the admin dashboard first
- Review `docs/admin/admin-node-genesis.md`
- Consult with project maintainers
- Reference this guide for procedures

---

**Remember**: A verified blockchain anchor provides mathematical proof that your admin node is legitimate and untampered. This is a cornerstone of the project's security model! 🔐