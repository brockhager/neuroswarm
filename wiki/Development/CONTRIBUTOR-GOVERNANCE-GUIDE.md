# NeuroSwarm Governance Ritual Guide

## Overview

This guide documents the complete governance ritual for maintaining NeuroSwarm's blockchain-verified integrity. All critical governance actions are anchored to the Solana blockchain for public verification and transparency.

## Ritual Principles

1. **Public Verification**: All governance actions are verifiable by any contributor
2. **Cryptographic Integrity**: SHA-256 fingerprints ensure tamper-evident records
3. **Blockchain Anchoring**: Solana mainnet provides immutable audit trails
4. **Standardized Process**: Repeatable rituals for all governance actions
5. **Community Verification**: Contributors independently validate all actions

## Governance Actions

### 1. Genesis Anchoring

**Purpose**: Establish initial trust anchor for founder keys and genesis configuration.

**When to Run**:
- Initial NeuroSwarm setup
- After genesis configuration changes
- Periodic re-anchoring (recommended quarterly)

**Command**:
```bash
npm run anchor-governance genesis
```

**Process**:
1. Generates SHA-256 fingerprints of founder keys and genesis config
2. Creates Solana memo transaction command
3. Execute transaction with funded Solana account
4. Update governance logs with transaction signature

**Verification**:
```bash
npm run verify-governance <TRANSACTION_SIGNATURE> genesis
```

### 2. Key Rotation Anchoring

**Purpose**: Securely transition cryptographic keys while maintaining public verification.

**When to Run**:
- Scheduled key rotation (recommended annually)
- Security incident response
- Key compromise recovery

**Preparation**:
```bash
# Generate new keys
node scripts/generate-admin-node-keys.js

# Backup old keys securely
cp secrets/founder.jwt.key secrets/founder.jwt.key.backup
cp secrets/admin-node.jwt.key secrets/admin-node.jwt.key.backup
```

**Command**:
```bash
npm run anchor-governance key-rotation --new-key=./secrets/founder.jwt.key --old-key=./secrets/founder.jwt.key.backup
```

**Process**:
1. Computes fingerprints of both old and new key pairs
2. Creates anchoring transaction with transition data
3. Execute Solana transaction
4. Update `.env` with new key paths
5. Restart admin node: `npm run health-check && npm start`

**Verification**:
```bash
npm run verify-governance <TRANSACTION_SIGNATURE> key-rotation --new-key=./secrets/founder.jwt.key --old-key=./secrets/founder.jwt.key.backup
```

### 3. Policy Update Anchoring

**Purpose**: Anchor governance policy changes for community verification.

**When to Run**:
- Tokenomics parameter updates
- Governance rule changes
- Security policy modifications

**Command**:
```bash
npm run anchor-governance policy-update --policy-file=./docs/governance-policy.json
```

**Process**:
1. Computes SHA-256 of policy document
2. Creates anchoring transaction
3. Execute on Solana
4. Update governance logs

**Verification**:
```bash
npm run verify-governance <TRANSACTION_SIGNATURE> policy-update --policy-file=./docs/governance-policy.json
```

## Dashboard Workflow (Recommended)

### For Founders/Executors

1. **Access Dashboard**: Navigate to Admin Node dashboard at `http://localhost:8080`
2. **Health Check**: Run `npm run health-check` to verify system state
3. **Navigate to Governance**: Click "Governance Anchoring" tab
4. **Execute Anchoring**: Click appropriate anchoring button ("🏛️ Anchor Genesis", etc.)
5. **Manual Transaction**: Execute the displayed Solana CLI command with funded account
6. **Update Logs**: Transaction signature is automatically logged to governance records
7. **Verification**: Click "✅ Verify Genesis" to confirm anchoring success

### For Contributors/Verifiers

1. **Access Dashboard**: Navigate to Admin Node dashboard
2. **Navigate to Governance**: Click "Governance Anchoring" tab
3. **Run Verification**: Click "✅ Verify Genesis" button
4. **Enter Signature**: Provide transaction signature when prompted
5. **Review Results**: View verification status and fingerprint comparison
6. **Explorer Access**: Click Solana Explorer link to view on-chain data
7. **Record Results**: Document verification outcome for audit trails

