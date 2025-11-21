# NAT Traversal - Integration Guide

## Overview

NAT Traversal enables NeuroSwarm nodes behind home routers and firewalls to participate in the P2P network by discovering their public IP addresses using STUN (Session Traversal Utilities for NAT).

**Status**: Phase 3A Complete ✅ | Phase 3B Integration Guide

---

## What's Been Implemented

### ✅ STUN Client (`nat-traversal.js`)

**Features**:
- RFC 5389 compliant STUN protocol
- Public IP and port discovery
- NAT type detection
- Periodic refresh (every 5 minutes)
- Multiple STUN server support with fallback
- No external dependencies (uses Node.js `dgram`)

**Test Results**:
```
Public IP discovered: 70.93.97.218:59639
NAT Type: port-restricted
Behind NAT: true
```

**Files Created**:
- `shared/peer-discovery/nat-traversal.js` (320 lines)
- `test-nat.js` - Test suite

---

## How NAT Traversal Works

### 1. STUN Discovery Process

```
┌─────────────┐                    ┌──────────────┐
│ Your Node   │                    │ STUN Server  │
│ (Behind NAT)│                    │ (Public)     │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │  1. STUN Binding Request         │
       │─────────────────────────────────>│
       │                                  │
       │  2. STUN Binding Response        │
       │     (Your Public IP:Port)        │
       │<─────────────────────────────────│
       │                                  │
```

### 2. Peer Exchange with Public Address

```
Node A (Behind NAT)          Node B (Public/Behind NAT)
Public: 203.0.113.1:54321    Public: 198.51.100.5:12345
Local: 192.168.1.10:3009     Local: 10.0.0.5:3009

1. Node A discovers public IP via STUN
2. Node A shares public IP in peer metadata
3. Node B receives peer list with Node A's public IP
4. Node B connects to Node A via public IP
```

---

## Integration Steps

### Step 1: Import NAT Traversal

**File**: `shared/peer-discovery/peer-manager.js`

**Location**: Top of file, after existing imports

```javascript
import { ReputationManager } from './reputation.js';
import { NATTraversal } from './nat-traversal.js';  // ADD THIS LINE
```

---

### Step 2: Initialize NAT Traversal in Constructor

**File**: `shared/peer-discovery/peer-manager.js`

**Location**: In `PeerManager` constructor, after reputation system initialization

**Find this code**:
```javascript
// Reputation system
this.reputation = new ReputationManager({
    banThreshold: options.reputationBanThreshold || 20,
    decayRate: options.reputationDecayRate || 0.1
});

this.loadPeersFromDisk();
```

**Add after reputation, before `loadPeersFromDisk()`**:
```javascript
// Reputation system
this.reputation = new ReputationManager({
    banThreshold: options.reputationBanThreshold || 20,
    decayRate: options.reputationDecayRate || 0.1
});

// NAT Traversal (ADD THIS BLOCK)
this.natTraversal = new NATTraversal({
    enabled: options.natTraversalEnabled !== false,
    localPort: this.port,
    stunServers: options.stunServers,
    refreshInterval: options.natRefreshInterval
});

this.loadPeersFromDisk();

// Start NAT traversal if enabled (ADD THIS BLOCK)
if (this.natTraversal.enabled) {
    this.natTraversal.startPeriodicRefresh();
    console.log('[PeerManager] NAT traversal enabled');
}
```

---

### Step 3: Update `getNodeInfo()` Method

**File**: `shared/peer-discovery/peer-manager.js`

**Location**: Find the `getNodeInfo()` method

**Replace this**:
```javascript
getNodeInfo() {
    return {
        nodeId: this.nodeId,
        nodeType: this.nodeType,
        port: this.port,
        maxPeers: this.maxPeers,
        peerCount: this.peers.size
    };
}
```

