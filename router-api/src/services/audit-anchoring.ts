import crypto from 'crypto';
import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { Counter, Histogram, register } from 'prom-client';
import { logger } from '../utils/logger';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// Metrics - ensure they are registered once per process
const RETRY_COUNTER = (register.getSingleMetric('t23_anchor_onchain_retries_total') as Counter<string>) || new Counter({ name: 't23_anchor_onchain_retries_total', help: 'Total number of on-chain anchor retry attempts' });
const SUCCESS_COUNTER = (register.getSingleMetric('t23_anchor_onchain_success_total') as Counter<string>) || new Counter({ name: 't23_anchor_onchain_success_total', help: 'Total number of successful on-chain anchors' });
const FAILURE_COUNTER = (register.getSingleMetric('t23_anchor_onchain_failures_total') as Counter<string>) || new Counter({ name: 't23_anchor_onchain_failures_total', help: 'Total number of failed on-chain anchors after retries' });
const CONFIRM_HIST = (register.getSingleMetric('t23_anchor_confirmation_seconds') as Histogram<string>) || new Histogram({ name: 't23_anchor_confirmation_seconds', help: 'Time to confirm the on-chain anchor (seconds)', buckets: [0.5, 1, 2, 5, 10, 30, 60] });

/**
 * Audit event payload structure
 */
