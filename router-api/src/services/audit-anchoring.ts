import crypto from 'crypto';
import { Connection, Keypair, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { Counter, Histogram, register } from 'prom-client';

// Metrics - ensure they are registered once per process
const RETRY_COUNTER = (register.getSingleMetric('t23_anchor_onchain_retries_total') as Counter<string>) || new Counter({ name: 't23_anchor_onchain_retries_total', help: 'Total number of on-chain anchor retry attempts' });
const SUCCESS_COUNTER = (register.getSingleMetric('t23_anchor_onchain_success_total') as Counter<string>) || new Counter({ name: 't23_anchor_onchain_success_total', help: 'Total number of successful on-chain anchors' });
const FAILURE_COUNTER = (register.getSingleMetric('t23_anchor_onchain_failures_total') as Counter<string>) || new Counter({ name: 't23_anchor_onchain_failures_total', help: 'Total number of failed on-chain anchors after retries' });
const CONFIRM_HIST = (register.getSingleMetric('t23_anchor_confirmation_seconds') as Histogram<string>) || new Histogram({ name: 't23_anchor_confirmation_seconds', help: 'Time to confirm the on-chain anchor (seconds)', buckets: [0.5, 1, 2, 5, 10, 30, 60] });
import axios from 'axios';
import fs from 'fs';
import path from 'path';

/**
 * Audit event payload structure
 * {
 *   event_type: string,
 *   timestamp: string (ISO UTC),
 *   triggering_job_ids?: string[],
 *   details?: string,
 *   metadata?: Record<string, any>
 * }
 */

export interface AuditEvent {
  event_type: string;
  timestamp: string; // ISO string
  triggering_job_ids?: string[];
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Simulates anchoring an audit payload by computing a SHA-256 hash of the
 * canonical JSON representation and (for now) logging it. In production
 * this would write an IPFS object and/or submit the hash to an on-chain tx.
 */
export interface AuditAnchorResult {
  audit_hash: string;
  ipfs_cid: string;
  governance_notified: boolean;
  transaction_signature?: string;
}

const IPFS_API_URL = process.env.IPFS_API_URL || '';
const GOVERNANCE_WEBHOOK_URL = process.env.GOVERNANCE_WEBHOOK_URL || '';
// Endpoint where admin-node accepts timeline entries (internal service)
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
  // Use shorter defaults to keep tests responsive; prod can override via env
  const attempts = Number(process.env.IPFS_PIN_ATTEMPTS || 3);
  const baseBackoffMs = Number(process.env.IPFS_PIN_BACKOFF_MS || 200);

  // If IPFS API not configured, skip trying remote and return deterministic/mock CID
  const ipfsApi = process.env.IPFS_API_URL || IPFS_API_URL || '';
  if (!ipfsApi || ipfsApi === 'mock') {
    const contentHash = crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
    const cid = `Qm${contentHash.substring(0, 44)}`;
    return cid;
  }

  // Track last error for improved diagnostics on failure
  let lastErr: any = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      IPFS_PIN_RETRY_COUNTER.inc();
      // Build request headers and include an Authorization token if provided
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Generic env name for a bearer token for IPFS pinning services
      const ipfsAuthToken = process.env.IPFS_API_TOKEN || process.env.PINATA_JWT || '';
      if (ipfsAuthToken) {
        // Use Authorization: Bearer <token> (Pinata supports JWTs this way)
        headers['Authorization'] = `Bearer ${ipfsAuthToken}`;
      }

      // Also support x-api-key / x-api-secret if provided (some services use custom headers)
      if (process.env.IPFS_API_KEY) headers['x-api-key'] = process.env.IPFS_API_KEY as string;
      if (process.env.IPFS_API_SECRET) headers['x-api-secret'] = process.env.IPFS_API_SECRET as string;

      // Pinata expects a specific body shape for pinning JSON (pinJSONToIPFS)
      // When targeting Pinata and no JWT is present, include pinata_api_key/pinata_secret_api_key
      // and wrap the event as `pinataContent` object so Pinata will accept it.
      let payload: any = canonicalJson;
      try {
        // If the endpoint looks like Pinata's API, wrap payload accordingly
        if ((ipfsApi || '').includes('pinata') || (ipfsApi || '').includes('pinata.cloud')) {
          const parsed = JSON.parse(canonicalJson);
          payload = { pinataContent: parsed } as any;

          // If JWT not supplied but API key/secret provided, attach them in body
          if (!ipfsAuthToken && process.env.IPFS_API_KEY && process.env.IPFS_API_SECRET) {
            payload.pinata_api_key = String(process.env.IPFS_API_KEY);
            payload.pinata_secret_api_key = String(process.env.IPFS_API_SECRET);
          }
        }
      } catch (pErr) {
        // If parsing failed, fall back to sending the raw string (some gateways accept raw JSON strings)
        payload = canonicalJson;
      }

      // Emit a short masked diagnostic for CI: which auth strategy will be used.
      const authMode = ipfsAuthToken ? 'JWT' : (process.env.IPFS_API_KEY ? 'API_KEY_BODY' : 'NONE');
      console.log('[AuditAnchoring] IPFS auth mode:', authMode);

      const res = await axios.post(ipfsApi, payload, { headers, timeout: 20000 });

      const cid = (res.data && (res.data.cid || res.data.Hash || res.data.hash)) || '';
      if (cid) {
        IPFS_PIN_SUCCESS_COUNTER.inc();
        console.log('[AuditAnchoring] IPFS pinned successfully:', cid);
        return cid.toString();
      }

      throw new Error('IPFS gateway did not return CID');
    } catch (err: any) {
      // Provide richer diagnostics for CI logs so failures are actionable and
      // surface the real cause when an AggregateError wraps multiple inner errors.
      const message = err?.message || String(err);
      const code = err?.code || err?.errno || '';
      const status = err?.response?.status;
      const responseData = err?.response?.data;

      // Try to extract request and config info (mask headers for safety)
      let reqUrl = err?.config?.url || err?.request?.url || err?.request?.path || '';
      let method = err?.config?.method || err?.request?.method || '';
      let headersSummary = '';
      try {
        const headers = err?.config?.headers || {};
        // Mask well-known auth fields
        const safe = { ...headers };
        if (safe?.authorization) safe.authorization = '[REDACTED]';
        if (safe?.Authorization) safe.Authorization = '[REDACTED]';
        if (safe?.['x-api-key']) safe['x-api-key'] = '[REDACTED]';
        headersSummary = JSON.stringify(safe).slice(0, 200);
      } catch (hErr) {
        headersSummary = '';
      }

      // Handle AggregateError (e.g., Promise.any / multiple suberrors)
      if (err?.name === 'AggregateError' && Array.isArray(err.errors)) {
        const innerMsgs = err.errors.map((e: any, idx: number) => {
          const innerMsg = e?.message || String(e);
          const innerCode = e?.code || '';
          const innerStatus = e?.response?.status || '';
          return `#${idx + 1}:${innerMsg}${innerCode ? ` (code=${innerCode})` : ''}${innerStatus ? ` status=${innerStatus}` : ''}`;
        }).join(' | ');

        console.warn(`[AuditAnchoring] IPFS pin attempt ${attempt}/${attempts} failed: AGGREGATE ${message}`,
          `code=${code}`,
          reqUrl ? `url=${reqUrl}` : '',
          method ? `method=${method}` : '',
          headersSummary ? `headers=${headersSummary}` : '',
          responseData ? `response=${JSON.stringify(responseData).slice(0, 300)}` : '',
          `inner=${innerMsgs}`,
          err?.stack ? `stack=${(err.stack || '').split('\n')[0]}` : ''
        );

        // capture inner messages for final error
        lastErr = { message: message, inner: innerMsgs, code, status };
      } else {
        console.warn(`[AuditAnchoring] IPFS pin attempt ${attempt}/${attempts} failed:`,
          message,
          code ? `code=${code}` : '',
          status ? `status=${status}` : '',
          reqUrl ? `url=${reqUrl}` : '',
          headersSummary ? `headers=${headersSummary}` : '',
          responseData ? `response=${JSON.stringify(responseData).slice(0, 300)}` : '',
          err?.stack ? `stack=${(err.stack || '').split('\n')[0]}` : ''
        );
        lastErr = err;
      }
      if (attempt < attempts) {
        const backoff = baseBackoffMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      IPFS_PIN_FAILURE_COUNTER.inc();
      console.error('[AuditAnchoring] IPFS pinning failed after all retries. Aborting anchor to preserve integrity.');
      // Attach last error message so CI logs contain the actual root cause.
      const lastMessage = lastErr?.message || (lastErr ? String(lastErr) : 'unknown');
      throw new Error(`IPFS pinning failed after retries: ${lastMessage}`);
    }
  }

  // Fallback (should not be reachable) - throw to be safe
  throw new Error('IPFS pinning failed');
}

