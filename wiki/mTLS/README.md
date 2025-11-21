# mTLS - Mutual TLS Authentication for P2P Network

## Overview

mTLS (Mutual TLS) provides certificate-based peer authentication using Ed25519 identity certificates. This ensures both peers authenticate each other, preventing man-in-the-middle attacks and unauthorized peer connections.

**Status**: Phase 4C Complete ✅

---

## Features

### Ed25519 Identity Certificates
- **Algorithm**: Ed25519 (Curve25519)
- **Self-Signed**: No external CA required
- **Validity**: 1 year (configurable)
- **Fingerprint**: SHA-256 hash (16 characters)

### Mutual Authentication
- Both peers present certificates
- Both peers verify each other
- Certificate fingerprint tracking
- Expiration checking

### Migration Mode
- **Default**: Certificates optional (backward compatible)
- **Enforcement**: Certificates required (full mTLS)
- Gradual rollout support

### Reputation Integration
- Invalid certificates → reputation penalty
- Missing certificates → reputation penalty (if required)
- Automatic peer banning for repeated violations

---

## How It Works

### Certificate Generation

Each node generates an Ed25519 identity certificate on startup:

```javascript
const crypto = new CryptoManager({ nodeId: 'node-1', nodeType: 'NS' });
const identity = crypto.generateIdentityCertificate();

// Returns:
{
  publicKey: '-----BEGIN PUBLIC KEY-----...',
  privateKey: '-----BEGIN PRIVATE KEY-----...',
  certificate: {
    version: 1,
    subject: { commonName: 'NS-node-1', nodeId: 'node-1', nodeType: 'NS' },
    publicKey: '...',
    notBefore: 1700527890123,
    notAfter: 1732063890123,
    signature: 'base64-encoded-signature'
  },
  fingerprint: '2303e44aac58cd3b'
}
```

### Certificate Verification

When a peer connects, their certificate is verified:

```javascript
const verification = crypto.verifyPeerCertificate(peerCert);

// Checks:
// 1. Required fields present
// 2. Not expired (notBefore < now < notAfter)
// 3. Valid Ed25519 signature
// 4. Certificate integrity

// Returns:
{ valid: true }  // or { valid: false, reason: 'EXPIRED' }
```

### Peer Validation Flow

```
1. Peer attempts to connect
2. Peer presents certificate (optional in migration mode)
3. PeerCertificateValidator validates certificate
4. If valid: peer added, reputation initialized
5. If invalid: peer rejected, reputation penalized
```

---

## Usage

### Automatic Validation

Certificate validation is **automatic** when crypto manager is provided:

```javascript
import { PeerManager, CryptoManager } from './shared/peer-discovery/index.js';

const crypto = new CryptoManager({ nodeId: 'node-1', nodeType: 'NS' });
const peerManager = new PeerManager({
  nodeId: 'node-1',
  crypto: crypto,              // Enable certificate validation
  requireMTLS: false,          // Migration mode (default)
  mtlsMigrationMode: true      // Allow non-mTLS peers
});

// Certificates are automatically validated in addPeer()
```

### Migration Mode (Default)

Allows both mTLS and non-mTLS connections:

```javascript
const peerManager = new PeerManager({
  crypto: crypto,
  requireMTLS: false,          // Don't require certificates
  mtlsMigrationMode: true      // Allow peers without certs
});

// Peer with certificate: Validated and accepted
// Peer without certificate: Accepted (migration mode)
```

### Enforcement Mode

Requires all peers to present valid certificates:

```javascript
const peerManager = new PeerManager({
  crypto: crypto,
  requireMTLS: true,           // Require certificates
  mtlsMigrationMode: false     // Reject peers without certs
});

// Peer with valid certificate: Accepted
// Peer without certificate: REJECTED
// Peer with invalid certificate: REJECTED
```

---

## Configuration

### Environment Variables

```bash
# Require mutual TLS (both peers must present certs)
P2P_REQUIRE_MTLS=false

# Migration mode (allow non-mTLS connections during transition)
P2P_MTLS_MIGRATION_MODE=true

# Certificate validity (days)
P2P_CERT_VALIDITY_DAYS=365
```

