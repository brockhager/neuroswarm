/**
 * Anchor Service - Anchors security snapshots to Solana
 * Provides tamper-evident audit trail for governance events
 */

import { Connection, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';
import fs from 'fs';

export class AnchorService {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.rpcUrl = options.rpcUrl || 'https://api.devnet.solana.com';
        this.connection = new Connection(this.rpcUrl, 'confirmed');
        this.mockMode = options.mockMode !== false; // Default to mock for now to avoid wallet issues

        this.logFile = options.logFile || './data/governance-timeline.jsonl';
        this.lastAnchorHash = null;
        this.lastAnchorTime = 0;

        // Load or generate wallet
        if (options.walletPath && fs.existsSync(options.walletPath)) {
            try {
                const secretKey = JSON.parse(fs.readFileSync(options.walletPath, 'utf8'));
                this.wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));
                this.mockMode = false; // If wallet provided, try real network
            } catch (err) {
                console.error('[AnchorService] Failed to load wallet:', err.message);
                this.wallet = Keypair.generate();
                this.mockMode = true;
            }
        } else {
            this.wallet = Keypair.generate();
            if (!options.mockMode) {
                console.log('[AnchorService] No wallet provided, using generated keypair (needs funding)');
            }
        }

        console.log(`[AnchorService] Initialized (Mock: ${this.mockMode}, Wallet: ${this.wallet.publicKey.toBase58()})`);
    }

    /**
     * Calculate SHA-256 hash of the log file
     */
    calculateLogHash() {
        if (!fs.existsSync(this.logFile)) {
            return null;
        }

        try {
            const fileBuffer = fs.readFileSync(this.logFile);
            const hashSum = crypto.createHash('sha256');
            hashSum.update(fileBuffer);
            return hashSum.digest('hex');
        } catch (err) {
            console.error('[AnchorService] Error hashing log file:', err.message);
            return null;
        }
    }

    /**
     * Anchor the current state to Solana
     */
    async anchorSnapshot() {
        if (!this.enabled) return { success: false, reason: 'DISABLED' };

        const hash = this.calculateLogHash();
        if (!hash) {
            return { success: false, reason: 'NO_LOG_FILE' };
        }

        // Don't re-anchor if hash hasn't changed
        if (hash === this.lastAnchorHash) {
            return { success: true, skipped: true, reason: 'HASH_UNCHANGED' };
        }

        const timestamp = Date.now();
        const memo = `NS-ANCHOR:${hash}:${timestamp}`;

        console.log(`[AnchorService] Attempting to anchor hash: ${hash}`);

        if (this.mockMode) {
            // Simulate Solana transaction
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.lastAnchorHash = hash;
            this.lastAnchorTime = timestamp;

            const mockSig = 'mock_tx_' + crypto.randomBytes(16).toString('hex');
            console.log(`[AnchorService] ⚓ Mock Anchor Success! Sig: ${mockSig}`);

            return {
                success: true,
                signature: mockSig,
                hash,
                timestamp,
                mock: true
            };
        }

        try {
            // Create transaction with Memo
            // We send 0 SOL to self, just to attach the memo
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.wallet.publicKey,
                    toPubkey: this.wallet.publicKey,
                    lamports: 0,
                })
            );

            // Add memo (Solana Memo Program v2)
            // Note: In a real implementation we'd use the Memo Program instruction
            // For simplicity here, we'll just rely on the fact that we *would* add it.
            // But wait, SystemProgram transfer doesn't take a memo.
            // We need to add a memo instruction.
            // Memo Program ID: MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb

            transaction.add({
                keys: [{ pubkey: this.wallet.publicKey, isSigner: true, isWritable: true }],
                programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb"),
                data: Buffer.from(memo, 'utf-8')
            });

            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.wallet]
            );

            this.lastAnchorHash = hash;
            this.lastAnchorTime = timestamp;

            console.log(`[AnchorService] ⚓ Anchor Success! Sig: ${signature}`);

            return {
                success: true,
                signature,
                hash,
                timestamp
            };

        } catch (err) {
            console.error('[AnchorService] Anchor failed:', err.message);
            return { success: false, reason: err.message };
        }
    }

    /**
     * Verify an anchor against the local file
     * @param {string} expectedHash - The hash from the blockchain
     */
    verifyAnchor(expectedHash) {
        const currentHash = this.calculateLogHash();
        return currentHash === expectedHash;
    }
}
