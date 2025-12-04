/*
 Router API Prototype — minimal Express server exposing two endpoints needed by Agent 9
 - POST /governance/vote
 - POST /ingest/artifact

 This prototype is intentionally minimal (no DB/IPFS/auth backends) — it demonstrates the JSON contracts and basic flow.
*/

import express from 'express';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

// --- JWT verification and RBAC middleware ---

function base64urlDecode(input) {
  // base64url -> base64
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  while (input.length % 4) input += '=';
  return Buffer.from(input, 'base64').toString('utf8');
}

function verifyJwt(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  let headerJson, payloadJson;
  try {
    headerJson = JSON.parse(base64urlDecode(headerB64));
    payloadJson = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return null;
  }

  const alg = headerJson.alg || 'HS256';
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  if (alg === 'HS256') {
    const secret = process.env.ROUTER_JWT_SECRET;
    if (!secret) return null;
    const expected = crypto.createHmac('sha256', secret).update(signingInput).digest();
    if (!crypto.timingSafeEqual(expected, signature)) return null;
    return payloadJson;
  }

  if (alg === 'RS256') {
    const pub = process.env.ROUTER_JWT_PUBLIC_KEY; // PEM
    if (!pub) return null;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signingInput);
    verify.end();
    if (!verify.verify(pub, signature)) return null;
    return payloadJson;
  }

  // unsupported alg
  return null;
}

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
  const token = authHeader.slice('Bearer '.length).trim();
  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token.' });
  // attach user context
  req.user = { id: payload.sub || payload.client_id || payload.client || 'unknown', roles: payload.roles || [] };
  next();
};

function requireRoles(requiredRoles = []) {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.roles)) return res.status(403).json({ error: 'Unauthorized - missing roles' });
    const has = requiredRoles.some(r => req.user.roles.includes(r));
    if (!has) return res.status(403).json({ error: 'Forbidden - insufficient role privileges' });
    return next();
  };
}

// POST /governance/vote
app.post('/governance/vote', authenticateJwt, requireRoles(['governance']), (req, res) => {
  const votePayload = req.body;

  if (!votePayload.proposalId || !votePayload.voterId || !votePayload.vote) {
    return res.status(400).json({ error: 'Missing required fields: proposalId, voterId, vote.' });
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

// POST /ingest/artifact
app.post('/ingest/artifact', authenticateJwt, requireRoles(['ingest', 'uploader', 'agent']), (req, res) => {
  const artifact = req.body;

  // Server-side validation for artifacts (defense in depth)
  const validation = validateArtifact(artifact);
  if (!validation.valid) return res.status(400).json({ error: validation.reason });

  // Optional: ensure the authenticated principal matches uploader
  if (artifact.uploaderId && req.user && artifact.uploaderId !== req.user.id) {
    return res.status(403).json({ error: 'Uploader ID does not match authenticated client.' });
  }

  console.log('[router] artifact received', artifact.contentCid, 'from', artifact.uploaderId);

  const job = {
    jobId: `job-${Date.now()}`,
    artifact_cid: artifact.contentCid,
    uploader: artifact.uploaderId,
    status: 'processing_anchors',
    created_at: new Date().toISOString()
  };

  res.status(202).json({
    message: 'Artifact ingestion started. Pinning and anchoring workflows queued.',
    job_id: job.jobId,
    artifact_cid: job.artifact_cid,
    status: job.status
  });
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

app.get('/', (req, res) => res.send('Router API Prototype — /governance/vote (POST), /ingest/artifact (POST)'));

if (process.argv[1] === __filename) {
  app.listen(PORT, () => {
    console.log(`Router API Prototype listening on http://127.0.0.1:${PORT}`);
  });
}

export { app, verifyJwt, validateArtifact, authenticateJwt, requireRoles };
