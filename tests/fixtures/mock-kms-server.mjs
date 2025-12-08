// tests/fixtures/mock-kms-server.mjs
// Simulates a highly secure KMS/HSM service that only performs cryptographic
// operations and never exports private key material.

import http from 'http';
import { Buffer } from 'buffer';
import crypto from 'crypto';

function sha256(data) { return crypto.createHash('sha256').update(data).digest(); }
function deriveKeypairFromSeed(seed) {
    // Match shared/crypto-utils fallback: deterministic seed -> 32-byte hash
    const seedHash = sha256(Buffer.from(`KEYSEED:${seed}`));
    // For HMAC-based fallback we return same buffer as both private+public for verification
    return { privateKey: seedHash, publicKey: seedHash };
}

// Private key stored inside the mock KMS/HSM
const { privateKey: SIGNING_PRIVATE_KEY } = deriveKeypairFromSeed('VP-MAIN-ED25519-001');

function requestHandler(req, res) {
    if (req.url === '/api/v1/sign' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { keyId, hash } = JSON.parse(body);
                if (!keyId || !hash) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing keyId or hash.' }));
                }

                const hashBuffer = Buffer.from(hash, 'hex');

                // Use HMAC-SHA256 over the hash with the deterministic seed-derived key
                const hmac = crypto.createHmac('sha256', SIGNING_PRIVATE_KEY);
                hmac.update(hashBuffer);
                const signature = hmac.digest();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ signature: signature.toString('hex') }));
            } catch (error) {
                console.error('KMS Mock Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal KMS signing error.' }));
            }
        });
    } else if (req.url === '/api/v1/retrieve-key' && req.method === 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Private key retrieval forbidden.' }));
    } else {
        res.writeHead(404);
        res.end();
    }
}

let serverInstance = null;
const KMS_PORT = process.env.MOCK_KMS_PORT ? Number(process.env.MOCK_KMS_PORT) : 8123;

export function startKmsServer() {
    return new Promise((resolve) => {
        serverInstance = http.createServer(requestHandler);
        serverInstance.listen(KMS_PORT, '127.0.0.1', () => {
            console.log(`[MockKMS] Server running at http://127.0.0.1:${KMS_PORT}/`);
            resolve(serverInstance);
        });
    });
}

export function stopKmsServer() {
    return new Promise((resolve, reject) => {
        if (serverInstance) {
            serverInstance.close((err) => {
                if (err) return reject(err);
                console.log('[MockKMS] Server stopped.');
                resolve();
            });
        } else {
            resolve();
        }
    });
}