### Programmatic Configuration

```javascript
const peerManager = new PeerManager({
  crypto: new CryptoManager({ nodeId: 'node-1' }),
  requireMTLS: false,          // Default: false
  mtlsMigrationMode: true      // Default: true
});
```

---

## Migration Strategy

### Phase 1: Deploy with Migration Mode (Recommended)

```bash
P2P_REQUIRE_MTLS=false
P2P_MTLS_MIGRATION_MODE=true
```

**Behavior**:
- All nodes generate certificates
- Certificates shared but not required
- Both mTLS and non-mTLS connections allowed
- Gradual rollout without breaking existing connections

### Phase 2: Enforcement (After All Nodes Updated)

```bash
P2P_REQUIRE_MTLS=true
P2P_MTLS_MIGRATION_MODE=false
```

**Behavior**:
- All connections must use mTLS
- Non-mTLS connections rejected
- Full peer authentication enforced

---

## Testing

### Test Suite

```bash
cd c:/JS/ns/neuroswarm
node test-mtls.js
node test-cert-validator.js
```

**Expected Output**:
```
=== mTLS / Identity Certificate Test ===

Test 1: Generate identity certificates...
✓ Node 1 fingerprint: 2303e44aac58cd3b
✓ Node 2 fingerprint: 47ab75d30b4d7404

Test 2: Verify valid certificate...
✓ Verification result: VALID

Test 3: Detect tampered certificate...
✓ Tampered cert: INVALID
✓ Reason: INVALID_SIGNATURE

Test 4: Detect expired certificate...
✓ Expired cert: INVALID
✓ Reason: EXPIRED

=== All Tests Complete ===
✓ Identity certificates are working correctly!
```

---

## Security

### Threat Model

**Prevents**:
- ✅ Man-in-the-middle attacks
- ✅ Peer impersonation
- ✅ Unauthorized peer connections
- ✅ Certificate forgery

**Does NOT Prevent**:
- ❌ Network-level attacks (use HTTPS)
- ❌ DoS attacks (use rate limiting)
- ❌ Message tampering (use message signing)

### Attack Scenarios

**Scenario 1: Peer Impersonation**
```
Attacker tries to impersonate peer-123
→ Presents fake certificate
→ Signature verification fails
→ Connection rejected
→ Reputation penalty
```

**Scenario 2: Man-in-the-Middle**
```
Attacker intercepts connection
→ Cannot forge valid certificate
→ Signature mismatch detected
→ Connection rejected
```

**Scenario 3: Expired Certificate**
```
Peer presents expired certificate
→ Expiration check fails
→ Connection rejected
→ Peer must regenerate certificate
```

---

## API Reference

### CryptoManager

```javascript
import { CryptoManager } from './shared/peer-discovery/crypto.js';

const crypto = new CryptoManager({
  nodeId: 'node-1',
  nodeType: 'NS'
});
```

#### Methods

**`generateIdentityCertificate()`**
- Generates Ed25519 identity certificate
- Returns: `{ publicKey, privateKey, certificate, fingerprint }`

**`verifyPeerCertificate(peerCert)`**
- Verifies peer certificate
- Returns: `{ valid: boolean, reason?: string }`
- Reasons: `'MISSING_FIELDS'` | `'NOT_YET_VALID'` | `'EXPIRED'` | `'INVALID_SIGNATURE'`

**`getMTLSOptions()`**
- Returns TLS options for mTLS server
- Includes `requestCert: true`

---

### PeerCertificateValidator

```javascript
import { PeerCertificateValidator } from './shared/peer-discovery/peer-certificate-validator.js';

const validator = new PeerCertificateValidator(crypto, reputation, {
  requireMTLS: false,
  mtlsMigrationMode: true
});
```

#### Methods

**`validatePeerCertificate(peerId, peerInfo)`**
- Validates peer certificate during addPeer
- Returns: `{ valid: boolean, reason?: string, certificate?: object }`

**`getNodeIdentity(nodeId, nodeType)`**
- Returns node's identity certificate for sharing
- Returns: `{ certificate, certificateFingerprint }`

