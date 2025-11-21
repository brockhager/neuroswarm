# Phase 2: Encrypted Communication - Quick Start

## Overview

Phase 2 adds HTTPS encryption to all P2P communication. The implementation is complete and ready to integrate.

## What's Been Created

✅ **crypto.js** - Certificate management (RSA 2048-bit, self-signed)
✅ **https-server.js** - HTTPS server wrapper for easy integration
✅ **Dual-mode support** - HTTP + HTTPS run simultaneously

## How to Enable HTTPS

### Option 1: Use the HTTPS Wrapper (Recommended)

Add to any node's `server.js`:

```javascript
import { startHTTPSServer } from '../shared/peer-discovery/https-server.js';

// After HTTP server starts
const server = app.listen(PORT, () => {
  console.log(`HTTP server on port ${PORT}`);
});

// Add HTTPS server
startHTTPSServer(app, PORT, 'NS', peerManager.nodeId);
```

### Option 2: Manual Integration

```javascript
import https from 'https';
import { CryptoManager } from '../shared/peer-discovery/crypto.js';

const cryptoManager = new CryptoManager({
  nodeId: peerManager.nodeId,
  nodeType: 'NS'
});

const tlsOptions = await cryptoManager.getTLSOptions();
const httpsServer = https.createServer(tlsOptions, app);
httpsServer.listen(PORT + 1);
```

## Configuration

```bash
# Enable/disable TLS (default: enabled)
export P2P_ENABLE_TLS=true

# Custom certificate paths (optional)
export P2P_CERT_PATH=/path/to/cert.pem
export P2P_KEY_PATH=/path/to/key.pem
```

## Port Allocation

- **HTTP**: Configured PORT (e.g., 3009)
- **HTTPS**: PORT + 1 (e.g., 3010)

## Testing

```bash
# Test HTTP endpoint
curl http://localhost:3009/peers

# Test HTTPS endpoint (self-signed cert)
curl -k https://localhost:3010/peers
```

## Status

**Phase 2 Components:**
- ✅ Certificate management
- ✅ HTTPS server wrapper
- ⏸️ Integration into nodes (ready to add)
- ⏸️ P2PProtocol HTTPS support (optional enhancement)

**Next Steps:**
1. Add `startHTTPSServer()` call to each node type
2. Test HTTPS endpoints
3. (Optional) Update P2PProtocol to prefer HTTPS

## Files Created

- `shared/peer-discovery/crypto.js` - Certificate management
- `shared/peer-discovery/https-server.js` - HTTPS wrapper
- `shared/peer-discovery/index.js` - Export HTTPS utilities

---

*Ready to integrate - just add one function call to each node!*
