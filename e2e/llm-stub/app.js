const express = require('express');
const bodyParser = require('body-parser');

// Deterministic LLM stub for CI/e2e
// - /health => { ok: true }
// - /generate => returns a deterministic ARTIFACT_CRITIQUE-like JSON payload

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ ok: true, name: 'e2e-llm-stub' }));

app.post('/generate', (req, res) => {
  const { artifactContent, artifact_id } = req.body || {};

  // Deterministic behavior: echo artifact_id and create a short critique
  const id = artifact_id || (artifactContent && artifactContent.artifact_id) || `unknown-${Date.now()}`;

  // simple deterministic critique: based on id hash (first 8 chars)
  const hash = require('crypto').createHash('sha256').update(String(id)).digest('hex').slice(0, 8);

  const critique = {
    type: 'ARTIFACT_CRITIQUE',
    payload: {
      artifact_id: id,
      summary: `Deterministic critique for ${id}`,
      score: 0.5,
      issues: [
        { code: 'E2E-1', message: `Deterministic issue fingerprint: ${hash}` }
      ],
      metadata: { generatedBy: 'e2e-llm-stub', fingerprint: hash }
    }
  };

  res.json({ ok: true, critique });
});

const port = process.env.PORT || 5555;
app.listen(port, () => console.log(`LLM stub listening on ${port}`));