**`getStats()`**
- Returns validator statistics
- Returns: `{ requireMTLS, mtlsMigrationMode, hasIdentity, identityFingerprint }`

---

## Certificate Structure

```javascript
{
  version: 1,
  subject: {
    commonName: 'NS-node-1',
    nodeId: 'node-1',
    nodeType: 'NS'
  },
  publicKey: '-----BEGIN PUBLIC KEY-----...',
  notBefore: 1700527890123,      // Unix timestamp
  notAfter: 1732063890123,       // Unix timestamp (1 year)
  createdAt: 1700527890123,
  signature: 'base64-encoded-ed25519-signature'
}
```

---

## Performance

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Certificate Generation | ~10ms | One-time on startup |
| Certificate Verification | ~1ms | Per peer connection |
| Fingerprint Calculation | <0.1ms | SHA-256 hash |
| Total Overhead | ~11ms | Per new peer |

### Memory Usage

| Component | Memory | Notes |
|-----------|--------|-------|
| Certificate | ~1 KB | Per peer |
| Private Key | ~500 bytes | Per node |
| Fingerprint | 16 bytes | Per peer |

---

## Troubleshooting

### Issue: Certificate Validation Failed

**Symptoms**:
```
[PeerManager] Rejected peer peer-123 - certificate validation failed: INVALID_SIGNATURE
```

**Causes**:
1. Certificate tampered in transit
2. Certificate from different peer
3. Certificate corrupted

**Solution**: Peer must regenerate certificate

### Issue: Certificate Expired

**Symptoms**:
```
[CertValidator] Invalid certificate from peer-456: EXPIRED
```

**Cause**: Certificate older than 1 year

**Solution**: Automatic regeneration on next startup

### Issue: Missing Certificate

**Symptoms**:
```
[CertValidator] Peer peer-789 has no certificate (migration mode: allowed)
```

**Cause**: Peer running old version without mTLS

**Solution**: 
- In migration mode: Allowed (expected)
- In enforcement mode: Rejected (upgrade peer)

---

## Best Practices

### DO

- ✅ Use migration mode for gradual rollout
- ✅ Monitor certificate validation failures
- ✅ Regenerate certificates before expiration
- ✅ Track certificate fingerprints
- ✅ Enable reputation system

### DON'T

- ❌ Skip migration mode (breaks existing connections)
- ❌ Disable certificate validation in production
- ❌ Ignore validation failures
- ❌ Share private keys
- ❌ Manually edit certificates

---

## Integration with Security Stack

mTLS works with other security features:

1. **HTTPS** - Transport encryption
2. **Message Signing** - Message integrity
3. **Rate Limiting** - DoS protection
4. **Reputation System** - Peer trust
5. **mTLS** - Peer authentication ← You are here

**Order of Checks**:
```
1. HTTPS Handshake (transport encryption)
2. mTLS Certificate Validation (peer authentication)
3. Rate Limiting (DoS protection)
4. Message Signature Verification (message integrity)
5. Message Processing (business logic)
```

---

## Related Documentation

- [P2P Communication](../Communication/README.md) - Overall P2P system
- [Message Signing](../Message-Signing/README.md) - Cryptographic integrity
- [Rate Limiting](../Rate-Limiting/README.md) - DoS protection
- [Reputation System](../Reputation-System/README.md) - Peer reputation

---

## FAQ

**Q: Why Ed25519 instead of RSA?**
A: Ed25519 is faster, smaller keys, and more secure than RSA 2048.

**Q: Are certificates self-signed?**
A: Yes, no external CA required. Simpler for P2P networks.

**Q: What happens if a certificate expires?**
A: Peer must regenerate certificate on next startup.

**Q: Can I disable mTLS?**
A: Yes, don't provide `crypto` to PeerManager. Not recommended for production.

**Q: How do I enforce mTLS?**
A: Set `P2P_REQUIRE_MTLS=true` and `P2P_MTLS_MIGRATION_MODE=false`.

**Q: What's the difference between migration and enforcement mode?**
A: Migration allows non-mTLS peers, enforcement rejects them.

---

*Last updated: November 21, 2025*
*Version: 1.0 (Phase 4C Complete)*
*Status: Production Ready*
