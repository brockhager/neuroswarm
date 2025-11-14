# Admin Node IP Recording

## Purpose

Admin Node IP recording provides enhanced security through:

- **Access Control**: Only whitelisted IP addresses can run admin nodes
- **Audit Trail**: Complete logging of all admin node startup attempts
- **Monitoring**: Real-time observability of active admin nodes
- **Compliance**: Ensures only authorized infrastructure participates

## Configuration

### Admin Nodes Section

The `adminNodes` array in `admin-genesis.json` defines authorized admin nodes:

```json
{
  "admin": {
    "nodes": {
      "adminNodes": [
        {
          "name": "admin-node-1",
          "ip": "203.0.113.42",
          "fingerprint": "HOST_FINGERPRINT_ADMIN_NODE_1"
        },
        {
          "name": "admin-node-2",
          "ip": "198.51.100.17",
          "fingerprint": "HOST_FINGERPRINT_ADMIN_NODE_2"
        }
      ]
    }
  }
}
```

### Fields

- `name`: Unique identifier for the admin node
- `ip`: Authorized IP address for this node
- `fingerprint`: Host fingerprint for additional verification

## Startup Verification

### IP Whitelist Check

On startup, admin nodes perform these checks:

1. **IP Detection**: Automatically detect current host IP
2. **Whitelist Verification**: Check if IP matches any entry in `adminNodes`
3. **Fingerprint Validation**: Verify host fingerprint matches expected value
4. **Access Decision**: Allow or deny startup based on verification

### Denied Startup Behavior

If IP is not whitelisted:
- Node refuses to start
- Logs denial in governance logs
- Returns error message to operator
- No network participation allowed

## Governance Logging

### Startup Attempts

All admin node startup attempts are logged:

```json
{
  "action": "admin-join",
  "node": "admin-node-2",
  "ip": "198.51.100.17",
  "result": "allowed",
  "timestamp": "2025-11-13T10:30:00Z"
}
```

### Denied Attempts

Unauthorized attempts are logged with denial:

```json
{
  "action": "admin-join",
  "node": "unauthorized-node",
  "ip": "10.0.0.1",
  "result": "denied",
  "reason": "IP not in admin whitelist",
  "timestamp": "2025-11-13T10:31:00Z"
}
```

## Observability Endpoint

### /v1/observability/admin-nodes

Returns current status of all admin nodes:

```json
[
  {
    "name": "admin-node-1",
    "ip": "203.0.113.42",
    "fingerprint": "HOST_FINGERPRINT_ADMIN_NODE_1",
    "status": "active",
    "lastSeen": "2025-11-13T10:30:00Z"
  },
  {
    "name": "admin-node-2",
    "ip": "198.51.100.17",
    "fingerprint": "HOST_FINGERPRINT_ADMIN_NODE_2",
    "status": "pending",
    "lastSeen": null
  }
]
```

### Status Values

- `active`: Node is online and verified
- `denied`: Node was denied access (IP not whitelisted)
- `pending`: Node configured but not yet seen

## Implementation Notes

### Security Considerations

- IP addresses should be static and monitored
- Fingerprints prevent IP spoofing
- All changes require founder approval
- Logs are cryptographically signed

### Operational Guidelines

- Update IP addresses when infrastructure changes
- Monitor governance logs for unauthorized attempts
- Use observability endpoint for health checks
- Regular security audits of admin node access

---

# Admin Node Genesis Safeguards

## Cryptographic Anchoring
- Founder keypair defines genesis.
- All admin nodes must verify binary/config signatures against founder's public key.
- Tamper resistance: modified code fails signature check and refuses startup.

## Genesis Configuration Lock
- Immutable admin-genesis.json defines max admin nodes and allowed IPs.
- Hard-coded hash anchoring ensures config integrity.
- Multi-signature option for founder updates.

## Blockchain Genesis Anchor
- Genesis Hash: SHA-256 of admin-genesis.json (or binary/config bundle).
- Solana Recording: Use Memo Program to store the hash in a transaction memo.
  Example: solana transfer <founder-wallet> 0 --memo "AdminNode1:<hash>"
- Public Reference: Include transaction signature and link to Solana Explorer.
  Example: https://explorer.solana.com/tx/<transaction-signature>
- Governance Logging: Append entry to wp_publish_log.jsonl with action "genesis-anchor", file reference, hash, blockchain, txSignature, and timestamp.
- Immutable proof of Admin Node 1.
- Public verifiability of founder authorization.
- Transparency through dual audit trails (governance logs + blockchain).

### Operationalization
- **Automated Hash Generation**: Scripts in `/scripts/genesis-anchor.sh` compute SHA-256 hash of admin-genesis.json
- **Solana Transaction Automation**: Founder wallet integration submits memo transaction during genesis updates
- **Governance Log Integration**: All anchor operations logged with blockchain references (hash, txSignature, explorer link)
- **Verification Scripts**: `/scripts/verify-anchor.sh` validates blockchain anchor against local genesis hash

## Hardware Binding
- TPM/HSM integration binds admin node to hardware fingerprints.
- Device whitelisting: only approved hardware IDs can run admin nodes.
- Fail-safe defaults: node refuses startup if hardware check fails.

## Network Consensus Enforcement
- Quorum check: swarm agents reject unverified admin nodes.
- Consensus gatekeeping: rogue nodes cannot join the network.

## Governance Logging
- Every startup attempt logged with actor, result, reason, timestamp.
- Unauthorized attempts trigger anomaly alerts in dashboard.

## Outcome
- Only founder-authorized nodes can run.
- Unauthorized clones cannot bypass safeguards.
- Transparency preserved through immutable governance logs.