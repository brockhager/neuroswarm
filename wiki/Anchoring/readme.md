# NeuroSwarm Governance Anchoring

## Overview

The **Governance Anchoring System** provides tamper-evident audit trails for NeuroSwarm by periodically anchoring governance events to the Solana blockchain. This creates an immutable, publicly-verifiable record of consensus decisions, security events, and network state changes.

---

## Architecture

### Core Components

1. **AnchorService** ([anchor-service.ts](file:///c:/JS/ns/admin-node/src/services/anchor-service.ts))
   - Computes snapshot hashes from governance timeline
   - Anchors snapshots to Solana blockchain
   - Manages verification status and transaction signatures
   - Provides observability endpoints for monitoring

2. **SecurityLogger** ([security-logger.js](file:///c:/JS/ns/neuroswarm/shared/peer-discovery/security-logger.js))
   - Logs security events to `governance-timeline.jsonl`
   - Triggers periodic anchoring via AnchorService
   - Tracks event types: `CONSENSUS_FINALITY`, `CONSENSUS_QUORUM`, `SLASHING_OFFENSE`, etc.

3. **Solana Integration**
   - Uses Solana Web3.js SDK
   - Stores snapshot hashes on-chain
   - Provides transaction signatures for verification

---

## Anchoring Flow

### 1. Event Logging
```
ConsensusManager → SecurityLogger → governance-timeline.jsonl
```

**Example Event:**
```json
{
  "timestamp": 1763743318956,
  "type": "SECURITY_EVENT",
  "eventType": "CONSENSUS_FINALITY",
  "peerId": "system",
  "details": {
    "blockHash": "0xabc123...",
    "blockHeight": 1234,
    "timestamp": 1763743318956
  },
  "severity": "HIGH"
}
```

### 2. Snapshot Creation
```javascript
// Compute snapshot hash from timeline
const snapshot = {
    timestamp: Date.now(),
    eventCount: events.length,
    hash: sha256(JSON.stringify(events)),
    events: events.slice(-10) // Last 10 events
};
```

### 3. Solana Anchoring
```javascript
// Anchor to Solana (simplified)
const transaction = await anchorService.anchorSnapshot(snapshot);
// Returns: { txSignature: '5J7x...', explorerUrl: 'https://...' }
```

### 4. Verification
```
Admin Dashboard → GET /v1/observability/governance-anchoring
→ Display latest anchor with verification status
```

---

## Configuration

### Environment Variables

```bash
# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet                    # devnet, testnet, mainnet-beta
ANCHOR_KEYPAIR_PATH=/path/to/keypair.json

# Anchoring Behavior
ANCHOR_INTERVAL=3600000                  # 1 hour (in milliseconds)
ANCHOR_ENABLED=true                      # Enable/disable anchoring
MOCK_ANCHORING=false                     # Use mock mode for testing

# Timeline Storage
GOVERNANCE_TIMELINE_FILE=./governance-timeline.jsonl
```

### Programmatic Configuration

```javascript
const anchorService = new AnchorService({
    solanaRpcUrl: 'https://api.devnet.solana.com',
    network: 'devnet',
    keypairPath: './keypair.json',
    anchorInterval: 3600000,  // 1 hour
    mockMode: false
});

const securityLogger = new SecurityLogger({
    enabled: true,
    dataDir: './data',
    timelineFile: './governance-timeline.jsonl',
    anchorService: anchorService,
    mockAnchoring: false
});
```

---

## Timeline Format

### governance-timeline.jsonl

Each line is a JSON object representing a governance event:

```jsonl
{"timestamp":1763743318950,"type":"SECURITY_EVENT","eventType":"CONSENSUS_QUORUM","peerId":"system","details":{"blockHash":"0xBLOCK_A","blockHeight":50,"support":0.75,"threshold":0.67},"severity":"MEDIUM"}
{"timestamp":1763743318956,"type":"SECURITY_EVENT","eventType":"CONSENSUS_FINALITY","peerId":"system","details":{"blockHash":"0xBLOCK_A","blockHeight":50,"timestamp":1763743318956},"severity":"HIGH"}
{"timestamp":1763743676570,"type":"SECURITY_EVENT","eventType":"SLASHING_OFFENSE","peerId":"peer-evil","details":{"reason":"DOUBLE_VOTE","height":50,"hash1":"0xBLOCK_A","hash2":"0xBLOCK_B"},"severity":"CRITICAL"}
```

### Event Types

| Event Type | Severity | Description |
|------------|----------|-------------|
| `CONSENSUS_QUORUM` | MEDIUM | Quorum reached for a block |
| `CONSENSUS_FINALITY` | HIGH | Block finalized |
| `SLASHING_OFFENSE` | CRITICAL | Validator slashed for malicious behavior |
| `PEER_BANNED` | HIGH | Peer banned due to low reputation |
| `RATE_LIMIT_EXCEEDED` | MEDIUM | Peer exceeded rate limits |
| `INVALID_MESSAGE` | LOW | Invalid message received |

---

## Snapshot Structure

### Snapshot Hash Computation

```javascript
function computeSnapshotHash(events) {
    const data = {
        timestamp: Date.now(),
        eventCount: events.length,
        events: events.map(e => ({
            timestamp: e.timestamp,
            type: e.type,
            eventType: e.eventType,
            peerId: e.peerId,
            severity: e.severity
        }))
    };
    return sha256(JSON.stringify(data));
}
```

### Snapshot Metadata

```javascript
{
    timestamp: 1763743318956,
    eventCount: 42,
    hash: "a3f2b9c1e4d5...",
    events: [...],  // Last 10 events
    txSignature: "5J7x...",  // Solana transaction signature
    explorerUrl: "https://explorer.solana.com/tx/5J7x...?cluster=devnet"
}
```

---

## Solana Integration

### Transaction Structure

**Anchor Program (Simplified):**
```rust
// Solana program stores snapshot hashes
pub struct GovernanceAnchor {
    pub timestamp: i64,
    pub snapshot_hash: [u8; 32],
    pub event_count: u64,
    pub authority: Pubkey,
}
```

**JavaScript Anchoring:**
```javascript
import { Connection, Keypair, Transaction } from '@solana/web3.js';

async function anchorToSolana(snapshotHash) {
    const connection = new Connection(SOLANA_RPC_URL);
    const keypair = Keypair.fromSecretKey(/* ... */);
    
    // Create transaction with snapshot hash
    const transaction = new Transaction().add(
        // Instruction to store snapshot hash
    );
    
    const signature = await connection.sendTransaction(transaction, [keypair]);
    await connection.confirmTransaction(signature);
    
    return {
        txSignature: signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    };
}
```

### Mock Mode

For testing without Solana:
```javascript
const anchorService = new AnchorService({
    mockMode: true  // Generates fake transaction signatures
});

// Returns mock signature
const result = await anchorService.anchorSnapshot(snapshot);
// { txSignature: 'MOCK_5J7x...', explorerUrl: 'https://...' }
```

---

## API Endpoints

### Get Governance Anchoring Status

**Endpoint:** `GET /v1/observability/governance-anchoring`

**Response:**
```json
{
  "latestAnchor": {
    "timestamp": 1763743318956,
    "txSignature": "5J7xKm2...",
    "verificationStatus": "verified",
    "fingerprints": [
      {
        "algorithm": "SHA-256",
        "hash": "a3f2b9c1e4d5..."
      }
    ],
    "explorerUrl": "https://explorer.solana.com/tx/5J7xKm2...?cluster=devnet"
  },
  "totalAnchors": 42,
  "lastAnchorTime": "2025-11-21T10:00:00Z"
}
```

### Set Transaction Signature

**Endpoint:** `POST /v1/admin/set-tx-signature`

**Request:**
```json
{
  "txSignature": "5J7xKm2...",
  "timestamp": 1763743318956
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction signature updated"
}
```

---

## Verification

### Manual Verification

1. **Get latest anchor:**
   ```bash
   curl http://localhost:3000/v1/observability/governance-anchoring
   ```

2. **Extract transaction signature:**
   ```json
   {
     "latestAnchor": {
       "txSignature": "5J7xKm2..."
     }
   }
   ```

3. **Verify on Solana Explorer:**
   ```
   https://explorer.solana.com/tx/5J7xKm2...?cluster=devnet
   ```

4. **Compare snapshot hash:**
   - Compute local hash from `governance-timeline.jsonl`
   - Compare with on-chain hash from Solana transaction

### Automated Verification

```javascript
async function verifyAnchor(txSignature, expectedHash) {
    const connection = new Connection(SOLANA_RPC_URL);
    const tx = await connection.getTransaction(txSignature);
    
    // Extract snapshot hash from transaction
    const onChainHash = extractHashFromTransaction(tx);
    
    // Compare hashes
    if (onChainHash === expectedHash) {
        return { verified: true, message: 'Anchor verified' };
    } else {
        return { verified: false, message: 'Hash mismatch' };
    }
}
```

---

## Admin Dashboard Integration

### Latest Anchor Modal

The Admin Dashboard displays the latest anchor with:
- Transaction signature (with copy button)
- Verification status badge
- Explorer link
- Fingerprint (SHA-256 hash)
- Timestamp

**UI Features:**
- Copy transaction signature to clipboard
- Mark anchor as verified
- View on Solana Explorer
- Real-time status updates

**Screenshot:**
```
┌─────────────────────────────────────┐
│ Latest Governance Anchor            │
├─────────────────────────────────────┤
│ Tx: 5J7xKm2... [Copy] [Explorer]   │
│ Status: ✅ Verified                 │
│ Hash: a3f2b9c1e4d5...               │
│ Time: 2025-11-21 10:00:00           │
└─────────────────────────────────────┘
```

---

## Security Considerations

### Tamper Evidence

**Immutability:**
- Solana blockchain provides immutable storage
- Transaction signatures cannot be forged
- Snapshot hashes are cryptographically secure (SHA-256)

**Verification:**
- Anyone can verify anchors via Solana Explorer
- Timeline integrity can be checked by recomputing hashes
- Public auditability ensures transparency

### Attack Resistance

**Timeline Tampering:**
- Modifying `governance-timeline.jsonl` changes the snapshot hash
- Mismatch detected during verification
- Anchored hash on Solana serves as ground truth

**Replay Attacks:**
- Each anchor includes timestamp
- Duplicate anchors are detectable
- Monotonic timestamp ordering enforced

---

## Performance

### Anchoring Frequency

**Recommended Intervals:**
- **Development:** Every 5 minutes (for testing)
- **Staging:** Every 30 minutes
- **Production:** Every 1-6 hours

**Cost Considerations:**
- Solana transaction fee: ~0.000005 SOL (~$0.0005)
- Daily cost (1-hour interval): ~$0.012
- Monthly cost: ~$0.36

### Timeline Size

**Growth Rate:**
- ~1 KB per event
- ~100 events/day → 100 KB/day
- ~3 MB/month

**Pruning Strategy:**
- Keep last 10,000 events in memory
- Archive old events to separate files
- Anchor snapshots reference event ranges

---

## Monitoring

### Metrics

```
# Total anchors created
governance_anchors_total{} 42

# Last anchor timestamp
governance_last_anchor_time{} 1763743318956

# Anchor success rate
governance_anchor_success_rate{} 0.98
```

### Alerts

**Critical:**
- Anchoring failed for >24 hours
- Verification status shows "unverified" for >1 week

**Warning:**
- Anchoring interval exceeded by 2x
- Timeline file size >100 MB

---

## Troubleshooting

### Common Issues

**Anchoring fails:**
- Check Solana RPC URL connectivity
- Verify keypair has sufficient SOL balance
- Check network (devnet/testnet/mainnet-beta)

**Verification fails:**
- Ensure transaction signature is correct
- Check Solana Explorer for transaction status
- Verify snapshot hash computation

**Timeline corruption:**
- Backup `governance-timeline.jsonl` regularly
- Use append-only writes
- Validate JSON format on each write

---

## Testing

### Test Suite

```bash
# Test anchoring
node test-anchor.js

# Test consensus logging
node test-consensus-logging.js
```

### Mock Mode Testing

```javascript
const anchorService = new AnchorService({ mockMode: true });
const result = await anchorService.anchorSnapshot(snapshot);
console.log(result.txSignature); // MOCK_5J7x...
```

---

## Next Steps

- **Phase 10:** Automated verification cron job
- **Future:** Multi-chain anchoring (Ethereum, Arweave)
- **Future:** Zero-knowledge proofs for privacy-preserving anchoring

---

## References

- [AnchorService Source](file:///c:/JS/ns/admin-node/src/services/anchor-service.ts)
- [SecurityLogger Source](file:///c:/JS/ns/neuroswarm/shared/peer-discovery/security-logger.js)
- [Solana Documentation](https://docs.solana.com/)
- [Consensus System](../Consensus/readme.md)
- [Admin Dashboard](../../admin-node/README.md)
