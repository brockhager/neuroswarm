// src/services/knowledge-store.js
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { FsBlockstore } from 'blockstore-fs';
import { FsDatastore } from 'datastore-fs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Conditional embed import
let embed = null;
try {
    const embeddingModule = await import('./embedding.js');
    embed = embeddingModule.embed;
} catch (e) {
    console.warn('Embedding service unavailable:', e.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const IPFS_REPO_DIR = path.join(DATA_DIR, 'ipfs-repo');
const KNOWLEDGE_INDEX_FILE = path.join(DATA_DIR, 'knowledge-index.json');

let heliaNode = null;
let heliaFs = null;

/** Initialize Helia IPFS node */
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
    console.warn('Helia IPFS node disabled:', e.message);
    console.warn('Knowledge storage will use local file system only.');
    return null;
  }
}

function normalizeQuestion(q) {
  return q.toLowerCase().replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
}

function extractKeywords(q) {
  const stop = new Set(['what','is','the','a','an','are','was','were','when','where','who','how','why','which','can','could','would','should','do','does','did','of','in','on','at','to','for','with','by']);
  const norm = normalizeQuestion(q);
  return [...new Set(norm.split(' ').filter(w=>w.length>2 && !stop.has(w)))];
}

function categorizeQuestion(q) {
  const cat=[]; const l=q.toLowerCase();
  if (/\b(capital|country|city|continent|ocean|mountain|river)\b/.test(l)) cat.push('geography');
  if (/\b(when|independence|war|battle|founded|discovered|invented)\b/.test(l)) cat.push('history');
  if (/\b(element|atom|molecule|chemical|physics|biology|formula)\b/.test(l)) cat.push('science');
  if (/\b(calculate|equation|formula|theorem|proof)\b/.test(l) || /[\d+\-*/()]+/.test(l)) cat.push('mathematics');
  if (cat.length===0) cat.push('general');
  return cat;
}

function calculateExpiry(q) {
  const now = new Date();
  if (/\b(news|latest|today|current|now)\b/.test(q)) return new Date(now.getTime()+24*60*60*1000).toISOString();
  if (/\b(price|score|weather)\b/.test(q)) return new Date(now.getTime()+60*60*1000).toISOString();
  return new Date(now.getTime()+30*24*60*60*1000).toISOString();
}

export function loadIndex() {
  try {
    if (fs.existsSync(KNOWLEDGE_INDEX_FILE)) return JSON.parse(fs.readFileSync(KNOWLEDGE_INDEX_FILE,'utf8'));
  } catch(e) { console.error('Failed to load knowledge index:', e.message); }
  return {};
}

function saveIndex(idx) {
  try { fs.writeFileSync(KNOWLEDGE_INDEX_FILE, JSON.stringify(idx, null, 2)); }
  catch(e) { console.error('Failed to save knowledge index:', e.message); }
}

export async function storeKnowledge(params) {
  const { question, answer, source, confidence = 0.8, confidenceBreakdown = {}, nodeId='unknown', timestamp = new Date().toISOString() } = params;
  if (confidence < 0.8) return null;
  const deterministic = ['math-calculator','nba-scores'];
  if (deterministic.includes(source)) return null;
  const node = await getHeliaNode();
  if (!node) return null;
  try {
    const normQ = normalizeQuestion(question);
    const keywords = extractKeywords(question);
    const categories = categorizeQuestion(question);
    const embedding = embed ? await embed(answer) : null;
    const knowledge = { question, normalizedQuestion: normQ, answer, source, categories, confidence, confidenceBreakdown, embedding, timestamp, expiresAt: calculateExpiry(question) };
    const content = new TextEncoder().encode(JSON.stringify(knowledge));
    const cid = await node.fs.addBytes(content);
    const cidStr = cid.toString();
    console.log(`Stored knowledge to IPFS(Helia): ${ cidStr } `);
    const index = loadIndex();
    const hash = crypto.createHash('sha256').update(normQ).digest('hex').substring(0,16);
    index[hash] = { question: normQ, answer, cid: cidStr, timestamp, expiresAt: knowledge.expiresAt, keywords, categories, confidence, confidenceBreakdown, embedding };
    saveIndex(index);
    return cidStr;
  } catch(e) {
    console.error('Failed to store knowledge to IPFS:', e.message);
    return null;
  }
}

export async function queryKnowledge(question) {
  const normQ = normalizeQuestion(question);
  const hash = crypto.createHash('sha256').update(normQ).digest('hex').substring(0,16);
  const index = loadIndex();
  let entry = index[hash];
  // keyword fallback
  if (!entry) {
    const qKeywords = extractKeywords(question);
    for (const e of Object.values(index)) {
      if (e.keywords) {
        const match = qKeywords.filter(k=>e.keywords.includes(k)).length;
        if (match >= Math.min(2, qKeywords.length)) { entry = e; break; }
      }
    }
  }
  if (!entry) return null;
  if (new Date(entry.expiresAt) < new Date()) { delete index[hash]; saveIndex(index); return null; }
  const node = await getHeliaNode();
  if (!node) return null;
  try {
    const { CID } = await import('multiformats/cid');
    const cid = CID.parse(entry.cid);
    const chunks=[]; for await (const c of node.fs.cat(cid)) chunks.push(c);
    const data = Buffer.concat(chunks).toString('utf8');
    const knowledge = JSON.parse(data);
    console.log(`Retrieved knowledge from IPFS(Helia): ${ entry.cid } `);
    return knowledge;
  } catch(e) {
    console.error('Failed to retrieve knowledge from IPFS:', e.message);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function semanticQueryKnowledge(question, threshold = 0.8) {
  if (!embed) return null;
  const index = loadIndex();
  const queryEmbedding = await embed(question);
  let bestMatch = null;
  let bestSimilarity = 0;
  for (const [hash, entry] of Object.entries(index)) {
    if (entry.embedding && Array.isArray(entry.embedding)) {
      const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = { ...entry, similarity, hash };
      }
    }
  }
  if (!bestMatch) return null;
  if (new Date(bestMatch.expiresAt) < new Date()) {
    delete index[bestMatch.hash];
    saveIndex(index);
    return null;
  }
  const node = await getHeliaNode();
  if (!node) return null;
  try {
    const { CID } = await import('multiformats/cid');
    const cid = CID.parse(bestMatch.cid);
    const chunks = [];
    for await (const c of node.fs.cat(cid)) chunks.push(c);
    const data = Buffer.concat(chunks).toString('utf8');
    const knowledge = JSON.parse(data);
    console.log(`Semantic cache hit: similarity ${bestSimilarity.toFixed(3)} for "${question}"`);
    return { ...knowledge, similarity: bestSimilarity };
  } catch (e) {
    console.error('Failed to retrieve knowledge from IPFS:', e.message);
    return null;
  }
}
