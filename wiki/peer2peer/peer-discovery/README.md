# Peer Discovery

NeuroSwarm implements **universal peer-to-peer networking** across all node types (NS, Gateway, VP), enabling nodes to discover each other and propagate data across the network.

## Overview

The peer discovery system allows all NeuroSwarm nodes to:
- Discover peers via bootstrap configuration with node type awareness
- Exchange peer lists (Peer Exchange Protocol)
- Broadcast blocks and transactions using gossip protocol
- Filter peers by node type (NS, Gateway, VP)
- Monitor peer health and auto-remove dead peers
- Run multiple nodes on the same port across different machines

## Architecture

### Components

**PeerManager** (`shared/peer-discovery/peer-manager.js`)
- **Universal**: Works with NS, Gateway, and VP nodes
- Manages peer storage (in-memory + disk persistence)
- Loads bootstrap peers from environment variables with type metadata
- Tracks peer health and prunes inactive peers
- Provides API endpoints for peer management

**P2PProtocol** (`ns-node/peer-discovery/p2p-protocol.js`)
- Implements gossip protocol with message deduplication
- Handles 5 message types: PEER_LIST, NEW_BLOCK, NEW_TX, PING, PONG
- Broadcasts messages to all peers with hop limiting
- Manages Peer Exchange (PEX) protocol

### Message Flow

```
TX arrives at Node 1
  → Node 1 broadcasts to [Node 2, Node 3]
    → Node 2 receives, marks as seen, broadcasts to [Node 3]
      → Node 3 receives from both, deduplicates
```

## Configuration

### Environment Variables

- `PORT` - Node listening port (default: 3000)
- `BOOTSTRAP_PEERS` - Comma-separated list of initial peers with optional node types
  - Format: `host:port:type` (type is optional, defaults to NS)
  - Example: `localhost:3010:Gateway,localhost:4000:VP,192.168.1.5:3009:NS`
- `MAX_PEERS` - Maximum peer connections (default: 8)

### Local Testing (3 Nodes)

```bash
# Node 1 (NS Node)
PORT=3009 BOOTSTRAP_PEERS=localhost:3010:NS node server.js

# Node 2  
PORT=3010 BOOTSTRAP_PEERS=localhost:3009 node server.js

# Node 3
PORT=3011 BOOTSTRAP_PEERS=localhost:3009,localhost:3010 node server.js
```

Or use the convenience script:
```bash
cd neuroswarm
start-3-nodes.bat
```

### Production (Multi-Machine)

```bash
# Machine A (192.168.1.10)
PORT=3009 BOOTSTRAP_PEERS=192.168.1.11:3009 node server.js

# Machine B (192.168.1.11)
PORT=3009 BOOTSTRAP_PEERS=192.168.1.10:3009 node server.js
```

## API Endpoints

### GET /peers
List all known peers, optionally filtered by node type.

**Query Parameters:**
- `type` (optional) - Filter by node type: `NS`, `Gateway`, or `VP`

**Examples:**
```bash
# Get all peers
curl http://localhost:3009/peers

# Get only Gateway nodes
curl http://localhost:3009/peers?type=Gateway

# Get only VP nodes
curl http://localhost:3009/peers?type=VP
```

**Response:**
```json
{
  "node": {
    "nodeId": "node-1763681234567-abc123",
    "nodeType": "NS",
    "port": 3009,
    "peerCount": 2,
    "maxPeers": 8
  },
  "peers": [
    {
      "id": "localhost:3010",
      "host": "localhost",
      "port": 3010,
      "nodeType": "Gateway",
      "addedAt": "2025-11-20T19:30:00.000Z",
      "source": "bootstrap"
    }
  ],
  "count": 1,
  "filter": "Gateway"
}
```

### POST /peers/add
Manually add a peer with optional node type.

**Request:**
```json
{
  "host": "localhost",
  "port": 3012,
  "nodeType": "Gateway"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Added peer localhost:3012"
}
```

### DELETE /peers/:peerId
Remove a peer.

**Example:**
```bash
curl -X DELETE http://localhost:3009/peers/localhost:3010
```

### POST /p2p/message
Handle incoming P2P messages (internal use).

## Features

### Gossip Protocol
- Messages broadcast to all peers
- Deduplication via seen message tracking (1000 max, 5min TTL)
- Hop limiting (max 10 hops) prevents infinite loops
- Automatic message expiration

### Peer Exchange (PEX)
- Every 30 seconds, nodes send peer lists to random peers
- Enables network-wide discovery without central coordination
- New nodes quickly discover entire network

### Health Monitoring
- Ping all peers every 30 seconds
- Track consecutive failures (auto-remove after 5)
- Prune inactive peers after 1 hour
- Update peer health on successful communication

## Verification

### Check Peer Discovery
```bash
curl http://localhost:3009/peers
curl http://localhost:3010/peers
curl http://localhost:3011/peers
```

Each node should list the other nodes in its peer list.

### Monitor P2P Activity

Watch node logs for:
```
[PeerManager] Added peer: localhost:3010 (source: bootstrap)
[P2P] Sent PEER_LIST to localhost:3010
[P2P] Received PEER_LIST from ::1
[P2P] Broadcast NEW_TX: sent=2, failed=0
```

## Files

- `ns-node/peer-discovery/peer-manager.js` - Peer management
- `ns-node/peer-discovery/p2p-protocol.js` - P2P messaging
- `ns-node/peer-discovery/index.js` - Module exports
- `ns-node/server.js` - Integration point
- `start-3-nodes.bat` - Local testing script

## See Also

- [NS Node](../ns-node/) - NS Node service documentation
- [VP Node](../vp-node/) - Validator/Producer node
- [Gateway Node](../gateway-node/) - Gateway service