**With this**:
```javascript
getNodeInfo() {
    const publicAddress = this.natTraversal.getPublicAddress();
    
    return {
        nodeId: this.nodeId,
        nodeType: this.nodeType,
        port: this.port,
        publicIP: publicAddress.ip,           // NEW
        publicPort: publicAddress.port,       // NEW
        natType: publicAddress.natType,       // NEW
        maxPeers: this.maxPeers,
        peerCount: this.peers.size
    };
}
```

---

### Step 4: Update `addPeer()` Method

**File**: `shared/peer-discovery/peer-manager.js`

**Location**: Find the `addPeer()` method

**Step 4a**: Update destructuring to accept public address fields

**Find this line**:
```javascript
const { host, port, nodeType = 'NS', source = 'manual' } = peerInfo;
```

**Replace with**:
```javascript
const { host, port, nodeType = 'NS', source = 'manual', publicHost, publicPort, natType } = peerInfo;
```

**Step 4b**: Add public address fields to peer object

**Find this block**:
```javascript
this.peers.set(peerId, {
    id: peerId,
    host,
    port,
    nodeType,
    addedAt: new Date().toISOString(),
    source
});
```

**Replace with**:
```javascript
this.peers.set(peerId, {
    id: peerId,
    host,
    port,
    nodeType,
    publicHost: publicHost || null,    // NEW
    publicPort: publicPort || null,    // NEW
    natType: natType || null,          // NEW
    addedAt: new Date().toISOString(),
    source
});
```

---

### Step 5: Update `getAllPeers()` Method

**File**: `shared/peer-discovery/peer-manager.js`

**Location**: Find the `getAllPeers()` method

**Find this**:
```javascript
getAllPeers(filterType = null) {
    let peers = Array.from(this.peers.values());
    
    if (filterType) {
        peers = peers.filter(p => p.nodeType === filterType);
    }

    // Sort by reputation (highest first)
    peers.sort((a, b) => {
        const scoreA = this.reputation.getScore(a.id);
        const scoreB = this.reputation.getScore(b.id);
        return scoreB - scoreA;
    });

    return peers;
}
```

**Replace with**:
```javascript
getAllPeers(filterType = null) {
    let peers = Array.from(this.peers.values());
    
    if (filterType) {
        peers = peers.filter(p => p.nodeType === filterType);
    }

    // Sort by reputation (highest first)
    peers.sort((a, b) => {
        const scoreA = this.reputation.getScore(a.id);
        const scoreB = this.reputation.getScore(b.id);
        return scoreB - scoreA;
    });

    // Include public address if available (NEW)
    return peers.map(p => ({
        ...p,
        publicHost: p.publicHost || null,
        publicPort: p.publicPort || null,
        natType: p.natType || null
    }));
}
```

---

## Configuration

### Environment Variables

```bash
# Enable/disable NAT traversal (default: enabled)
export NAT_TRAVERSAL_ENABLED=true

# Custom STUN servers (comma-separated)
export STUN_SERVERS="stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"

# Refresh interval in milliseconds (default: 300000 = 5 minutes)
export NAT_REFRESH_INTERVAL=300000
```

### Example Node Configuration

**Node Behind NAT**:
```bash
export PORT=3009
export NAT_TRAVERSAL_ENABLED=true
export BOOTSTRAP_PEERS="public-node.example.com:3009:NS"
```

**Public Node (No NAT)**:
```bash
export PORT=3009
export NAT_TRAVERSAL_ENABLED=false  # Optional, can leave enabled
export BOOTSTRAP_PEERS="other-node.example.com:3009:NS"
```

---

## Testing the Integration

### 1. Test STUN Client Standalone

```bash
cd c:/JS/ns/neuroswarm
node test-nat.js
```

**Expected Output**:
```
=== NAT Traversal / STUN Client Test ===

Test 1: Discover public IP address...
[NAT] Public address discovered: 70.93.97.218:59639
✓ Public IP discovered: 70.93.97.218:59639

Test 2: Get public address...
Public IP: 70.93.97.218
Public Port: 59639
NAT Type: port-restricted
Last Refresh: Thu Nov 20 2025 22:33:10 GMT-0700

=== All Tests Complete ===
✓ STUN client is working correctly!
```

