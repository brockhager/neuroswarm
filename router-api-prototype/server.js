/*
 Router API Prototype — minimal Express server exposing two endpoints needed by Agent 9
 - POST /governance/vote
 - POST /ingest/artifact

 This prototype is intentionally minimal (no DB/IPFS/auth backends) — it demonstrates the JSON contracts and basic flow.
*/

import express from 'express';
import crypto from 'crypto';
import { jwtVerify, importSPKI, createRemoteJWKSet } from 'jose';
import { fileURLToPath } from 'url';
import { pinArtifact, listPins, clearPins } from './src/pinning.js';
import Ajv from 'ajv';
import { readFile } from 'fs/promises';
const __filename = fileURLToPath(import.meta.url);
const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

// --- JWT verification and RBAC middleware ---

// Validate JWT using 'jose' library. Support HS256 (shared secret) or RS256/ES256 (public key).
async function validateJwt(token) {
  if (!token) return { valid: false };

  // Prefer JWKS remote URL if configured (recommended in production)
  if (process.env.ROUTER_JWKS_URL) {
    try {
      const JWKS = createRemoteJWKSet(new URL(process.env.ROUTER_JWKS_URL));
      const { payload } = await jwtVerify(token, JWKS, { algorithms: ['RS256', 'ES256'] });
      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: `jwks_error:${err.message}` };
    }
  }

  // Prefer RS256 if public key PEM is configured
  if (process.env.ROUTER_JWT_PUBLIC_KEY) {
    try {
      const pubKeyPem = process.env.ROUTER_JWT_PUBLIC_KEY;
      // import SPKI (public PEM) to KeyLike
      const key = await importSPKI(pubKeyPem, 'RS256');
      const { payload } = await jwtVerify(token, key, { algorithms: ['RS256', 'ES256'] });
      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  // Fallback to HS256 using shared secret
  if (process.env.ROUTER_JWT_SECRET) {
    try {
      const secret = new TextEncoder().encode(process.env.ROUTER_JWT_SECRET);
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      return { valid: true, payload };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  return { valid: false, error: 'no_jwt_configured' };
}

// correlation id helper for errors / tracing
function getCorrelationId(req) {
  if (!req || !req.headers) return crypto.randomBytes(8).toString('hex');
  const cid = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  if (cid && typeof cid === 'string' && cid.trim()) return cid.trim();
  return crypto.randomBytes(8).toString('hex');
}

function formatError(code, message, details, req) {
  return {
    error: {
      code: String(code),
      message: String(message || ''),
      details: details || [],
      correlationId: getCorrelationId(req),
      timestamp: new Date().toISOString()
    }
  };
}

const authenticateJwt = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json(formatError('auth_required', 'Authentication required.', null, req));
  const token = authHeader.slice('Bearer '.length).trim();
  const result = await validateJwt(token);
  if (!result.valid) return res.status(401).json(formatError('invalid_token', `Invalid or expired token. ${result.error || ''}`, null, req));
  const payload = result.payload || {};
  req.user = { id: payload.sub || payload.client_id || payload.userId || 'unknown', roles: payload.roles || [] };
  next();
};

function requireRoles(requiredRoles = []) {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.roles)) return res.status(403).json(formatError('unauthorized', 'Unauthorized - missing roles', null, req));
    const has = requiredRoles.some(r => req.user.roles.includes(r));
    if (!has) return res.status(403).json(formatError('forbidden', 'Forbidden - insufficient role privileges', null, req));
    return next();
  };
}

// POST /governance/vote
app.post('/governance/vote', authenticateJwt, requireRoles(['governance']), (req, res) => {
  const votePayload = req.body;

  if (!votePayload.proposalId || !votePayload.voterId || !votePayload.vote) {
    return res.status(400).json(formatError('missing_fields', 'Missing required fields: proposalId, voterId, vote.', null, req));
  }

  // Construct a transaction envelope the Router would forward to Gateway/ns-node
  const tx = {
    type: 'GOVERNANCE_VOTE',
    proposalId: votePayload.proposalId,
    voterId: votePayload.voterId,
    vote: votePayload.vote,
    metadata: votePayload.metadata || {},
    timestamp: new Date().toISOString(),
  };

  console.log('[router] queued vote tx ->', tx.proposalId, tx.voterId, tx.vote);

  // Prototype: return queued state
  res.status(202).json({
    message: 'Vote transaction accepted and queued.',
    transaction_id: `tx-${Date.now()}`,
    status: 'queued_to_gateway'
  });
});

// POST /artifact/review (CN-08-A)
// Request LLM analysis of an uploaded artifact
app.post('/artifact/review', authenticateJwt, requireRoles(['review', 'governance', 'validator']), (req, res) => {
  const reviewRequest = req.body;

  // Validate required fields
  if (!reviewRequest.artifact_id || !reviewRequest.requestor) {
    return res.status(400).json(formatError('missing_fields', 'Missing required fields: artifact_id, requestor.', null, req));
  }

  // Validate artifact_id format (CID: bafy... or Qm...)
  const artifactId = reviewRequest.artifact_id;
  if (!(String(artifactId).startsWith('bafy') || String(artifactId).startsWith('Qm'))) {
    return res.status(400).json(formatError('invalid_artifact_id', 'artifact_id must be a valid CID (bafy... or Qm...).', null, req));
  }

  // Construct review request envelope for VP-Node consumption
  const request = {
    type: 'REQUEST_REVIEW',
    artifact_id: artifactId,
    requestor: reviewRequest.requestor,
    block_height: reviewRequest.block_height || null,  // Optional: block height for tracking
    metadata: reviewRequest.metadata || {},
    timestamp: new Date().toISOString(),
  };

  console.log('[router] artifact review request queued ->', request.artifact_id, 'requestor:', request.requestor);

  // Prototype: return queued state
  // In production, this would publish to a queue/message bus for VP-Node to consume
  res.status(202).json({
    message: 'Artifact review request accepted and queued for VP-Node processing.',
    request_id: `review-${Date.now()}`,
    artifact_id: request.artifact_id,
    status: 'queued_for_vp'
  });
});


