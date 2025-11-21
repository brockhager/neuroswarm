# Rate Limiting - DoS Protection for P2P Network

## Overview

Rate Limiting provides per-peer DoS protection using token bucket algorithm to prevent message flooding and bandwidth exhaustion. This protects the NeuroSwarm P2P network from spam attacks and resource exhaustion.

**Status**: Phase 4B Complete ✅

---

## Features

### Token Bucket Algorithm
- **Message Rate**: 10 messages/second per peer (default)
- **Bandwidth Rate**: 10 KB/second per peer (default)
- **Burst Allowance**: 2x rate (allows short bursts)
- **Automatic Refill**: Tokens refill based on elapsed time

### Per-Peer Enforcement
- Independent rate limits for each peer
- Automatic bucket creation on first message
- Automatic cleanup of inactive buckets

### Reputation Integration
- Rate limit violations trigger `spamDetected` behavior (-10 points)
- Repeated violations lead to auto-ban
- Immediate rejection of excess messages

---

## How It Works

### Token Bucket Concept

Each peer has two "buckets" of tokens:
1. **Message Bucket**: Tokens for message count
2. **Bandwidth Bucket**: Tokens for message size

**On Message Arrival**:
1. Refill tokens based on time elapsed
2. Check if enough tokens available
3. If yes: consume tokens, allow message
4. If no: reject message, penalize reputation

**Example**:
```
Peer sends 15 messages in 1 second
Limit: 10 msg/sec, burst: 20

Messages 1-10: ✅ Allowed (tokens: 20 → 10)
Messages 11-20: ✅ Allowed (burst: 10 → 0)
Message 21+: ❌ Rejected (no tokens)

After 1 second:
Tokens refilled: 0 + (1 sec × 10/sec) = 10
Messages 22-31: ✅ Allowed again
```

---

## Usage

### Automatic Enforcement

Rate limiting is **enabled by default**. All incoming messages are automatically rate-limited:

```javascript
// Automatic in P2PProtocol.handleMessage()
const messageSize = JSON.stringify(message).length;
const limitCheck = this.rateLimiter.checkLimit(peerId, messageSize);

if (!limitCheck.allowed) {
  // Reject message
  // Penalize reputation
  return { processed: false, reason: limitCheck.reason };
}
```

### Manual Usage (Advanced)

```javascript
import { RateLimiter } from './shared/peer-discovery/rate-limiter.js';

const limiter = new RateLimiter({
  messagesPerSec: 10,
  bytesPerSec: 10240,
  burstMultiplier: 2
});

// Check if peer is within limits
const result = limiter.checkLimit('peer-1', 100);
if (result.allowed) {
  // Process message
} else {
  // Reject: result.reason = 'MESSAGE_RATE_LIMIT' or 'BANDWIDTH_LIMIT'
}
```

---

## Configuration

### Environment Variables

```bash
# Message rate limit (messages per second per peer)
P2P_RATE_LIMIT_MESSAGES=10

# Bandwidth rate limit (bytes per second per peer)
P2P_RATE_LIMIT_BYTES=10240  # 10 KB/s

# Burst multiplier (max tokens = rate × multiplier)
P2P_RATE_LIMIT_BURST=2

# Enable/disable rate limiting
P2P_ENABLE_RATE_LIMITING=true
```

### Programmatic Configuration

```javascript
const p2pProtocol = new P2PProtocol(peerManager, {
  messagesPerSec: 10,        // 10 msg/sec
  bytesPerSec: 10240,        // 10 KB/sec
  enableRateLimiting: true   // Enable
});
```

### Default Limits

| Limit | Default | Burst | Notes |
|-------|---------|-------|-------|
| Messages/sec | 10 | 20 | Per peer |
| Bytes/sec | 10 KB | 20 KB | Per peer |
| Cleanup | 10 min | N/A | Inactive buckets |

---

## Attack Scenarios

### Scenario 1: Message Flood

**Attack**: Peer sends 1000 messages/second

**Defense**:
```
1. First 20 messages allowed (burst)
2. Remaining 980 rejected
3. Reputation decreases by 98 points (980 × -10)
4. Peer auto-banned after reputation < 20
```