### 2. Test Integration with PeerManager

After integration, start a node and check `/peers` endpoint:

```bash
# Start NS node
cd c:/JS/ns/neuroswarm/ns-node
node server.js

# In another terminal, query peers
curl http://localhost:3009/peers
```

**Expected Response**:
```json
{
  "node": {
    "nodeId": "node-abc123",
    "nodeType": "NS",
    "port": 3009,
    "publicIP": "70.93.97.218",
    "publicPort": 59639,
    "natType": "port-restricted",
    "maxPeers": 8,
    "peerCount": 2
  },
  "peers": [
    {
      "id": "localhost:8080",
      "host": "localhost",
      "port": 8080,
      "nodeType": "Gateway",
      "publicHost": "203.0.113.1",
      "publicPort": 54321,
      "natType": "port-restricted"
    }
  ]
}
```

---

*Continued in second half...*

---

## Advanced Topics

### Connection Priority Strategy

When connecting to peers with public addresses, use this priority:

1. **Try public HTTPS** (if peer supports HTTPS and has public IP)
2. **Try public HTTP** (if peer has public IP)
3. **Try local HTTPS** (fallback to local address)
4. **Try local HTTP** (final fallback)

**Example Implementation** (for future P2PProtocol updates):
```javascript
async function connectToPeer(peer) {
  const attempts = [];
  
  // Priority 1: Public HTTPS
  if (peer.publicHost && peer.supportsHttps) {
    attempts.push(`https://${peer.publicHost}:${peer.publicPort + 1}`);
  }
  
  // Priority 2: Public HTTP
  if (peer.publicHost) {
    attempts.push(`http://${peer.publicHost}:${peer.publicPort}`);
  }
  
  // Priority 3: Local HTTPS
  if (peer.supportsHttps) {
    attempts.push(`https://${peer.host}:${peer.port + 1}`);
  }
  
  // Priority 4: Local HTTP
  attempts.push(`http://${peer.host}:${peer.port}`);
  
  // Try each in order
  for (const url of attempts) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return url;
    } catch (err) {
      continue;
    }
  }
  
  throw new Error('All connection attempts failed');
}
```

### NAT Type Compatibility

| Your NAT | Peer NAT | STUN Works | Notes |
|----------|----------|------------|-------|
| Full Cone | Any | ✅ Yes | Best case |
| Restricted | Full Cone | ✅ Yes | Common |
| Restricted | Restricted | ✅ Yes | Common |
| Port Restricted | Port Restricted | ✅ Yes | Most home routers |
| Symmetric | Any | ❌ No | Needs TURN relay |
| Any | Symmetric | ❌ No | Needs TURN relay |

**Note**: ~80% of home routers use Full Cone, Restricted, or Port Restricted NAT, which work with STUN alone.

### Handling Public IP Changes

Public IPs can change when:
- Router reboots
- ISP DHCP lease expires
- VPN connects/disconnects

**Mitigation**:
- Periodic refresh (every 5 minutes by default)
- Peers update via PEX when public IP changes
- Old connections may break, new ones use updated IP

---

## Troubleshooting

### Issue: Public IP Not Discovered

**Symptoms**:
```
[NAT] All STUN servers failed
Public IP: null
```

**Causes**:
1. Firewall blocking UDP port 3478
2. All STUN servers down
3. Network doesn't allow UDP

**Solutions**:
```bash
# Try different STUN servers
export STUN_SERVERS="stun:stun.l.google.com:19302,stun:stun.ekiga.net:3478"

# Check firewall
# Windows: Allow UDP outbound on port 3478
# Linux: sudo ufw allow out 3478/udp

