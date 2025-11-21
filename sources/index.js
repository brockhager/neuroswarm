import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';

// Simple registry loader for sources/adapters registered in sources.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.join(__dirname, 'sources.json');
let registry = null;

export function loadRegistry() {
  if (registry) return registry;
  const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
  registry = JSON.parse(content);
  return registry;
}

export function listAdapters() {
  const reg = loadRegistry();
  return reg.adapters || [];
}

// A simple in-memory cache for adapter responses keyed by adapter+params
const sourceCache = new Map();
const CACHE_TTL_MS = Number(process.env.GATEWAY_SOURCES_CACHE_TTL_MS || 60000);

function cacheKey(adapterName, params) {
  return adapterName + '::' + JSON.stringify(params || {});
}

function getCache(adapterName, params) {
  const k = cacheKey(adapterName, params);
  const v = sourceCache.get(k);
  if (!v) return null;
  if (v.expires && v.expires < Date.now()) { sourceCache.delete(k); return null; }
  return v.value;
}

function setCache(adapterName, params, value) {
  const k = cacheKey(adapterName, params);
  sourceCache.set(k, { value, expires: Date.now() + CACHE_TTL_MS });
}

export function computeSourcesRoot(txs) {
  // Move computeSourcesRoot here so VP & NS import a single implementation
  const srcLeaves = (txs || []).map(tx => {
    try {
      const sources = tx.sources || [];
      const normalized = sources.map(s => ({ source: s.adapter || s.source, value: (s.result && s.result.value) || null, verifiedAt: (s.result && s.result.verifiedAt) || s.verifiedAt || null }));
      // ensure deterministic ordering by source name
      normalized.sort((a, b) => (a.source || '').localeCompare(b.source || ''));
      const raw = normalized.map(n => JSON.stringify(n)).join('|');
      const h = sha256Hex(Buffer.from(raw));
      return Buffer.from(h, 'hex');
    } catch (e) {
      return Buffer.from(sha256Hex(Buffer.from('')), 'hex');
    }
  });
  if (srcLeaves.length === 0) return sha256Hex('');
  let layer = srcLeaves;
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

export async function queryAdapter(adapterName, params) {
  const adapters = listAdapters();
  const entry = adapters.find(a => a.name === adapterName);
  if (!entry) throw new Error(`adapter-not-found:${adapterName}`);
  const modulePath = path.join(__dirname, 'adapters', entry.module);
  const moduleUrl = pathToFileURL(modulePath).href;
  const mod = await import(moduleUrl);
  if (!mod || !mod.query) throw new Error(`adapter-missing-query:${adapterName}`);
  return mod.query(params);
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function queryAdapterWithOpts(adapterName, params, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs || process.env.GATEWAY_SOURCES_QUERY_TIMEOUT_MS || 2000);
  const useCache = opts.useCache !== undefined ? opts.useCache : true;
  if (useCache) {
    const cached = getCache(adapterName, params);
    if (cached) return cached;
  }
  const adapters = listAdapters();
  const entry = adapters.find(a => a.name === adapterName);
  if (!entry) throw new Error(`adapter-not-found:${adapterName}`);
  const modulePath = path.join(__dirname, 'adapters', entry.module);
  const moduleUrl = pathToFileURL(modulePath).href;
  const mod = await import(moduleUrl);
  if (!mod || !mod.query) throw new Error(`adapter-missing-query:${adapterName}`);
  const p = mod.query(params || {});
  let timedOut = false;
  const timeout = new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('adapter_query_timeout')); }, timeoutMs));
  const result = await Promise.race([p, timeout]);
  if (useCache) setCache(adapterName, params, result);
  return result;
}

export async function listStatuses() {
  const adapters = listAdapters();
  const out = [];
  for (const a of adapters) {
    try {
      const modulePath = path.join(__dirname, 'adapters', a.module);
      const moduleUrl = pathToFileURL(modulePath).href;
      const mod = await import(moduleUrl);
      if (mod && mod.status) {
        const s = await mod.status();
        out.push({ name: a.name, ok: s.ok, message: s.message, origin: a.origin || 'unknown' });
      } else {
        out.push({ name: a.name, ok: false, message: 'no-status-export', origin: a.origin || 'unknown' });
      }
    } catch (e) {
      out.push({ name: a.name, ok: false, message: e.message, origin: a.origin || 'unknown' });
    }
  }
  return out;
}