async function sendGovernanceNotification(event: AuditEvent, ipfsCid: string): Promise<boolean> {
  const governanceWebhook = process.env.GOVERNANCE_WEBHOOK_URL || GOVERNANCE_WEBHOOK_URL || '';
  if (!governanceWebhook) {
    console.warn('[AuditAnchoring] GOVERNANCE_WEBHOOK_URL not configured; skipping governance notification');
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
    // Use axios to POST JSON to the configured governance sink
    await axios.post(governanceWebhook, notificationPayload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
    console.log('[AuditAnchoring] Governance sink notified');
    return true;
  } catch (err: any) {
    console.error('[AuditAnchoring] Failed to notify governance sink:', err?.message || err);
    return false;
  }
}

/**
 * The core anchoring process.
 * 1. Canonicalize and Hash (for on-chain anchor).
 * 2. Upload full payload to IPFS (for public audit).
 * 3. Notify Governance Sink.
 */
export async function anchorAudit(event: AuditEvent): Promise<AuditAnchorResult> {
  const canonicalJson = toCanonicalJson(event);
  const audit_hash = crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');

  console.log('\n--- Governance Audit Event ---');
  console.log(`Event Type: ${event.event_type}`);
  console.log('Computed audit_hash (SHA-256):', audit_hash);

  const ipfs_cid = await uploadToIPFS(canonicalJson);
  const governance_notified = await sendGovernanceNotification(event, ipfs_cid);

  // 3) Simulate On-Chain anchoring (e.g., submitting a Memo or minimal tx with audit_hash)
  const transaction_signature = await anchorAuditOnChain(audit_hash);
  console.log('[AuditAnchoring] Simulated on-chain tx signature:', transaction_signature);

  console.log('Audit anchored ->', { ipfs_cid });

  // Persist to governance timeline via admin-node GovernanceLogger API (if configured)
  const govLoggerUrl = process.env.GOVERNANCE_LOGGER_URL || process.env.GOVERNANCE_LOGGER_ENDPOINT || GOVERNANCE_LOGGER_URL || '';
  if (govLoggerUrl) {
    try {
      await persistTimelineRecord({ audit_hash, ipfs_cid, governance_notified, transaction_signature, event });
    } catch (err: any) {
      console.warn('[AuditAnchoring] Failed to persist anchored event to admin governance logger:', err?.message || err);
    }
  } else {
    console.warn('[AuditAnchoring] GOVERNANCE_LOGGER_URL not configured; skipping timeline persistence via admin-node');
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

  // Attempt HTTP POST with retries
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const svcToken = process.env.GOVERNANCE_SERVICE_TOKEN || GOVERNANCE_SERVICE_TOKEN || '';
      if (svcToken) headers['x-governance-token'] = svcToken;

      await axios.post(govLoggerUrl, body, { headers, timeout: 15000 });
      console.log('[AuditAnchoring] Persisted timeline record to admin-node governance logger');
      return;
    } catch (err: any) {
      console.warn(`[AuditAnchoring] Persist attempt ${attempt}/${attempts} to governance logger failed:`, err?.message || err);
      if (attempt < attempts) {
        const backoff = baseBackoffMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      // Exhausted -> throw to caller
      throw new Error('Failed to persist timeline record to governance logger after retries');
    }
  }
}

async function anchorAuditOnChain(audit_hash: string): Promise<string> {
  const rpc = process.env.SOLANA_RPC_URL || '';

  // If no RPC configured or explicitly set to 'mock' use the deterministic mocked signature
  if (!rpc || rpc === 'mock') {
    const now = Date.now().toString();
    const txSig = crypto.createHash('sha256').update(audit_hash + '|' + now).digest('hex');
    return `mock_tx_${txSig}`;
  }

  try {
    const connection = new Connection(rpc);

    // Observability - use module-level metrics (created once)

    // Load signer keypair from env or fall back to ephemeral (ephemeral not recommended for prod)
    let signer: Keypair;
    if (process.env.ROUTER_PRIVATE_KEY) {
      const secret = Uint8Array.from(JSON.parse(process.env.ROUTER_PRIVATE_KEY));
      signer = Keypair.fromSecretKey(secret);
    } else if (process.env.SOLANA_SIGNER_KEY) {
      // alternative env key name
      const secret = Uint8Array.from(JSON.parse(process.env.SOLANA_SIGNER_KEY));
      signer = Keypair.fromSecretKey(secret);
    } else {
      console.warn('[AuditAnchoring] No signer key provided (ROUTER_PRIVATE_KEY|SOLANA_SIGNER_KEY). Using ephemeral keypair for test-only anchor. This is NOT suitable for production.');
      signer = Keypair.generate();
    }

    // Memo program ID (standard memo program on Solana)
    const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

    // Retry & confirmation configuration
    const maxAttempts = Number(process.env.SOLANA_ANCHOR_ATTEMPTS || 5);
    const baseBackoffMs = Number(process.env.SOLANA_ANCHOR_BACKOFF_MS || 1000);
    const confirmationTimeoutMs = Number(process.env.SOLANA_ANCHOR_CONFIRM_TIMEOUT_MS || 60000);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        RETRY_COUNTER.inc();

        const instruction = new TransactionInstruction({ keys: [], programId: memoProgramId, data: Buffer.from(audit_hash) });
        const tx = new Transaction().add(instruction);

        const startSend = Date.now();
        // sendTransaction returns signature when successful
        const sig = await connection.sendTransaction(tx, [signer]);

        // Wait for confirmation with polling
        const startConfirm = Date.now();
        const deadline = Date.now() + confirmationTimeoutMs;
        let confirmed = false;
        while (Date.now() < deadline) {
          try {
            const statuses = await connection.getSignatureStatuses([sig]);
            const info = statuses && statuses.value && statuses.value[0];
            const status = info && (info.confirmationStatus || info.confirmationStatus === 'finalized' ? info.confirmationStatus : info?.confirmationStatus);
            // Confirmed or finalized
            if (info && !info.err && (info.confirmationStatus === 'confirmed' || info.confirmationStatus === 'finalized')) {
              confirmed = true;
              break;
            }
          } catch (inner) {
            // keep polling
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        const confirmDurationSec = (Date.now() - startConfirm) / 1000;
        CONFIRM_HIST.observe(confirmDurationSec);

        if (confirmed) {
          SUCCESS_COUNTER.inc();
          console.log('[AuditAnchoring] On-chain TX confirmed in', confirmDurationSec, 's sig=', sig);
          return sig;
        }

        // If not confirmed, throw to trigger retry path
        throw new Error('Transaction not confirmed within timeout');

      } catch (err: any) {
        console.warn(`[AuditAnchoring] Attempt ${attempt}/${maxAttempts} failed:`, err?.message || err);
        if (attempt < maxAttempts) {
          const backoff = baseBackoffMs * Math.pow(2, attempt - 1);
          console.log(`[AuditAnchoring] Backing off for ${backoff} ms before retry`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        // All attempts exhausted -> escalate
        FAILURE_COUNTER.inc();
        console.error('[AuditAnchoring] All on-chain anchor attempts failed. Escalating and falling back to mock signature.');
        const now = Date.now().toString();
        const txSig = crypto.createHash('sha256').update(audit_hash + '|' + now).digest('hex');
        return `mock_tx_${txSig}`;
      }
    }
  } catch (err: any) {
    console.error('[AuditAnchoring] On-chain anchoring failed, falling back to mock signature:', err?.message || err);
    const now = Date.now().toString();
    const txSig = crypto.createHash('sha256').update(audit_hash + '|' + now).digest('hex');
    return `mock_tx_${txSig}`;
  }

  // Safety net: ensure this function always returns a string even if TypeScript can't
  // statically prove the above branches return in all control-flow paths.
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
