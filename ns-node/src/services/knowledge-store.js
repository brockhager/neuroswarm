import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { FsBlockstore } from 'blockstore-fs';
import FsDatastore from 'datastore-fs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const IPFS_REPO_DIR = path.join(DATA_DIR, 'ipfs-repo');
const KNOWLEDGE_INDEX_FILE = path.join(DATA_DIR, 'knowledge-index.json');

// Helia node instance
let heliaNode = null;
let heliaFs = null;

/**
 * Initialize Helia IPFS node
 */
async function getHeliaNode() {
    if (heliaNode) return { helia: heliaNode, fs: heliaFs };

    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(IPFS_REPO_DIR)) fs.mkdirSync(IPFS_REPO_DIR, { recursive: true });

        const blockstore = new FsBlockstore(path.join(IPFS_REPO_DIR, 'blocks'));
        const datastore = new FsDatastore(path.join(IPFS_REPO_DIR, 'data'));

        heliaNode = await createHelia({ blockstore, datastore });
        heliaFs = unixfs(heliaNode);

        console.log(`Helia IPFS node started. Peer ID: ${heliaNode.libp2p.peerId.toString()}`);
        return { helia: heliaNode, fs: heliaFs };
    } catch (e) {
        console.error('Failed to start Helia node:', e.message);
        return null;
    }
}

function normalizeQuestion(question) {
    return question.toLowerCase().replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
}

function extractKeywords(question) {
    const stopWords = new Set(['what', 'is', 'the', 'a', 'an', 'are', 'was', 'were', 'when', 'where', 'who', 'how', 'why', 'which', 'can', 'could', 'would', 'should', 'do', 'does', 'did', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']);
    const normalized = normalizeQuestion(question);
    const words = normalized.split(' ').filter(word => word.length > 2 && !stopWords.has(word));
    return [...new Set(words)];
}

function categorizeQuestion(question) {
    const categories = [];
    const lower = question.toLowerCase();
    if (/\b(capital|country|city|continent|ocean|mountain|river)\b/i.test(lower)) categories.push('geography');
    if (/\b(when|independence|war|battle|founded|discovered|invented)\b/i.test(lower)) categories.push('history');
    if (/\b(element|atom|molecule|chemical|physics|biology|formula)\b/i.test(lower)) categories.push('science');
    if (/\b(calculate|equation|formula|theorem|proof)\b/i.test(lower) || /[\d+\-*/()]+/.test(lower)) categories.push('mathematics');
    if (categories.length === 0) categories.push('general');
    return categories;
}

function calculateExpiry(question) {
    const now = new Date();
    if (/\b(news|latest|today|current|now)\b/i.test(question)) return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    if (/\b(price|score|weather)\b/i.test(question)) return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function loadIndex() {
    try {
        if (fs.existsSync(KNOWLEDGE_INDEX_FILE)) return JSON.parse(fs.readFileSync(KNOWLEDGE_INDEX_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to load knowledge index:', e.message);
    }
    return {};
}

function saveIndex(index) {
    try {
        fs.writeFileSync(KNOWLEDGE_INDEX_FILE, JSON.stringify(index, null, 2));
    } catch (e) {
        console.error('Failed to save knowledge index:', e.message);
    }
}

export async function storeKnowledge(params) {
    const { question, answer, source, confidence = 0.8, nodeId = 'unknown' } = params;
    if (confidence < 0.8) return null;
    const deterministicAdapters = ['math-calculator', 'nba-scores'];
    if (deterministicAdapters.includes(source)) return null;

    const node = await getHeliaNode();
    if (!node) return null;

    try {
        const normalizedQuestion = normalizeQuestion(question);
        const keywords = extractKeywords(question);
        const categories = categorizeQuestion(question);

        const knowledge = {
            question,
            normalizedQuestion,
            answer,
            source,
            confidence,
            timestamp: new Date().toISOString(),
            verifiedBy: [nodeId],
            upvotes: 0,
            downvotes: 0,
            expiresAt: calculateExpiry(question),
            keywords,
            categories
        };

        const content = new TextEncoder().encode(JSON.stringify(knowledge));
        const cid = await node.fs.addBytes(content);
        const cidString = cid.toString();

        console.log(`Stored knowledge to IPFS (Helia): ${cidString}`);

        const index = loadIndex();
        const questionHash = crypto.createHash('sha256').update(normalizedQuestion).digest('hex').substring(0, 16);
        index[questionHash] = {
            question: normalizedQuestion,
            cid: cidString,
            timestamp: knowledge.timestamp,
            expiresAt: knowledge.expiresAt,
            keywords,
            categories
        };
        saveIndex(index);

        return cidString;
    } catch (e) {
        console.error('Failed to store knowledge to IPFS:', e.message);
        return null;
    }
}

export async function queryKnowledge(question) {
    const normalizedQuestion = normalizeQuestion(question);
    const questionHash = crypto.createHash('sha256').update(normalizedQuestion).digest('hex').substring(0, 16);
    const queryKeywords = extractKeywords(question);

    const index = loadIndex();
    let entry = index[questionHash];

    // If exact match not found, try keyword matching
    if (!entry && queryKeywords.length > 0) {
        const entries = Object.entries(index);
        for (const [hash, indexEntry] of entries) {
            if (indexEntry.keywords) {
                const matchCount = queryKeywords.filter(kw => indexEntry.keywords.includes(kw)).length;
                if (matchCount >= Math.min(2, queryKeywords.length)) {
                    entry = indexEntry;
                    console.log(`Found via keyword match: ${matchCount}/${queryKeywords.length} keywords`);
                    break;
                }
            }
        }
    }

    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
        delete index[questionHash];
        saveIndex(index);
        return null;
    }

    const node = await getHeliaNode();
    if (!node) return null;

    try {
        const { CID } = await import('multiformats/cid');
        const cid = CID.parse(entry.cid);
        const chunks = [];
        for await (const chunk of node.fs.cat(cid)) chunks.push(chunk);
        const data = Buffer.concat(chunks).toString('utf8');
        const knowledge = JSON.parse(data);
        console.log(`Retrieved knowledge from IPFS (Helia): ${entry.cid}`);
        return knowledge;
    } catch (e) {
        console.error('Failed to retrieve knowledge from IPFS:', e.message);
        return null;
    }
}

export async function checkIPFSStatus() {
    const node = await getHeliaNode();
    if (!node) return { ok: false, message: 'Helia node failed to start' };
    try {
        const peerId = node.helia.libp2p.peerId.toString();
        return { ok: true, message: `Helia running. Peer ID: ${peerId}` };
    } catch (e) {
        return { ok: false, message: `Helia error: ${e.message}` };
    }
}
