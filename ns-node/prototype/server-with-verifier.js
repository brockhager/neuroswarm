import express from 'express';
import bodyParser from 'body-parser';
import { verifyBlockSubmission } from '../src/block-verifier.mjs';

const app = express();
app.use(bodyParser.json());

// Minimal prototype endpoint to verify block header + signature
app.post('/v1/blocks/submit', (req, res) => {
  try {
    const { header, txs, signature, publicKey } = req.body || {};
    const result = verifyBlockSubmission({ header, txs, signature, publicKeyPem: publicKey });
    if (!result.ok) return res.status(400).json({ ok: false, error: result.reason, details: result });
    return res.json({ ok: true, message: 'header verified' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const PORT = process.env.PORT || 4200;
  app.listen(PORT, () => console.log(`prototype NS-verify server listening on ${PORT}`));
}

export { app };