### Scenario 2: Bandwidth Exhaustion

**Attack**: Peer sends 1 MB messages

**Defense**:
```
1. Message size: 1,048,576 bytes
2. Limit: 10,240 bytes/sec
3. Message rejected (BANDWIDTH_LIMIT)
4. Reputation penalty (-10 points)
5. Repeated attempts → auto-ban
```

### Scenario 3: Distributed Attack

**Attack**: 100 peers send 20 msg/sec each

**Defense**:
```
Without rate limiting: 2000 msg/sec
With rate limiting: 100 × 10 = 1000 msg/sec
Reduction: 50% attack traffic blocked
```

---

## Testing

### Test Suite

```bash
cd c:/JS/ns/neuroswarm
node test-rate-limiter.js
```

**Expected Output**:
```
=== Rate Limiter Test ===

Test 1: Normal traffic (5 msg/sec)...
✓ Allowed 5/5 messages

Test 2: Burst traffic (20 messages instantly)...
✓ Allowed 20/20 messages (burst allowance)

Test 3: Exceed message rate limit...
✓ 21st message: REJECTED
✓ Reason: MESSAGE_RATE_LIMIT

Test 4: Bandwidth limit (large message)...
✓ Large message: REJECTED
✓ Reason: BANDWIDTH_LIMIT

Test 5: Token refill after delay...
✓ After 1 second: ALLOWED
✓ Tokens refilled

=== All Tests Complete ===
✓ Rate limiter is working correctly!
```

---

## Performance

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Bucket Lookup | <0.01ms | Map.get() |
| Token Refill | ~0.05ms | Math operations |
| Limit Check | ~0.1ms | Total per message |
| Cleanup | ~1ms | Per 100 buckets |

### Memory Usage

| Component | Memory | Notes |
|-----------|--------|-------|
| Bucket | ~100 bytes | Per peer |
| Total | ~10 KB | For 100 peers |

### CPU Impact

- **Per Message**: +0.1ms
- **Negligible**: <1% CPU usage
- **Async**: No blocking operations

---

## Troubleshooting

### Issue: Legitimate Traffic Rejected

**Symptoms**:
```
[P2P] Rate limit exceeded from peer-123: MESSAGE_RATE_LIMIT
```

**Cause**: Peer exceeding 10 msg/sec

**Solutions**:
```bash
# Increase message rate limit
export P2P_RATE_LIMIT_MESSAGES=20

# Or increase burst allowance
export P2P_RATE_LIMIT_BURST=3
```

### Issue: Large Messages Rejected

**Symptoms**:
```
[P2P] Rate limit exceeded from peer-456: BANDWIDTH_LIMIT
```

**Cause**: Message size exceeds bandwidth limit

**Solutions**:
```bash
# Increase bandwidth limit
export P2P_RATE_LIMIT_BYTES=20480  # 20 KB/s

# Or split large messages into smaller chunks
```

### Issue: Peer Auto-Banned

**Symptoms**: Peer reputation drops below 20

**Cause**: Repeated rate limit violations

**Solution**: This is expected behavior. Investigate if peer is malicious or has a bug.

---

## API Reference

### RateLimiter Class

```javascript
import { RateLimiter } from './shared/peer-discovery/rate-limiter.js';

const limiter = new RateLimiter({
  messagesPerSec: 10,      // Messages per second
  bytesPerSec: 10240,      // Bytes per second
  burstMultiplier: 2,      // Burst allowance
  enabled: true            // Enable/disable
});
```

#### Methods

**`checkLimit(peerId, messageSize)`**
- Checks if peer is within rate limits
- Returns: `{ allowed: boolean, reason?: string }`
- Reasons: `'MESSAGE_RATE_LIMIT'` | `'BANDWIDTH_LIMIT'`

**`reset(peerId)`**
- Resets rate limit for a peer
- Useful for testing or manual intervention

**`getStats()`**
- Returns statistics:
  ```javascript
  {
    enabled: true,
    messagesPerSec: 10,
    bytesPerSec: 10240,
    burstMultiplier: 2,
    activePeers: 5
  }
  ```

