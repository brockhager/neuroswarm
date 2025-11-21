# Peer Reputation System

The Peer Reputation System tracks and scores peer behavior in the NeuroSwarm P2P network, automatically rewarding reliable peers and penalizing spam or malicious activity.

## Overview

The reputation system assigns each peer a score from 0-100, with automatic banning for peers that fall below the threshold (default: 20). Scores decay over time to ensure recent behavior is weighted more heavily than historical behavior.

## Features

- **Dynamic Scoring**: 0-100 point scale with configurable weights
- **Behavior Tracking**: Records success, failure, spam, and health check events
- **Auto-Banning**: Automatically rejects peers with scores below threshold
- **Reputation Decay**: High scores gradually decay toward baseline (50)
- **Top Peers Ranking**: Identify and prioritize most reliable peers
- **Statistics**: Real-time metrics on peer reputation across the network

## Architecture

### Components

**`reputation.js`** - Core reputation management
- Scoring algorithm
- Behavior tracking
- Decay mechanism
- Ban threshold enforcement

**`peer-manager.js`** - Integration point
- Reputation checks before adding peers
- Reputation initialization for new peers
- Logs reputation scores

**`p2p-protocol.js`** - Behavior recording
- Records message success/failure
- Tracks health check responses
- Records peer exchange success

## Behavior Weights

| Behavior | Weight | Description |
|----------|--------|-------------|
| `messageSuccess` | +1 | Successful message delivery |
| `messageFailure` | -2 | Failed message delivery |
| `invalidMessage` | -5 | Malformed or invalid message |
| `spamDetected` | -10 | Spam behavior detected |
| `peerExchange` | +2 | Successful peer exchange |
| `healthCheck` | +1 | Successful health check response |

## Configuration

Configure reputation system via `PeerManager` options:

```javascript
const peerManager = new PeerManager({
  reputationBanThreshold: 20,  // Ban peers below this score
  reputationDecayRate: 0.1     // Points to decay per hour
});
```

### Environment Variables

None required - uses sensible defaults.

## Usage

### Automatic Integration

The reputation system is automatically integrated into all node types (NS, Gateway, VP). No manual intervention required.

### Manual Queries

Access reputation data via `PeerManager`:

```javascript
// Get peer's reputation score
const score = peerManager.reputation.getScore('localhost:3009');

// Check if peer should be banned
const shouldBan = peerManager.reputation.shouldBan('localhost:3009');

// Get top peers by reputation
const topPeers = peerManager.reputation.getTopPeers(10);

// Get statistics
const stats = peerManager.reputation.getStats();
```

## Reputation Lifecycle

### 1. Peer Initialization
New peers start with score of **50** (neutral).

### 2. Behavior Recording
Every P2P interaction records behavior:
- Successful message → +1
- Failed message → -2
- Spam detected → -10

### 3. Score Updates
Scores are clamped between 0-100:
```
newScore = clamp(currentScore + behaviorWeight, 0, 100)
```

### 4. Auto-Banning
Peers with score < 20 are automatically rejected:
```javascript
if (reputation.shouldBan(peerId)) {
  // Peer rejected - reputation too low
  return false;
}
```

### 5. Reputation Decay
Every hour, scores above 50 decay by 0.1 points toward baseline.

## Testing

Run the reputation system test:

```bash
cd c:/JS/ns/neuroswarm
node test-reputation.js
```

**Expected Output:**
```
=== Peer Reputation System Test ===

Test 1: Initializing peers...
✓ Initialized 3 peers with score 50

Test 2: Recording good behavior...
✓ Peer1 score after 5 successes: 55

Test 3: Recording bad behavior...
✓ Peer2 score after 10 failures: 30

Test 4: Recording spam behavior...
✓ Peer3 score after 3 spam detections: 20

...

=== All Tests Complete ===
✓ Reputation system is working correctly!
```

## API Reference

### ReputationManager

#### `getScore(peerId)`
Get reputation score for a peer (0-100).

#### `recordBehavior(peerId, behaviorType, metadata)`
Record a behavior and update score.

**Parameters:**
- `peerId` - Peer identifier
- `behaviorType` - One of: `messageSuccess`, `messageFailure`, `invalidMessage`, `spamDetected`, `peerExchange`, `healthCheck`
- `metadata` - Optional metadata object

#### `shouldBan(peerId)`
Check if peer should be banned (score < threshold).

#### `getTopPeers(n)`
Get top N peers by reputation score.

#### `getBannablePeers()`
Get all peers below ban threshold.

#### `getStats()`
Get reputation statistics.

**Returns:**
```javascript
{
  totalPeers: 10,
  averageScore: 52.5,
  bannablePeers: 2,
  highestScore: 75,
  lowestScore: 15
}
```

#### `getBehaviorHistory(peerId, limit)`
Get recent behavior history for a peer.

## Security Considerations

### Sybil Attack Mitigation

The reputation system provides basic protection against Sybil attacks by:
- Starting new peers at neutral score (50)
- Requiring consistent good behavior to build reputation
- Quickly penalizing spam behavior (-10 per spam)

**Limitations:** Can be gamed by creating many new identities. For production, combine with:
- Proof-of-stake requirements
- Validator registration
- Network-level rate limiting

### Spam Protection

Spam detection triggers severe penalties:
- Single spam event: -10 points
- 3 spam events: Score drops to 20 (ban threshold)
- Automatic rejection of future connections

### Privacy

Reputation scores are stored locally and not shared across the network. Each node maintains its own reputation database.

## Monitoring

### Logs

Reputation events are logged with `[Reputation]` prefix:

```
[Reputation] Initialized peer localhost:3009 with score 50
[Reputation] localhost:3009 | messageSuccess (+1) | Score: 50 → 51
[Reputation] localhost:8080 | spamDetected (-10) | Score: 45 → 35
[PeerManager] Rejected peer localhost:4000 - reputation too low (15)
```

### Statistics

Query real-time statistics:

```javascript
const stats = peerManager.reputation.getStats();
console.log(`Average reputation: ${stats.averageScore}`);
console.log(`Bannable peers: ${stats.bannablePeers}`);
```

## Troubleshooting

### Peer Rejected - Reputation Too Low

**Symptom:** Peer cannot connect, logs show "reputation too low"

**Cause:** Peer's reputation score fell below ban threshold (20)

**Solution:**
1. Check peer's behavior history
2. Investigate cause of low score (spam, failures)
3. If legitimate peer, manually remove from reputation tracking
4. Peer will re-initialize with neutral score (50)

### All Peers Being Banned

**Symptom:** Network cannot maintain peer connections

**Possible Causes:**
- Network issues causing message failures
- Ban threshold too high
- Decay rate too aggressive

**Solution:**
1. Lower ban threshold: `reputationBanThreshold: 10`
2. Reduce decay rate: `reputationDecayRate: 0.05`
3. Check network connectivity

## Future Enhancements

Planned improvements for the reputation system:

1. **Persistent Storage** - Save reputation scores to disk
2. **Network-Wide Reputation** - Share reputation data across trusted nodes
3. **Weighted Behaviors** - Different weights for different message types
4. **Reputation Proofs** - Cryptographic proofs of good behavior
5. **Adaptive Thresholds** - Dynamic ban thresholds based on network health

## Changelog

### v1.0.0 (November 2025)
- Initial implementation
- 0-100 scoring system
- Behavior tracking (6 types)
- Auto-banning (threshold: 20)
- Reputation decay (0.1/hour)
- Integration with PeerManager and P2PProtocol
- Test suite

---

*Last updated: November 20, 2025*