# Test manually
node test-nat.js
```

### Issue: NAT Type Shows "unknown"

**Symptoms**:
```
NAT Type: unknown
```

**Cause**: Simplified NAT detection doesn't perform full RFC 3489 tests

**Solution**: This is expected. The basic detection works for most cases. Full NAT type detection requires multiple STUN requests and is optional.

### Issue: Peers Can't Connect via Public IP

**Symptoms**:
- Public IP discovered correctly
- Peers receive public IP via PEX
- Connection attempts fail

**Causes**:
1. Symmetric NAT (incompatible with STUN alone)
2. Firewall blocking inbound connections
3. Port mapping expired

**Solutions**:
```bash
# Check NAT type
node test-nat.js
# If "symmetric", you need TURN relay (Phase 3C)

# Check if port is accessible
# Use online port checker: https://www.yougetsignal.com/tools/open-ports/

# Increase refresh frequency
export NAT_REFRESH_INTERVAL=60000  # 1 minute
```

### Issue: High Memory Usage

**Symptoms**: Memory usage increases over time

**Cause**: Peer list growing without bounds

**Solution**: Already handled by `pruneInactivePeers()`, but verify it's running:
```javascript
// Should be called every 30 seconds in server.js
setInterval(() => {
  peerManager.pruneInactivePeers();
}, 30000);
```

---

## Security Considerations

### STUN Server Trust

**Risk**: STUN servers can see your public IP

**Mitigation**:
- Use reputable STUN servers (Google, Twilio, etc.)
- Consider running your own STUN server
- Public IP is already visible to any peer you connect to

### Port Prediction Attacks

**Risk**: Attackers might predict your NAT port mappings

**Mitigation**:
- Modern routers use random port allocation
- Symmetric NAT is immune (but requires TURN)
- Not a significant risk for P2P applications

### DDoS Amplification

**Risk**: STUN can be used for DDoS amplification attacks

**Mitigation**:
- Rate limit STUN requests (built into `NATTraversal`)
- Validate STUN responses (already implemented)
- Use multiple STUN servers to distribute load

---

## Performance Considerations

### Bandwidth Usage

**STUN Discovery**:
- Request: ~28 bytes
- Response: ~28 bytes
- Frequency: Every 5 minutes
- **Total**: <1 KB/hour per node

**Peer Exchange with Public Address**:
- Additional ~20 bytes per peer
- Negligible impact

### Latency

**Initial Discovery**: 100-500ms (one-time on startup)
**Periodic Refresh**: Async, no impact on operations
**Connection Attempts**: Public IP may be faster than local IP for remote peers

### Memory

**Per Node**: ~500 bytes (public IP, port, NAT type)
**Total**: Minimal (<50 KB for 100 peers)

---

## Best Practices

### ✅ DO

- **Enable NAT traversal by default** - Works for both NAT and public nodes
- **Use multiple STUN servers** - Provides fallback if one fails
- **Refresh periodically** - Keeps public IP current
- **Test with real NAT** - Deploy behind home router to verify
- **Monitor public IP changes** - Log when IP changes for debugging

### ❌ DON'T

- **Don't disable for public nodes** - No harm in running STUN even if not behind NAT
- **Don't use only one STUN server** - Single point of failure
- **Don't set refresh interval too low** - Wastes bandwidth (5 min is optimal)
- **Don't assume all NAT types work** - Symmetric NAT needs TURN
- **Don't expose STUN credentials** - If using authenticated TURN servers

---

## Roadmap

### ✅ Phase 3A: STUN Client - COMPLETE
- STUN protocol implementation
- Public IP discovery
- NAT type detection
- Periodic refresh
- Multiple server support

### 📋 Phase 3B: Integration - READY
- Manual integration guide (this document)
- Peer metadata updates
- PEX with public addresses
- Connection priority logic

### 🔮 Phase 3C: TURN Support - FUTURE
- TURN relay for symmetric NAT
- Authenticated TURN servers
- Bandwidth optimization
- Fallback for UDP-blocked networks

### 🔮 Future Enhancements
- ICE (Interactive Connectivity Establishment)
- WebRTC data channels
- Automatic TURN fallback
- NAT type-specific optimizations

---

## API Reference

### NATTraversal Class

```javascript
import { NATTraversal } from './shared/peer-discovery/nat-traversal.js';

