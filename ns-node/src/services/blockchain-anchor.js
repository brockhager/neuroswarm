import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class BlockchainAnchorService {
    constructor(options = {}) {
        this.dataDir = options.dataDir || path.join(process.cwd(), 'data');
        this.chainFile = path.join(this.dataDir, 'governance-chain.json');

        // Ensure data directory exists
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        this.chain = this.loadChain();
    }

    loadChain() {
        try {
            if (fs.existsSync(this.chainFile)) {
                const data = fs.readFileSync(this.chainFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load blockchain:', e);
        }

        // Initialize with Genesis Block
        return [this.createGenesisBlock()];
    }

    saveChain() {
        try {
            fs.writeFileSync(this.chainFile, JSON.stringify(this.chain, null, 2));
        } catch (e) {
            console.error('Failed to save blockchain:', e);
        }
    }

    createGenesisBlock() {
        return {
            index: 0,
            timestamp: Date.now(),
            data: "Genesis Block - NeuroSwarm Governance",
            prevHash: "0",
            hash: this.calculateHash(0, "0", Date.now(), "Genesis Block - NeuroSwarm Governance")
        };
    }

    calculateHash(index, prevHash, timestamp, data) {
        return crypto
            .createHash('sha256')
            .update(index + prevHash + timestamp + JSON.stringify(data))
            .digest('hex');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(data) {
        const latestBlock = this.getLatestBlock();
        const index = latestBlock.index + 1;
        const timestamp = Date.now();
        const prevHash = latestBlock.hash;
        const hash = this.calculateHash(index, prevHash, timestamp, data);

        const newBlock = {
            index,
            timestamp,
            data,
            prevHash,
            hash
        };

        this.chain.push(newBlock);
        this.saveChain();

        return newBlock;
    }

    verifyChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i - 1];

            if (currentBlock.hash !== this.calculateHash(currentBlock.index, currentBlock.prevHash, currentBlock.timestamp, currentBlock.data)) {
                return false;
            }

            if (currentBlock.prevHash !== prevBlock.hash) {
                return false;
            }
        }
        return true;
    }

    getChain() {
        return this.chain;
    }
}

export default BlockchainAnchorService;
