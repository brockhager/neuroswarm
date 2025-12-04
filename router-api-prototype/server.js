/*
 Router API Prototype — minimal Express server exposing two endpoints needed by Agent 9
 - POST /governance/vote
 - POST /ingest/artifact

 This prototype is intentionally minimal (no DB/IPFS/auth backends) — it demonstrates the JSON contracts and basic flow.
*/

const express = require('express');
const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

// Simple auth middleware (prototype only)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  // attach a prototype user context
  req.user = { id: 'agent9-discord-bot', roles: ['gateway', 'agent'] };
  next();
};

// POST /governance/vote
app.post('/governance/vote', authMiddleware, (req, res) => {
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
app.post('/ingest/artifact', authMiddleware, (req, res) => {
  const artifact = req.body;

  if (!artifact.contentCid || !artifact.uploaderId || !artifact.metadata) {
    return res.status(400).json({ error: 'Missing required fields: contentCid, uploaderId, metadata.' });
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

app.get('/', (req, res) => res.send('Router API Prototype — /governance/vote (POST), /ingest/artifact (POST)'));

app.listen(PORT, () => {
  console.log(`Router API Prototype listening on http://127.0.0.1:${PORT}`);
});