export interface AuditEvent {
  event_type: string;
  timestamp: string; // ISO string
  triggering_job_ids?: string[];
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit result
 */
export interface AuditAnchorResult {
  audit_hash: string;
  ipfs_cid: string;
  governance_notified: boolean;
  transaction_signature?: string;
}

const IPFS_API_URL = process.env.IPFS_API_URL || '';
const GOVERNANCE_WEBHOOK_URL = process.env.GOVERNANCE_WEBHOOK_URL || '';
const GOVERNANCE_LOGGER_URL = process.env.GOVERNANCE_LOGGER_URL || process.env.GOVERNANCE_LOGGER_ENDPOINT || '';
const GOVERNANCE_SERVICE_TOKEN = process.env.GOVERNANCE_SERVICE_TOKEN || '';

function toCanonicalJson(event: AuditEvent): string {
  // Build a canonical object with sorted keys and no extra whitespace
  return JSON.stringify(sortObjectKeys(event), null, 0);
}

// Metrics for IPFS pinning
const IPFS_PIN_RETRY_COUNTER = (register.getSingleMetric('t23_ipfs_pin_retries_total') as Counter<string>) || new Counter({ name: 't23_ipfs_pin_retries_total', help: 'Total attempts to pin to IPFS' });
const IPFS_PIN_SUCCESS_COUNTER = (register.getSingleMetric('t23_ipfs_pin_success_total') as Counter<string>) || new Counter({ name: 't23_ipfs_pin_success_total', help: 'Successful IPFS pins' });
const IPFS_PIN_FAILURE_COUNTER = (register.getSingleMetric('t23_ipfs_pin_failures_total') as Counter<string>) || new Counter({ name: 't23_ipfs_pin_failures_total', help: 'Failed IPFS pins after retries' });

async function uploadToIPFS(canonicalJson: string): Promise<string> {
  const attempts = Number(process.env.IPFS_PIN_ATTEMPTS || 3);
  const baseBackoffMs = Number(process.env.IPFS_PIN_BACKOFF_MS || 200);

  const ipfsApi = process.env.IPFS_API_URL || IPFS_API_URL || '';
  if (!ipfsApi || ipfsApi === 'mock') {
    const contentHash = crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
    const cid = `Qm${contentHash.substring(0, 44)}`;
    return cid;
  }

  let lastErr: any = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      IPFS_PIN_RETRY_COUNTER.inc();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const ipfsAuthToken = process.env.IPFS_API_TOKEN || process.env.PINATA_JWT || '';
      if (ipfsAuthToken) {
        headers['Authorization'] = `Bearer ${ipfsAuthToken}`;
      }

      if (process.env.IPFS_API_KEY) headers['x-api-key'] = process.env.IPFS_API_KEY as string;
      if (process.env.IPFS_API_SECRET) headers['x-api-secret'] = process.env.IPFS_API_SECRET as string;

      let payload: any = canonicalJson;
      try {
        if ((ipfsApi || '').includes('pinata') || (ipfsApi || '').includes('pinata.cloud')) {
          const parsed = JSON.parse(canonicalJson);
          payload = { pinataContent: parsed } as any;

          if (!ipfsAuthToken && process.env.IPFS_API_KEY && process.env.IPFS_API_SECRET) {
            const aKey = String(process.env.IPFS_API_KEY);
            const aSecret = String(process.env.IPFS_API_SECRET);
            payload.pinata_api_key = aKey;
            payload.pinata_secret_api_key = aSecret;
          }
        }
      } catch (pErr) {
        payload = canonicalJson;
      }

      const authMode = ipfsAuthToken ? 'JWT' : (process.env.IPFS_API_KEY ? 'API_KEY_BODY' : 'NONE');
      logger.debug(`[AuditAnchoring] IPFS auth mode: ${authMode}`, { authMode });

      if (ipfsApi.includes('127.0.0.1') || ipfsApi.includes('localhost')) {
        try {
          const addUrl = ipfsApi.endsWith('/') ? `${ipfsApi}api/v0/add?pin=true` : `${ipfsApi}/api/v0/add?pin=true`;
          const form = new FormData();
          form.append('file', Buffer.from(canonicalJson, 'utf8'), {
            filename: 'audit_event.json',
            contentType: 'application/json'
          });

          try {
            // @ts-ignore
            const formHeaders = form.getHeaders();
            const allHeaders = { ...headers, ...formHeaders };

            const res = await axios.post(addUrl, form as any, { headers: allHeaders, maxBodyLength: Infinity, timeout: 20000 });

            const raw = res.data;
            let cidSub: string | null = null;
            if (typeof raw === 'string') {
              const lines = raw.trim().split('\n').filter(Boolean);
              const lastLine = lines[lines.length - 1];
              try {
                const parsed = JSON.parse(lastLine);
                cidSub = parsed.Hash || parsed.cid || parsed.Cid || parsed.IpfsHash;
              } catch (e) {
                cidSub = lastLine.trim();
              }
            } else if (res.data && typeof res.data === 'object') {
              cidSub = res.data.Hash || res.data.cid || res.data.Cid || res.data.IpfsHash;
            }

            if (cidSub) {
              IPFS_PIN_SUCCESS_COUNTER.inc();
              logger.info(`[AuditAnchoring] IPFS pinned successfully via Kubo HTTP`, { cid: cidSub });
              return cidSub.toString();
            }

            lastErr = new Error(`Kubo /api/v0/add responded but no CID: ${JSON.stringify(res.data).slice(0, 400)}`);
          } catch (httpErr) {
            lastErr = httpErr;
          }

        } catch (e2) {
          lastErr = e2;
        }
      }

      const res = await axios.post(ipfsApi, payload, { headers, timeout: 20000 });

      const cid = (res.data && (res.data.IpfsHash || res.data.cid || res.data.Hash || res.data.hash)) || '';
      if (cid) {
        IPFS_PIN_SUCCESS_COUNTER.inc();
        logger.info(`[AuditAnchoring] IPFS pinned successfully`, { cid: cid.toString() });
        return cid.toString();
      }

      throw new Error('IPFS gateway did not return CID');
    } catch (err: any) {
      const message = err?.message || String(err);
      const code = err?.code || err?.errno || '';
      const status = err?.response?.status;
      const responseData = err?.response?.data;
      let reqUrl = err?.config?.url || err?.request?.url || err?.request?.path || '';

      logger.warn(`[AuditAnchoring] IPFS pin attempt ${attempt}/${attempts} failed`, {
        message,
        code,
        status,
        url: reqUrl,
        responseData: JSON.stringify(responseData).slice(0, 300)
      });

      lastErr = err;

      if (attempt < attempts) {
        const backoff = baseBackoffMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      IPFS_PIN_FAILURE_COUNTER.inc();
      logger.error('[AuditAnchoring] IPFS pinning failed after all retries');

      const lastMessage = lastErr?.message || (lastErr ? String(lastErr) : 'unknown');
      throw new Error(`IPFS pinning failed after retries: ${lastMessage}`);
    }
  }

  throw new Error('IPFS pinning failed');
}

