# NeuroSwarm IPFS Integration

## Overview

NeuroSwarm uses **IPFS (InterPlanetary File System)** for decentralized storage of:
- **VP Payloads:** Validation Proof data and results
- **Agent Artifacts:** Model weights, training data, outputs
- **Block Data:** Large block payloads (future)
- **Governance Documents:** Proposals, votes, decisions (future)

---

## Architecture

### Integration Points

```
VP Node → Validation Result
    ↓
Store to IPFS → CID (Content Identifier)
    ↓
Gateway Node → Retrieve via CID
    ↓
Verify Signature → Process Result
```

### IPFS Nodes

**VP Nodes:**
- Run local IPFS daemon
- Store validation payloads
- Pin important content
- Provide CIDs to Gateway

**Gateway Nodes:**
- Retrieve payloads via CID
- Verify Ed25519 signatures
- Cache frequently accessed content
- Relay to NS Nodes

---

## Setup

### 1. Install IPFS

**Windows:**
```powershell
# Download from https://dist.ipfs.tech/#kubo
# Extract and add to PATH
$env:PATH += ";C:\ipfs"

# Verify
ipfs --version
```

**Linux/Mac:**
```bash
wget https://dist.ipfs.tech/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo
sudo bash install.sh

# Verify
ipfs --version
```

### 2. Initialize IPFS

```bash
# Initialize repository
ipfs init

# Start daemon
ipfs daemon
```

**Output:**
```
Initializing daemon...
API server listening on /ip4/127.0.0.1/tcp/5001
Gateway server listening on /ip4/127.0.0.1/tcp/8080
Daemon is ready
```

### 3. Configure IPFS

```bash
# Enable CORS for local development
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["GET", "POST"]'

# Set storage limit
ipfs config Datastore.StorageMax 10GB
```

---

## Configuration

### Environment Variables

```bash
# IPFS Configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=http://localhost:8080
IPFS_ENABLED=true

# Storage
IPFS_PIN_ENABLED=true
IPFS_STORAGE_MAX=10GB
```

### NeuroSwarm Integration

**vp-node/.env:**
```bash
IPFS_API_URL=http://localhost:5001
IPFS_ENABLED=true
IPFS_PIN_ENABLED=true
```

**gateway-node/.env:**
```bash
IPFS_GATEWAY_URL=http://localhost:8080
IPFS_ENABLED=true
```

---

## Usage

### Storing VP Payloads

```javascript
import { create } from 'ipfs-http-client';

const ipfs = create({ url: 'http://localhost:5001' });

async function storeVPPayload(validationResult) {
    // Add to IPFS
    const { cid } = await ipfs.add(JSON.stringify(validationResult));
    
    // Pin for persistence
    await ipfs.pin.add(cid);
    
    console.log(`Stored to IPFS: ${cid}`);
    return cid.toString();
}
```

### Retrieving Payloads

```javascript
async function retrieveVPPayload(cid) {
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
        chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString();
    return JSON.parse(data);
}
```

---

## VP Payload Structure

### Validation Result

```javascript
{
    taskId: "task-123",
    vpNodeId: "vp-node-1",
    result: {
        valid: true,
        confidence: 0.95,
        metrics: { /* ... */ }
    },
    timestamp: 1763743318956,
    signature: "ed25519_signature",
    ipfsCid: "QmX..."  // Self-referential CID
}
```

### Signature Verification

```javascript
import { verify } from '@noble/ed25519';

async function verifyVPPayload(payload, publicKey) {
    const { signature, ...data } = payload;
    const message = JSON.stringify(data);
    const isValid = await verify(signature, message, publicKey);
    return isValid;
}
```

---

## API Endpoints

### Store Payload

**Endpoint:** `POST /ipfs/add`

**Request:**
```json
{
    "data": { /* validation result */ }
}
```

**Response:**
```json
{
    "cid": "QmX...",
    "size": 1024
}
```

### Retrieve Payload

**Endpoint:** `GET /ipfs/cat/:cid`

**Response:**
```json
{
    "taskId": "task-123",
    "result": { /* ... */ }
}
```

---

## Pinning Strategy

### Auto-Pin

```javascript
// Pin all VP payloads
const PIN_VP_PAYLOADS = true;

if (PIN_VP_PAYLOADS) {
    await ipfs.pin.add(cid);
}
```

### Manual Pin

```bash
# Pin specific CID
ipfs pin add QmX...

# List pins
ipfs pin ls

# Unpin
ipfs pin rm QmX...
```

---

## Performance

### Benchmarks

- **Add:** ~50ms for 1KB payload
- **Cat:** ~20ms for cached content
- **Pin:** ~10ms

### Optimization

**Caching:**
- Gateway caches frequently accessed CIDs
- Reduces IPFS daemon load
- Improves response time

**Batching:**
- Batch multiple payloads
- Use IPFS MFS (Mutable File System)

---

## Security

### Content Addressing

- CID is cryptographic hash of content
- Tampering changes CID
- Immutable by design

### Signature Verification

- All VP payloads signed with Ed25519
- Gateway verifies before processing
- Prevents payload forgery

---

## Monitoring

```javascript
async function getIPFSStats() {
    const stats = await ipfs.stats.repo();
    return {
        numObjects: stats.numObjects,
        repoSize: stats.repoSize,
        storageMax: stats.storageMax
    };
}
```

---

## Resources

- [IPFS Docs](https://docs.ipfs.tech/)
- [js-ipfs](https://github.com/ipfs/js-ipfs)
- [VP Node Integration](../vp-node/README.md)

---

## Next Steps

- **Phase 10:** IPFS cluster for redundancy
- **Future:** Filecoin integration for permanent storage
