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

---

# Node Overview UI

## Purpose

The Node Overview panel provides real-time visibility into all nodes participating in the NeuroSwarm network, enabling administrators to:

- **Monitor Network Health**: Track active nodes and their roles
- **Verify Node Authenticity**: Check IP addresses and node IDs
- **Identify Unauthorized Access**: Highlight denied or suspicious nodes
- **Audit Network Changes**: Log all node join/deny events

## Dashboard Integration

### Tab Navigation

The admin dashboard includes a "Node Overview" tab alongside the existing "Anchor Status" tab, providing comprehensive network observability.

### Data Source

The panel fetches data from the `/v1/observability/nodes` endpoint, which returns:

```json
[
  {
    "nodeId": "admin-node-1",
    "name": "Admin Node 1",
    "role": "admin",
    "ip": "203.0.113.42",
    "status": "active"
  },
  {
    "nodeId": "validator-001",
    "name": "Validator Node 1",
    "role": "validator",
    "ip": "10.0.0.100",
    "status": "active"
  }
]
```

### Table Display

The interface presents node data in a sortable table with columns:

- **Node ID**: Unique identifier for the node
- **Name**: Human-readable node name
- **Role**: Node function (admin, validator, indexer, gateway)
- **IP Address**: Current IP address of the node
- **Status**: Current operational status

### Status Indicators

- **Active** (Green): Node is online and authorized
- **Pending** (Yellow): Node is configured but not yet active
- **Denied** (Red): Node was rejected due to unauthorized IP

### Auto-Refresh

The panel automatically refreshes every 10 seconds to provide real-time network status updates.

## Usage Instructions

### For Contributors

1. **Access Dashboard**: Navigate to the admin node dashboard URL
2. **Switch to Node Overview**: Click the "Node Overview" tab
3. **Monitor Network**: Review the table for all active nodes
4. **Check Status**: Look for any nodes with "denied" status in red
5. **Verify IPs**: Cross-reference node IPs with known infrastructure

### For Administrators

1. **Real-time Monitoring**: Use the auto-refresh feature to track network changes
2. **Incident Response**: Quickly identify unauthorized node attempts
3. **Capacity Planning**: Monitor node distribution across roles
4. **Audit Trail**: Check governance logs for node status change history

## Governance Integration

### Logging Events

Node status changes are automatically logged to `wp_publish_log.jsonl`:

```json
{
  "action": "node-status-update",
  "nodeId": "validator-001",
  "ip": "10.0.0.100",
  "status": "active",
  "timestamp": "2025-11-13T12:00:00Z"
}
```

### Audit Trail

- **Join Events**: Logged when nodes successfully join the network
- **Deny Events**: Logged when nodes are rejected due to IP whitelist violations
- **Status Changes**: All status transitions are recorded for compliance

## Security Considerations

- **Access Control**: Only authenticated admin users can view the node overview
- **IP Validation**: Displayed IPs are verified against the admin whitelist
- **Real-time Updates**: Prevents stale data from security decisions
- **Audit Compliance**: All views and changes are logged for accountability

## Implementation Notes

- **API Endpoint**: `/v1/observability/nodes` returns JSON array of node objects
- **Frontend**: Pure JavaScript with fetch API, no external dependencies
- **Styling**: Consistent with existing dashboard theme
- **Error Handling**: Graceful degradation if API is unavailable
- **Performance**: Lightweight polling every 10 seconds