const nat = new NATTraversal({
  enabled: true,                    // Enable/disable NAT traversal
  localPort: 3009,                  // Local port for binding
  stunServers: [                    // STUN servers to use
    'stun.l.google.com:19302',
    'stun1.l.google.com:19302'
  ],
  refreshInterval: 300000           // Refresh interval (ms)
});
```

#### Methods

**`async discoverPublicAddress()`**
- Discovers public IP and port using STUN
- Returns: `{ ip, port }` or `null` if failed
- Updates internal state

**`async detectNATType()`**
- Detects NAT type (simplified)
- Returns: `'port-restricted'` | `'unknown'`
- Calls `discoverPublicAddress()` if needed

**`startPeriodicRefresh()`**
- Starts periodic public IP refresh
- Runs every `refreshInterval` milliseconds
- Logs IP changes

**`stopPeriodicRefresh()`**
- Stops periodic refresh
- Call on shutdown

**`getPublicAddress()`**
- Returns current public address
- Returns: `{ ip, port, natType, lastRefresh }`

**`isBehindNAT(localIP)`**
- Checks if behind NAT
- Returns: `true` if public IP differs from local IP

**`destroy()`**
- Cleanup method
- Stops periodic refresh

---

## Examples

### Example 1: Basic Usage

```javascript
import { NATTraversal } from './shared/peer-discovery/nat-traversal.js';

const nat = new NATTraversal({ localPort: 3009 });

// Discover public IP
const result = await nat.discoverPublicAddress();
console.log(`Public IP: ${result.ip}:${result.port}`);

// Start periodic refresh
nat.startPeriodicRefresh();

// Get current address
const addr = nat.getPublicAddress();
console.log(`Current: ${addr.ip}:${addr.port}`);

// Cleanup
nat.destroy();
```

### Example 2: Custom STUN Servers

```javascript
const nat = new NATTraversal({
  localPort: 3009,
  stunServers: [
    'stun:stun.myserver.com:3478',
    'stun:stun.l.google.com:19302'
  ]
});
```

### Example 3: Disable NAT Traversal

```javascript
const nat = new NATTraversal({
  enabled: false  // Disabled
});

// All methods return null/default values
const addr = nat.getPublicAddress();
// Returns: { ip: null, port: null, natType: null, lastRefresh: null }
```

---

## FAQ

**Q: Do I need NAT traversal if my node is on a public IP?**
A: No, but it doesn't hurt. NAT traversal will simply discover your public IP and use it.

**Q: What if all STUN servers fail?**
A: The node will continue operating with local addresses only. Peers on the same local network can still connect.

**Q: Can I use my own STUN server?**
A: Yes! Set `STUN_SERVERS` environment variable to your server address.

**Q: Does this work with IPv6?**
A: Currently IPv4 only. IPv6 support is planned for future releases.

**Q: What about symmetric NAT?**
A: Symmetric NAT requires TURN relay servers (Phase 3C). STUN alone won't work.

**Q: How much bandwidth does this use?**
A: Minimal. ~1 KB/hour for periodic STUN refreshes.

**Q: Can I disable NAT traversal?**
A: Yes, set `NAT_TRAVERSAL_ENABLED=false` in environment variables.

---

## Related Documentation

- [P2P Communication](../Communication/README.md) - Overall P2P system
- [Peer Discovery](../peer-discovery/README.md) - Peer discovery mechanics
- [Reputation System](../Reputation-System/README.md) - Peer reputation
- [Encrypted Communication](../Encrypted-Communication/README.md) - HTTPS/TLS

---

## Support

For issues or questions:
1. Check logs with `[NAT]` prefix
2. Run `test-nat.js` to verify STUN client
3. Verify firewall allows UDP on port 3478
4. Try different STUN servers
5. Check NAT type compatibility table

---

*Last updated: November 20, 2025*
*Version: 1.0 (Phase 3A Complete)*
*Integration: Manual (Phase 3B Ready)*