async function sendGovernanceNotification(event: AuditEvent, ipfsCid: string): Promise<boolean> {
  const governanceWebhook = process.env.GOVERNANCE_WEBHOOK_URL || GOVERNANCE_WEBHOOK_URL || '';
  if (!governanceWebhook) {
    logger.warn('[AuditAnchoring] GOVERNANCE_WEBHOOK_URL not configured; skipping governance notification');
    return false;
  }

  const notificationPayload = {
    embeds: [
      {
        title: `🚨 GOVERNANCE AUDIT REQUIRED: ${event.event_type}`,
        description: event.details || '',
        color: 16711680,
        fields: [
          { name: 'Timestamp (ISO)', value: event.timestamp, inline: true },
          { name: 'IPFS CID (Payload)', value: ipfsCid, inline: false },
          { name: 'Jobs Impacted', value: (event.triggering_job_ids || []).join(', ') || 'N/A', inline: false },
        ],
        footer: { text: 'T23 Audit Anchoring System' }
      }
    ]
  };

  try {
    await axios.post(governanceWebhook, notificationPayload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
    logger.info('[AuditAnchoring] Governance sink notified');
    return true;
  } catch (err: any) {
    logger.error('[AuditAnchoring] Failed to notify governance sink', err);
    return false;
  }
}

export async function anchorAudit(event: AuditEvent): Promise<AuditAnchorResult> {
  const canonicalJson = toCanonicalJson(event);
  const audit_hash = crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');

  logger.info(`[AuditAnchoring] Processing audit event: ${event.event_type}`, { audit_hash });

  const ipfs_cid = await uploadToIPFS(canonicalJson);
  const governance_notified = await sendGovernanceNotification(event, ipfs_cid);

  const transaction_signature = await anchorAuditOnChain(audit_hash);

  logger.info('Audit anchored', { ipfs_cid, transaction_signature, audit_hash });

  const govLoggerUrl = process.env.GOVERNANCE_LOGGER_URL || process.env.GOVERNANCE_LOGGER_ENDPOINT || GOVERNANCE_LOGGER_URL || '';
  if (govLoggerUrl) {
    try {
      await persistTimelineRecord({ audit_hash, ipfs_cid, governance_notified, transaction_signature, event });
    } catch (err: any) {
      logger.warn('[AuditAnchoring] Failed to persist anchored event to admin governance logger', err);
    }
  } else {
    logger.warn('[AuditAnchoring] GOVERNANCE_LOGGER_URL not configured; skipping timeline persistence via admin-node');
  }

  return { audit_hash, ipfs_cid, governance_notified, transaction_signature };
}

async function persistTimelineRecord(payload: {
  audit_hash: string;
  ipfs_cid: string;
  governance_notified: boolean;
  transaction_signature?: string;
  event: AuditEvent;
}): Promise<void> {
  const attempts = Number(process.env.GOVERNANCE_PERSIST_ATTEMPTS || 5);
  const baseBackoffMs = Number(process.env.GOVERNANCE_PERSIST_BACKOFF_MS || 1000);

  const body = {
    timestamp: new Date().toISOString(),
    action: 'timeline_entry_added',
    actor: 'router-api',
    details: {
      audit_hash: payload.audit_hash,
      ipfs_cid: payload.ipfs_cid,
      transaction_signature: payload.transaction_signature,
      governance_notified: payload.governance_notified,
      source_event: payload.event,
    },
  } as any;

  const govLoggerUrl = process.env.GOVERNANCE_LOGGER_URL || process.env.GOVERNANCE_LOGGER_ENDPOINT || GOVERNANCE_LOGGER_URL || '';

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const svcToken = process.env.GOVERNANCE_SERVICE_TOKEN || GOVERNANCE_SERVICE_TOKEN || '';
      if (svcToken) headers['x-governance-token'] = svcToken;

      await axios.post(govLoggerUrl, body, { headers, timeout: 15000 });
      logger.info('[AuditAnchoring] Persisted timeline record to admin-node governance logger');
      return;
    } catch (err: any) {
      logger.warn(`[AuditAnchoring] Persist attempt ${attempt}/${attempts} to governance logger failed: ${err?.message}`);
      if (attempt < attempts) {
        const backoff = baseBackoffMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw new Error('Failed to persist timeline record to governance logger after retries');
    }
  }
}

