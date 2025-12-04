import crypto from 'crypto';
import { logNs } from './logger.js';

export function sha256Hex(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

export function canonicalize(obj) {
    if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
    // Exclude properties whose value is `undefined` so callers can pass
    // `{ ...obj, signature: undefined }` safely without inserting the key.
    const keys = Object.keys(obj).filter(k => typeof obj[k] !== 'undefined').sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

export function txIdFor(tx) {
    const copy = { ...tx };
    delete copy.signature;
    return sha256Hex(Buffer.from(canonicalize(copy), 'utf8'));
}

export function verifyEd25519(publicKeyPem, data, sigBase64) {
    try {
        const pubKey = crypto.createPublicKey(publicKeyPem);
        const sig = Buffer.from(sigBase64, 'base64');
        return crypto.verify(null, Buffer.from(data, 'utf8'), pubKey, sig);
    } catch (e) {
        logNs('ERROR', 'ed25519 verify error', e.message);
        return false;
    }
}

export function computeMerkleRoot(txIds) {
    if (!txIds || txIds.length === 0) return sha256Hex('');
    let layer = txIds.map(id => Buffer.from(id, 'hex'));
    while (layer.length > 1) {
        if (layer.length % 2 === 1) layer.push(layer[layer.length - 1]);
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const a = layer[i];
            const b = layer[i + 1];
            const hash = sha256Hex(Buffer.concat([a, b]));
            next.push(Buffer.from(hash, 'hex'));
        }
        layer = next;
    }
    return layer[0].toString('hex');
}
