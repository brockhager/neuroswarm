# Governance Logging - Security Audit Trail

## Overview

Governance Logging provides a comprehensive audit trail of all security-related events in the NeuroSwarm P2P network. It logs invalid signatures, rate limit violations, certificate failures, and other security incidents to a timeline file (`governance-timeline.jsonl`), enabling historical analysis, accountability, and threat detection.

**Status**: Phase 4D Complete ✅

---

## Features

### Security Event Logging
- **Invalid Signatures**: Logs message integrity failures (potential tampering)
- **Rate Limit Violations**: Logs DoS attempts and spam
- **Certificate Failures**: Logs authentication failures (potential impersonation)
- **Replay Attacks**: Logs duplicate message attempts

### Periodic Snapshots
- Hourly security summaries
- Network health statistics
- Peer count and ban tracking

### Contributor Tracking
- Events attributed to specific nodes (Contributor ID)
- Peer identification for all violations

### Standardized Format
- JSONL (JSON Lines) format for easy parsing
- Structured event data with severity levels

---

## Event Types

| Event Type | Severity | Trigger |
|------------|----------|---------|
| `INVALID_SIGNATURE` | **HIGH** | Message signature verification fails |
| `REPLAY_ATTACK` | **HIGH** | Duplicate nonce detected |
| `INVALID_CERTIFICATE` | **HIGH** | Certificate verification fails |
| `PEER_BANNED` | **HIGH** | Peer auto-banned (reputation < 20) |
| `RATE_LIMIT_EXCEEDED` | **MEDIUM** | Peer exceeds message/bandwidth limit |
| `MISSING_CERTIFICATE` | **MEDIUM** | Peer missing cert (enforcement mode) |
| `EXPIRED_CERTIFICATE` | **MEDIUM** | Certificate expired |
| `MISSING_SIGNATURE` | **MEDIUM** | Message missing required signature |

---

## Log Format

### Event Entry

```json
{
  "timestamp": 1700527890123,
  "type": "SECURITY_EVENT",
  "eventType": "INVALID_SIGNATURE",
  "peerId": "192.168.1.10:3009",
  "contributorId": "node-1",
  "details": {
    "messageType": "NEW_BLOCK",
    "reason": "INVALID_SIGNATURE",
    "nonce": "a1b2c3d4..."
  },
  "severity": "HIGH"
}
```

### Snapshot Entry

```json
{
  "timestamp": 1700531490123,
  "type": "SECURITY_SNAPSHOT",
  "contributorId": "node-1",
  "stats": {
    "totalPeers": 12,
    "bannedPeers": 1,
    "invalidSignatures": 5,
    "rateLimitViolations": 45
  }
}
```

---

## Usage

### Initialization

The `SecurityLogger` is automatically initialized by the `PeerManager` or `P2PProtocol` if configured.

```javascript
import { SecurityLogger } from './shared/peer-discovery/security-logger.js';

const logger = new SecurityLogger({
  enabled: true,
  timelineFile: './data/governance-timeline.jsonl',
  contributorId: 'node-1'
});
```

### Manual Logging

```javascript
logger.logSecurityEvent('CUSTOM_EVENT', 'peer-123', {
  reason: 'Suspicious behavior',
  data: '...'
});
```

---

## Configuration

### Environment Variables

```bash
# Enable security logging (default: true)
P2P_SECURITY_LOG_ENABLED=true

# Governance timeline file path
P2P_SECURITY_LOG_FILE=./data/governance-timeline.jsonl

# Snapshot interval (milliseconds)
P2P_SECURITY_SNAPSHOT_INTERVAL=3600000  # 1 hour

# Contributor ID (node identifier)
P2P_CONTRIBUTOR_ID=node-1
```

---

## Integration

The Security Logger is integrated into the core security stack:

1.  **Message Handlers**: Logs `INVALID_SIGNATURE`, `MISSING_SIGNATURE`
2.  **P2P Protocol**: Logs `RATE_LIMIT_EXCEEDED`
3.  **Certificate Validator**: Logs `INVALID_CERTIFICATE`, `MISSING_CERTIFICATE`, `EXPIRED_CERTIFICATE`
4.  **Reputation System**: Often triggered alongside logging (e.g., logging an event also lowers reputation)

---

## Analysis & Auditing

The `governance-timeline.jsonl` file can be analyzed to:

1.  **Identify Attackers**: Group events by `peerId` to find persistent attackers.
2.  **Detect DDoS**: Spikes in `RATE_LIMIT_EXCEEDED` events indicate attacks.
3.  **Verify Integrity**: `INVALID_SIGNATURE` events may indicate man-in-the-middle attempts or buggy peers.
4.  **Monitor Network Health**: Snapshots provide a historical view of network size and stability.

---

## Best Practices

-   **Monitor High Severity Events**: Set up alerts for `HIGH` severity events.
-   **Rotate Logs**: Implement log rotation if the timeline file grows too large (not built-in).
-   **Secure the Log File**: Ensure `governance-timeline.jsonl` is write-protected from unauthorized users.
-   **Analyze Trends**: Use snapshots to track long-term network security trends.

---

*Last updated: November 21, 2025*
*Version: 1.0 (Phase 4D Complete)*
*Status: Production Ready*