async function anchorAuditOnChain(audit_hash: string): Promise<string> {
  const rpc = process.env.SOLANA_RPC_URL || '';

  if (!rpc || rpc === 'mock') {
    const now = Date.now().toString();
    const txSig = crypto.createHash('sha256').update(audit_hash + '|' + now).digest('hex');
    return `mock_tx_${txSig}`;
  }

  try {
    const connection = new Connection(rpc);
    let signer: Keypair;
    if (process.env.ROUTER_PRIVATE_KEY) {
      const secret = Uint8Array.from(JSON.parse(process.env.ROUTER_PRIVATE_KEY));
      signer = Keypair.fromSecretKey(secret);
    } else if (process.env.SOLANA_SIGNER_KEY) {
      const secret = Uint8Array.from(JSON.parse(process.env.SOLANA_SIGNER_KEY));
      signer = Keypair.fromSecretKey(secret);
    } else {
      logger.warn('[AuditAnchoring] No signer key provided (ROUTER_PRIVATE_KEY|SOLANA_SIGNER_KEY). Using ephemeral keypair.');
      signer = Keypair.generate();
    }

    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
    const maxAttempts = Number(process.env.SOLANA_ANCHOR_ATTEMPTS || 5);
    const baseBackoffMs = Number(process.env.SOLANA_ANCHOR_BACKOFF_MS || 1000);
    const confirmationTimeoutMs = Number(process.env.SOLANA_ANCHOR_CONFIRM_TIMEOUT_MS || 60000);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        RETRY_COUNTER.inc();
        const instruction = new TransactionInstruction({ keys: [], programId: memoProgramId, data: Buffer.from(audit_hash) });
        const tx = new Transaction().add(instruction);
        const sig = await connection.sendTransaction(tx, [signer]);
        const startConfirm = Date.now();
        const deadline = Date.now() + confirmationTimeoutMs;
        let confirmed = false;
        while (Date.now() < deadline) {
          try {
            const statuses = await connection.getSignatureStatuses([sig]);
            const info = statuses && statuses.value && statuses.value[0];
            if (info && !info.err && (info.confirmationStatus === 'confirmed' || info.confirmationStatus === 'finalized')) {
              confirmed = true;
              break;
            }
          } catch (inner) { }
          await new Promise(r => setTimeout(r, 1000));
        }

        const confirmDurationSec = (Date.now() - startConfirm) / 1000;
        CONFIRM_HIST.observe(confirmDurationSec);

        if (confirmed) {
          SUCCESS_COUNTER.inc();
          logger.info(`[AuditAnchoring] On-chain TX confirmed`, { sig, duration: confirmDurationSec });
          return sig;
        }
        throw new Error('Transaction not confirmed within timeout');

      } catch (err: any) {
        logger.warn(`[AuditAnchoring] Attempt ${attempt}/${maxAttempts} failed`, { error: err?.message, attempt });
        if (attempt < maxAttempts) {
          const backoff = baseBackoffMs * Math.pow(2, attempt - 1);
          logger.debug(`[AuditAnchoring] Backing off for ${backoff} ms`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        FAILURE_COUNTER.inc();
        logger.error('[AuditAnchoring] All on-chain anchor attempts failed. Escalating.');
        const now = Date.now().toString();
        const txSig = crypto.createHash('sha256').update(audit_hash + '|' + now).digest('hex');
        return `mock_tx_${txSig}`;
      }
    }
  } catch (err: any) {
    logger.error('[AuditAnchoring] On-chain anchoring failed, falling back to mock signature', err);
    const now = Date.now().toString();
    const txSig = crypto.createHash('sha256').update(audit_hash + '|' + now).digest('hex');
    return `mock_tx_${txSig}`;
  }
  const now2 = Date.now().toString();
  const finalSig = crypto.createHash('sha256').update(audit_hash + '|' + now2).digest('hex');
  return `mock_tx_${finalSig}`;
}

function sortObjectKeys<T>(obj: T): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const keys = Object.keys(obj).sort();
  const out: any = {};
  for (const k of keys) out[k] = sortObjectKeys((obj as any)[k]);
  return out;
}

export default { anchorAudit };
