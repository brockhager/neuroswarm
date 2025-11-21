# P2P Communication System

Comprehensive guide to NeuroSwarm's peer-to-peer communication infrastructure.

## Overview

NeuroSwarm uses a decentralized P2P network for communication between NS Nodes, Gateway Nodes, and VP Nodes. The system supports universal peer discovery, gossip protocol messaging, and reputation-based peer management.

## Architecture

### Core Components

**Peer Discovery** (`shared/peer-discovery/`)
- `peer-manager.js` - Peer lifecycle management
- `p2p-protocol.js` - Message handling and gossip protocol
- `reputation.js` - Peer reputation scoring
- `crypto.js` - TLS certificate management (Phase 2)

### Network Topology

```
NS Nodes ←→ Gateway Nodes ←→ VP Nodes
    ↓           ↓              ↓
  Full mesh connectivity
```

All nodes can discover and communicate with any other node type.

## Peer Discovery

### Bootstrap Configuration

Nodes discover initial peers via `BOOTSTRAP_PEERS` environment variable:

```bash
# Format: host:port:nodeType,host:port:nodeType
export BOOTSTRAP_PEERS="localhost:3009:NS,localhost:8080:Gateway,localhost:4000:VP"
```

**Node Type Values**: `NS`, `Gateway`, `VP`

### Peer Metadata

Each peer stores:
```javascript
{
  id: "localhost:3009",
  host: "localhost",
  port: 3009,
  nodeType: "NS",
  addedAt: "2025-11-20T...",
  source: "bootstrap" | "pex" | "manual"
}
```

### Peer Exchange (PEX)

Nodes automatically share peer lists every 30 seconds:
- Discovers peers beyond bootstrap configuration
- Propagates network topology
- Enables mesh network formation

## Message Protocol

### Message Types

| Type | Purpose | Propagation |
|------|---------|-------------|
| `PEER_LIST` | Share known peers | No |
| `NEW_BLOCK` | Broadcast new block | Yes (gossip) |
| `NEW_TX` | Broadcast transaction | Yes (gossip) |
| `PING` | Health check | No |
| `PONG` | Health check response | No |

### Message Structure

```javascript
{
  id: "node-123-1234567890-abc",
  type: "NEW_TX",
  payload: { /* message data */ },
  originNodeId: "node-123",
  timestamp: "2025-11-20T...",
  hops: 0
}
```

### Gossip Protocol

**Features**:
- Message deduplication (seen message cache)
- Hop count limiting (max 10 hops)
- Automatic propagation to all peers
- Excludes sender from rebroadcast

**Deduplication**:
- Tracks seen messages by ID
- 5-minute message timeout
- Max 1000 cached messages

## Health Monitoring

### Ping/Pong Protocol

Every 30 seconds:
1. Send `PING` to all peers
2. Expect `PONG` response
3. Track failures per peer
4. Remove after 5 consecutive failures

### Peer Pruning

Inactive peers (no activity for 1 hour) are automatically removed.

## API Endpoints

All node types expose these P2P endpoints:

### `GET /peers`

List all known peers with optional type filtering.

**Query Parameters**:
- `type` - Filter by node type (`NS`, `Gateway`, `VP`)

**Response**:
```json
{
  "count": 3,
  "peers": [
    {
      "id": "localhost:3009",
      "host": "localhost",
      "port": 3009,
      "nodeType": "NS",
      "source": "bootstrap"
    }
  ]
}
```

### `POST /peers/add`

Manually add a peer.

**Request Body**:
```json
{
  "host": "192.168.1.10",
  "port": 3009,
  "nodeType": "NS"
}
```

### `DELETE /peers/:peerId`

Remove a peer from the peer list.

### `POST /p2p/message`

Internal endpoint for receiving P2P messages. Not for external use.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3009 | Node listening port |
| `BOOTSTRAP_PEERS` | - | Initial peer list |
| `MAX_PEERS` | 8 | Maximum peer connections |
| `P2P_ENABLE_TLS` | false | Enable encrypted communication |

### Example Configuration

**NS Node**:
```bash
export PORT=3009
export BOOTSTRAP_PEERS="localhost:8080:Gateway"
export MAX_PEERS=10
```

**Gateway Node**:
```bash
export PORT=8080
export BOOTSTRAP_PEERS="localhost:3009:NS,localhost:4000:VP"
export MAX_PEERS=20
```