// POST /ingest/artifact
// compile schema-based validation middleware for /ingest/artifact
let validateArtifactSchema = null;
async function loadArtifactSchema() {
  if (validateArtifactSchema) return validateArtifactSchema;
  try {
    const schemaRaw = await readFile(new URL('./contracts/AnchorArtifactRequest.json', import.meta.url));
    const schema = JSON.parse(schemaRaw.toString());
    const ajv = new Ajv({ allErrors: true, strict: false }); // allow draft-07
    const validate = ajv.compile(schema);
    validateArtifactSchema = validate;
    return validateArtifactSchema;
  } catch (err) {
    console.error('Failed to load artifact schema:', err && err.message);
    // If schema fails to load, fallback to old validation via validateArtifact helper
    return null;
  }
}

async function artifactValidationMiddleware(req, res, next) {
  const validate = await loadArtifactSchema();
  if (!validate) return next();
  const ok = validate(req.body);
  if (!ok) return res.status(400).json(formatError('invalid_payload', 'Payload failed schema validation', validate.errors, req));
  return next();
}

app.post('/ingest/artifact', authenticateJwt, requireRoles(['ingest', 'uploader', 'agent']), artifactValidationMiddleware, async (req, res) => {
  const artifact = req.body;

  // Additional server-side safety checks (defense in depth) — keep existing function
  const validation = validateArtifact(artifact);
  if (!validation.valid) return res.status(400).json(formatError('invalid_payload', validation.reason, null, req));

  // Note: in production you may want stricter checks here linking authenticated client to uploader.
  // For prototype E2E flows we accept uploaderId provided by the client and rely on RBAC + audit trails.

  console.log('[router] artifact received', artifact.contentCid, 'from', artifact.uploaderId);

  try {
    const pin = await pinArtifact(artifact.contentCid, artifact.uploaderId, artifact.metadata);
    const job = {
      jobId: `job-${Date.now()}`,
      artifact_cid: artifact.contentCid,
      uploader: artifact.uploaderId,
      status: 'pinned',
      pinnedAt: pin.pinnedAt
    };

    res.status(202).json({
      message: 'Artifact ingestion started. Pinning and anchoring workflows queued.',
      job_id: job.jobId,
      artifact_cid: job.artifact_cid,
      status: job.status,
      pin
    });
  } catch (err) {
    console.error('pinning failed', err && err.message);
    res.status(500).json(formatError('pinning_failed', 'Pinning failed', [{ message: err && err.message }], req));
  }
});

// --- Validation helper for artifacts ---
function validateArtifact(artifact = {}) {
  if (!artifact || typeof artifact !== 'object') return { valid: false, reason: 'invalid_body' };
  const cid = artifact.contentCid || artifact.contentCidRaw || artifact.cid;
  const uploaderId = artifact.uploaderId || artifact.uploader || artifact.uploader_id;
  const metadata = artifact.metadata || {};

  if (!cid) return { valid: false, reason: 'missing_contentCid' };
  if (!uploaderId) return { valid: false, reason: 'missing_uploaderId' };
  if (!metadata || typeof metadata !== 'object') return { valid: false, reason: 'missing_metadata' };

  // Basic CID format checks: allow bafy... (CIDv1 base32) and Qm... (CIDv0)
  if (!(String(cid).startsWith('bafy') || String(cid).startsWith('Qm'))) {
    return { valid: false, reason: 'invalid_contentCid' };
  }

  // metadata expectations: filename, size, contentType
  const fname = metadata.filename || '';
  const fsize = typeof metadata.size === 'number' ? metadata.size : null;
  const contentType = metadata.contentType || metadata.mime || '';

  if (!fname) return { valid: false, reason: 'missing_metadata_filename' };
  if (fsize === null) return { valid: false, reason: 'missing_metadata_size' };

  // Size limits
  const MAX_UPLOAD_BYTES = Number(process.env.MAX_FILE_UPLOAD_BYTES || 5 * 1024 * 1024);
  if (fsize > MAX_UPLOAD_BYTES) return { valid: false, reason: 'size_exceeds_limit' };

  // Allowed extensions
  const ALLOWED_EXT = (process.env.ALLOWED_FILE_EXTENSIONS || '.png,.jpg,.jpeg,.gif,.txt,.md,.pdf').split(',').map(s => s.trim().toLowerCase());
  const ext = fname.includes('.') ? fname.split('.').pop().toLowerCase() : '';
  if (ext && ALLOWED_EXT.length && !ALLOWED_EXT.includes('.' + ext) && !ALLOWED_EXT.includes(ext)) {
    return { valid: false, reason: 'invalid_extension' };
  }

  return { valid: true };
}

app.get('/', (req, res) => res.send('Router API Prototype — /governance/vote (POST), /ingest/artifact (POST), /artifact/review (POST)'));

// Debug endpoints for testing: view and clear pinned artifacts
app.get('/debug/pins', async (req, res) => {
  const pins = await listPins();
  return res.json({ pins });
});

app.post('/debug/pins/clear', async (req, res) => {
  await clearPins();
  return res.json({ ok: true });
});

if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(`Router API Prototype listening on http://127.0.0.1:${PORT}`);
  });
}

export { app, validateJwt, validateArtifact, authenticateJwt, requireRoles };
