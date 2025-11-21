# NeuroSwarm Solana Integration

## Overview

NeuroSwarm uses **Solana** for governance anchoring, providing immutable audit trails for consensus events on a high-performance blockchain.

**Key Benefits:**
- 65,000+ TPS throughput
- ~400ms block time
- ~$0.00025 per transaction
- Cryptographic proof of history

---

## Quick Start

### 1. Install Solana CLI

**Windows:**
```powershell
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
$env:PATH += ";C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin"
```

**Linux/Mac:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### 2. Create Keypair

```bash
solana-keygen new --outfile ~/neuroswarm-keypair.json
solana-keygen pubkey ~/neuroswarm-keypair.json
```

### 3. Configure Network

```bash
# Devnet for development
solana config set --url https://api.devnet.solana.com

# Fund keypair (devnet only)
solana airdrop 2
```

---

## Configuration

### Environment Variables

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
ANCHOR_KEYPAIR_PATH=./neuroswarm-keypair.json
ANCHOR_INTERVAL=3600000
ANCHOR_ENABLED=true
```

---

## Networks

| Network | RPC URL | Explorer | Use Case |
|---------|---------|----------|----------|
| Devnet | `https://api.devnet.solana.com` | [explorer](https://explorer.solana.com/?cluster=devnet) | Development |
| Testnet | `https://api.testnet.solana.com` | [explorer](https://explorer.solana.com/?cluster=testnet) | Staging |
| Mainnet | `https://api.mainnet-beta.solana.com` | [explorer](https://explorer.solana.com/) | Production |

---

## Governance Anchoring

### How It Works

```
SecurityLogger → governance-timeline.jsonl
    ↓
AnchorService → Compute SHA-256 hash
    ↓
Solana Transaction → Store hash on-chain
    ↓
Return tx signature for verification
```

### Code Example

```javascript
import { Connection, Keypair, Transaction } from '@solana/web3.js';

async function anchorSnapshot(snapshotHash) {
    const connection = new Connection('https://api.devnet.solana.com');
    const keypair = Keypair.fromSecretKey(/* ... */);
    
    // Create memo instruction with hash
    const memoInstruction = {
        keys: [],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(`NeuroSwarm: ${snapshotHash}`)
    };
    
    const transaction = new Transaction().add(memoInstruction);
    const signature = await connection.sendTransaction(transaction, [keypair]);
    
    return {
        txSignature: signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    };
}
```

### Verification

```javascript
async function verifyAnchor(txSignature) {
    const connection = new Connection('https://api.devnet.solana.com');
    const tx = await connection.getTransaction(txSignature);
    
    // Extract memo data
    const memo = Buffer.from(tx.transaction.message.instructions[0].data).toString();
    const hash = memo.split(': ')[1];
    
    return { verified: true, hash, timestamp: tx.blockTime };
}
```

---

## Transaction Costs

**Fee Structure:**
- Base: 5,000 lamports (~$0.00025)
- Daily (1-hour interval): ~$0.006
- Monthly: ~$0.18
- Yearly: ~$2.16

**Cost Optimization:**
- Batch multiple snapshots
- Adjust anchoring frequency
- Use memo program (most efficient)

---

## Solana Web3.js SDK

### Installation

```bash
npm install @solana/web3.js
```

### Basic Usage

```javascript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

// Connect
const connection = new Connection('https://api.devnet.solana.com');

// Load keypair
const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

// Get balance
const balance = await connection.getBalance(keypair.publicKey);
console.log(`Balance: ${balance / 1e9} SOL`);
```

---

## Security

### Keypair Management

```bash
# Secure storage
chmod 600 ~/neuroswarm-keypair.json

# Use environment variable
export ANCHOR_KEYPAIR_PATH=~/neuroswarm-keypair.json
```

**Best Practices:**
- Never commit keypairs to git
- Use hardware wallets for mainnet
- Encrypt keypairs at rest
- Rotate keys periodically

### Transaction Security

- Recent blockhash expires in ~2 minutes (replay protection)
- Verify transaction finality before proceeding
- Use signature verification for all payloads

---

## Monitoring

### RPC Health Check

```javascript
async function checkRpcHealth() {
    const connection = new Connection(SOLANA_RPC_URL);
    const version = await connection.getVersion();
    const slot = await connection.getSlot();
    
    console.log(`Solana: ${version['solana-core']}, Slot: ${slot}`);
    return { healthy: true };
}
```

### Transaction Monitoring

```javascript
async function monitorTransaction(signature) {
    const connection = new Connection(SOLANA_RPC_URL);
    const confirmation = await connection.confirmTransaction(signature);
    
    if (confirmation.value.err) {
        return { success: false, error: confirmation.value.err };
    }
    return { success: true, signature };
}
```

---

## Troubleshooting

### Common Issues

**RPC Connection Failed (429):**
- Use rate-limited RPC or dedicated provider
- Consider QuickNode, Alchemy, or Helius

**Insufficient Balance:**
- Fund keypair with SOL
- Devnet: `solana airdrop 2`
- Mainnet: Purchase SOL

**Transaction Timeout:**
- Increase confirmation timeout
- Check network congestion: `solana ping`

### Debug Commands

```bash
# Check transaction
solana confirm <SIGNATURE>

# View history
solana transaction-history <ADDRESS>

# Network performance
solana ping

# Block production
solana block-production
```

---

## Migration to Mainnet

### Checklist

- [ ] Test thoroughly on devnet
- [ ] Secure keypair storage
- [ ] Fund mainnet keypair
- [ ] Update RPC URL to mainnet-beta
- [ ] Monitor transaction costs
- [ ] Set up alerting
- [ ] Document rollback procedures

### Configuration

```bash
# Update .env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# Verify
solana config get
```

---

## Resources

**Documentation:**
- [Solana Docs](https://docs.solana.com/)
- [Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Framework](https://www.anchor-lang.com/)

**Tools:**
- [Explorer](https://explorer.solana.com/)
- [Solana Beach](https://solanabeach.io/)
- [Solscan](https://solscan.io/)

**Community:**
- [Discord](https://discord.gg/solana)
- [Stack Exchange](https://solana.stackexchange.com/)
- [GitHub](https://github.com/solana-labs/solana)

---

## Next Steps

- **Current:** Governance anchoring on devnet
- **Future:** $NEURO SPL token
- **Future:** Validator staking program
- **Future:** Dispute resolution contracts

---

## Related Documentation

- [Anchoring System](../Anchoring/readme.md)
- [Consensus System](../Consensus/readme.md)
- [AnchorService Source](file:///c:/JS/ns/admin-node/src/services/anchor-service.ts)