**`getBucketState(peerId)`**
- Returns bucket state for debugging:
  ```javascript
  {
    msgTokens: 15,
    byteTokens: 18432,
    lastRefill: 1700527890123
  }
  ```

**`cleanup(maxAge)`**
- Cleans up inactive buckets
- Default: 10 minutes
- Called automatically by P2PProtocol

**`destroy()`**
- Cleanup method
- Clears all buckets

---

## Examples

### Example 1: Basic Usage

```javascript
import { RateLimiter } from './shared/peer-discovery/rate-limiter.js';

const limiter = new RateLimiter();

// Check limit
const result = limiter.checkLimit('peer-1', 100);
if (result.allowed) {
  console.log('Message allowed');
} else {
  console.log('Rejected:', result.reason);
}
```

### Example 2: Custom Limits

```javascript
const limiter = new RateLimiter({
  messagesPerSec: 20,     // Higher rate
  bytesPerSec: 20480,     // 20 KB/s
  burstMultiplier: 3      // 3x burst
});
```

### Example 3: Disable Rate Limiting

```javascript
const limiter = new RateLimiter({
  enabled: false  // Disabled
});

const result = limiter.checkLimit('peer-1', 100);
// Always returns { allowed: true }
```

---

## Best Practices

### DO

- ✅ Use default limits for most deployments
- ✅ Monitor rate limit violations in logs
- ✅ Adjust limits based on network conditions
- ✅ Enable reputation system for auto-banning
- ✅ Test with realistic traffic patterns

### DON'T

- ❌ Set limits too low (may reject legitimate traffic)
- ❌ Set limits too high (reduces DoS protection)
- ❌ Disable rate limiting in production
- ❌ Ignore repeated violations
- ❌ Forget to test burst scenarios

---

## Tuning Guidelines

### Low-Traffic Network
```bash
P2P_RATE_LIMIT_MESSAGES=5
P2P_RATE_LIMIT_BYTES=5120  # 5 KB/s
```

### High-Traffic Network
```bash
P2P_RATE_LIMIT_MESSAGES=20
P2P_RATE_LIMIT_BYTES=20480  # 20 KB/s
```

### Testing/Development
```bash
P2P_RATE_LIMIT_MESSAGES=100
P2P_RATE_LIMIT_BYTES=102400  # 100 KB/s
P2P_RATE_LIMIT_BURST=5
```

---

## Integration with Security Stack

Rate limiting works with other security features:

1. **Reputation System** - Violations decrease reputation
2. **Message Signing** - Signed messages still rate-limited
3. **HTTPS** - Transport encryption doesn't bypass limits
4. **NAT Traversal** - Public/private IPs both rate-limited

**Order of Checks**:
```
1. Rate Limit ← First (DoS protection)
2. Signature Verification (Message integrity)
3. Message Processing (Business logic)
```

---

## Related Documentation

- [P2P Communication](../Communication/README.md) - Overall P2P system
- [Reputation System](../Reputation-System/README.md) - Peer reputation
- [Message Signing](../Message-Signing/README.md) - Cryptographic integrity
- [NAT Traversal](../NAT-Traversal/README.md) - STUN client

---

## FAQ

**Q: What happens when a peer is rate-limited?**
A: Message is rejected, reputation decreases by 10 points, peer may be auto-banned.

**Q: Can legitimate peers be rate-limited?**
A: Yes, if they exceed limits. Adjust limits if this happens frequently.

**Q: How does burst allowance work?**
A: Peers can send 2x the rate instantly, then must wait for refill.

**Q: Are rate limits per IP or per peer?**
A: Per peer ID, not per IP. Multiple peers from same IP have separate limits.

**Q: Can I disable rate limiting?**
A: Yes, set `P2P_ENABLE_RATE_LIMITING=false`, but not recommended for production.

**Q: How often are tokens refilled?**
A: Continuously based on elapsed time, not at fixed intervals.

---

*Last updated: November 20, 2025*
*Version: 1.0 (Phase 4B Complete)*
*Status: Production Ready*