**VP Node**:
```bash
export PORT=4000
export BOOTSTRAP_PEERS="localhost:8080:Gateway"
export MAX_PEERS=8
```

## Testing

### Start Test Network

```bash
# Use the provided test script
cd c:/JS/ns/neuroswarm
./start-universal-p2p.bat
```

This starts:
- NS Node on port 3009
- Gateway Node on port 8080
- VP Node on port 4000

### Verify Peer Discovery

```bash
# Check NS node peers
curl http://localhost:3009/peers

# Check Gateway node peers
curl http://localhost:8080/peers

# Check VP node peers
curl http://localhost:4000/peers
```

### Test Type Filtering

```bash
# Find all Gateway nodes
curl "http://localhost:3009/peers?type=Gateway"

# Find all VP nodes
curl "http://localhost:8080/peers?type=VP"

# Find all NS nodes
curl "http://localhost:4000/peers?type=NS"
```

## Reputation System

See [Reputation System Documentation](../Reputation-System/README.md) for details on peer scoring and auto-banning.

**Quick Summary**:
- Peers scored 0-100
- Good behavior rewarded (+1 to +2)
- Bad behavior penalized (-2 to -10)
- Auto-ban peers with score < 20
- Reputation decays over time

## Security Features

### Current (Phase 1)
- ✅ Peer reputation system
- ✅ Auto-banning of malicious peers
- ✅ Message deduplication
- ✅ Hop limit (prevents loops)

### Planned (Phase 2)
- 🔄 TLS/HTTPS encryption
- 🔄 Certificate-based authentication
- 🔄 Certificate pinning

### Planned (Phase 3)
- 📋 NAT traversal (STUN/TURN)
- 📋 Hole-punching support

## Troubleshooting

### No Peers Discovered

**Check**:
1. `BOOTSTRAP_PEERS` is set correctly
2. Bootstrap nodes are running
3. Ports are not blocked by firewall
4. Node types are specified correctly

### Peer Rejected

**Cause**: Reputation score too low (< 20)

**Solution**: Check reputation with `/peers` endpoint, investigate behavior history

### Messages Not Propagating

**Check**:
1. Peers are connected (`/peers` shows peers)
2. Message hop count < 10
3. Message not already seen (deduplication)
4. P2P endpoint `/p2p/message` is accessible

## Monitoring & Logging

### Log Prefixes

P2P events use consistent log prefixes:

```
[PeerManager] - Peer lifecycle events
[P2P] - Protocol and messaging events
[Reputation] - Reputation scoring events
[Crypto] - Certificate and encryption events
```

### Example Logs

**Successful Peer Discovery**:
```
[PeerManager] Added peer: localhost:8080 (type: Gateway, source: bootstrap, reputation: 50)
[P2P] Sent peer list to localhost:8080
[Reputation] localhost:8080 | peerExchange (+2) | Score: 50 → 52
```

**Failed Communication**:
```
[P2P] Error sending to localhost:4000: ECONNREFUSED
[Reputation] localhost:4000 | messageFailure (-2) | Score: 50 → 48
[PeerManager] Removing unhealthy peer: localhost:4000 (5 failures)
```

### Metrics

Query peer statistics:

```bash
# Get peer count
curl http://localhost:3009/peers | jq '.count'

# Get reputation stats
# (Available via PeerManager API)
peerManager.reputation.getStats()
```

## Performance Considerations

### Message Overhead

- **Deduplication**: O(1) lookup via Map
- **Hop Limiting**: Prevents infinite loops
- **Seen Message Cache**: Limited to 1000 messages
- **Cache Cleanup**: Every 60 seconds

### Network Efficiency

**Peer Exchange**:
- Frequency: Every 30 seconds
- Payload: ~1KB per peer list
- Bandwidth: Minimal (<10KB/min per peer)

**Health Checks**:
- Frequency: Every 30 seconds
- Payload: ~200 bytes per ping
- Timeout: 5 seconds

### Scalability

**Current Limits**:
- Max peers per node: 8 (configurable)
- Max hop count: 10
- Seen message cache: 1000 messages

**Recommended for Production**:
- Increase `MAX_PEERS` to 20-50 for hub nodes
- Monitor memory usage with large peer counts
- Consider peer prioritization based on reputation

## Advanced Usage

### Custom Peer Discovery

Programmatically add peers:

```javascript
import { PeerManager } from './shared/peer-discovery/peer-manager.js';

const peerManager = new PeerManager({
  nodeType: 'NS',
  port: 3009,
  maxPeers: 20
});

// Add peer manually
peerManager.addPeer({
  host: '192.168.1.100',
  port: 3009,
  nodeType: 'NS',
  source: 'manual'
});
```

### Custom Message Broadcasting

```javascript
import { P2PProtocol, MessageType } from './shared/peer-discovery/p2p-protocol.js';

const p2pProtocol = new P2PProtocol(peerManager);

// Broadcast custom message
const message = p2pProtocol.createMessage(
  MessageType.NEW_TX,
  { txId: 'abc123', data: {...} },
  peerManager.nodeId
);

await p2pProtocol.broadcastMessage(message);
```

### Reputation Management

```javascript
// Get peer reputation
const score = peerManager.reputation.getScore('localhost:3009');

// Record custom behavior
peerManager.reputation.recordBehavior('localhost:3009', 'messageSuccess');

// Get top peers
const topPeers = peerManager.reputation.getTopPeers(5);

// Check if peer should be banned
if (peerManager.reputation.shouldBan(peerId)) {
  peerManager.removePeer(peerId);
}
```

## Migration Guide

### Upgrading from Single-Node to P2P

**Before** (Single Node):
```javascript
// Direct HTTP calls
const response = await fetch('http://localhost:3009/api/data');
```

**After** (P2P Network):
```javascript
// Broadcast via P2P
const message = p2pProtocol.createMessage(
  MessageType.NEW_TX,
  { data: {...} },
  nodeId
);
await p2pProtocol.broadcastMessage(message);
```

### Adding New Node Types

1. Update `BOOTSTRAP_PEERS` with new node type
2. Ensure new nodes import `PeerManager` and `P2PProtocol`
3. Initialize with correct `nodeType`
4. Add P2P endpoints to server

Example for new "Validator" node type:

```javascript
const peerManager = new PeerManager({
  nodeType: 'Validator',  // New type
  port: 5000,
  bootstrapPeers: 'localhost:3009:NS,localhost:8080:Gateway'
});
```

## Best Practices

### Peer Management

✅ **DO**:
- Use bootstrap peers for initial discovery
- Let PEX expand the network naturally
- Monitor peer reputation scores
- Remove unhealthy peers promptly

❌ **DON'T**:
- Manually manage all peer connections
- Ignore reputation warnings
- Set `MAX_PEERS` too low (< 5)
- Disable health monitoring

### Message Broadcasting

✅ **DO**:
- Use message deduplication
- Respect hop limits
- Include origin node ID
- Handle broadcast failures gracefully

❌ **DON'T**:
- Broadcast without deduplication
- Ignore hop count
- Rebroadcast to sender
- Assume all peers receive messages

### Security

✅ **DO**:
- Monitor reputation scores
- Auto-ban low-reputation peers
- Validate message integrity
- Use TLS when available (Phase 2)

❌ **DON'T**:
- Trust all peers equally
- Ignore spam indicators
- Accept messages without validation
- Disable reputation system

## Roadmap

### Phase 1: Peer Discovery ✅ COMPLETE
- Universal peer discovery
- Peer Exchange (PEX)
- Health monitoring
- Reputation system

### Phase 2: Encrypted Communication 🔄 IN PROGRESS
- TLS/HTTPS support
- Self-signed certificates
- Certificate pinning
- Dual-mode (HTTP + HTTPS)

### Phase 3: NAT Traversal 📋 PLANNED
- STUN client
- Public IP discovery
- Hole-punching
- TURN relay support

### Future Enhancements 💡
- DHT-based peer discovery
- Peer reputation sharing
- Advanced spam detection
- Connection pooling
- WebSocket support

## Related Documentation

- [Peer Discovery](../peer-discovery/README.md) - Detailed peer discovery mechanics
- [Reputation System](../Reputation-System/README.md) - Peer scoring and banning
- [Encrypted Communication](../Encrypted-Communication/README.md) - TLS/HTTPS setup (Phase 2)

## Support

For issues or questions:
1. Check logs with `[PeerManager]` and `[P2P]` prefixes
2. Verify peer connectivity with `/peers` endpoint
3. Review reputation scores for problematic peers
4. Consult troubleshooting section above

---

*Last updated: November 20, 2025*
*Version: 1.0 (Phase 1 Complete)*