## CLI Workflow (Advanced)

### For Founders/Executors

## Log Entry Standards

All governance actions produce standardized log entries:

```json
{
  "timestamp": "2025-11-14T12:00:00.000Z",
  "action": "genesis",
  "actor": "founder",
  "details": {
    "tx_signature": "5xHx5Y...",
    "memo_content": "{\"action\":\"genesis\",\"fingerprints\":{...}}",
    "blockchain": "solana-mainnet",
    "purpose": "Public verification of founder keys and genesis configuration",
    "anchor_type": "genesis",
    "fingerprints": {
      "founder_pub_sha256": "224541...",
      "admin_pub_sha256": "224541...",
      "genesis_sha256": "b6e200..."
    }
  },
  "signature": "abc123..."
}
```

## Recovery Procedures

### Transaction Failure

**Symptoms**: Solana CLI returns error during anchoring

**Recovery**:
1. Check account balance: `solana balance`
2. Verify network connection: `solana ping`
3. Check configuration: `solana config get`
4. Retry with same anchoring command
5. If persistent, check Solana status page

### Verification Failure

**Symptoms**: `verify-governance` returns "FAILURE"

**Recovery**:
1. Regenerate local fingerprints
2. Compare manually with blockchain explorer data
3. Check for file corruption or path issues
4. Verify correct anchor type and parameters
5. Contact team if mismatch persists

### Log Inconsistency

**Symptoms**: Governance logs don't match blockchain data

**Recovery**:
1. Audit log file integrity
2. Cross-reference with blockchain explorer
3. Reconstruct missing log entries if possible
4. Document incident for transparency

## Security Considerations

- **Key Security**: Never commit private keys to version control
- **Transaction Privacy**: Use dedicated Solana accounts for anchoring
- **Log Integrity**: Governance logs are cryptographically signed
- **Verification Independence**: Contributors verify independently
- **Public Transparency**: All actions visible on Solana explorer

## Monitoring and Alerts

The admin dashboard monitors anchoring status and alerts for:

- Missing genesis anchor
- Failed verifications
- Stale anchors (>30 days old)
- Verification errors

## Example Verification Output

```
🔍 NeuroSwarm Governance Verification Tool
===========================================

📡 Fetching memo from transaction: 5xHx5Y...
Found memo data: {"action":"genesis","fingerprints":{...}}

🔐 Generating local genesis fingerprints...
Local fingerprints:
  founder_pub_sha256: 22454115751ea570e089c57a4f4aef307f4092708e17f5ef6df8485808d266ce
  admin_pub_sha256: 22454115751ea570e089c57a4f4aef307f4092708e17f5ef6df8485808d266ce
  genesis_sha256: b6e200c7ec732caf9566002e9d9f90dce8dd58d33299d8762e8c0b591421c366

🔍 Comparing genesis fingerprints...

Genesis Fingerprint Comparison:
================================

✅ founder_pub_sha256:
    Local:      22454115751ea570e089c57a4f4aef307f4092708e17f5ef6df8485808d266ce
    Blockchain: 22454115751ea570e089c57a4f4aef307f4092708e17f5ef6df8485808d266ce
    Match:      true

✅ admin_pub_sha256:
    Local:      22454115751ea570e089c57a4f4aef307f4092708e17f5ef6df8485808d266ce
    Blockchain: 22454115751ea570e089c57a4f4aef307f4092708e17f5ef6df8485808d266ce
    Match:      true

✅ genesis_sha256:
    Local:      b6e200c7ec732caf9566002e9d9f90dce8dd58d33299d8762e8c0b591421c366
    Blockchain: b6e200c7ec732caf9566002e9d9f90dce8dd58d33299d8762e8c0b591421c366
    Match:      true

🎯 Verification Result:
======================

✅ SUCCESS: All fingerprints match!
   NeuroSwarm genesis integrity verified.
   Governance action is authentic and properly anchored.
```

## Contributing

This governance ritual ensures NeuroSwarm maintains the highest standards of transparency and security. Contributors are encouraged to:

1. Participate in verification rituals
2. Report any verification anomalies
3. Suggest improvements to the ritual process
4. Help maintain documentation accuracy

For questions or issues with governance rituals, contact the NeuroSwarm governance team.