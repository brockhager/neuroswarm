#!/usr/bin/env node
import fetch from 'node-fetch';

const PORT = process.env.PORT || 3009;
const URL = `http://127.0.0.1:${PORT}/embed`;

(async () => {
  console.log(`E2E embed test → POST ${URL}`);
  try {
    // Print current node / backend version for traceability
    try {
      const verResp = await fetch(`http://127.0.0.1:${PORT}/health`, { timeout: 3000 });
      if (verResp.ok) {
        const verJ = await verResp.json().catch(() => null);
        if (verJ && verJ.version) console.log('Server version:', verJ.version);
        if (verJ && verJ.nsLlm && verJ.nsLlm.version) console.log('NS-LLM backend version:', verJ.nsLlm.version);
        if (process.env.EXPECT_VERSION && verJ && verJ.version) {
          if (String(verJ.version).trim() !== String(process.env.EXPECT_VERSION).trim()) {
            console.error('FAIL: server version does not match EXPECT_VERSION');
            process.exit(8);
          }
        }
      }
    } catch (e) {
      // ignore
    }
    const body = { text: 'The quick brown fox jumps over the lazy dog' };
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      console.error('Embed endpoint returned HTTP', res.status);
      const txt = await res.text().catch(() => '<no-body>');
      console.error('Response body:', txt);
      process.exit(2);
    }
    const j = await res.json();
    if (!j.embedding || !Array.isArray(j.embedding)) {
      console.error('FAIL: embedding missing or invalid:', j);
      process.exit(3);
    }

    const expected = Number(process.env.EMBED_DIMS || 384);
    const dims = j.dimensions || j.embedding.length;
    console.log(`Embedding length reported: ${dims} (expected ${expected})`);
    if (dims !== expected) {
      if (process.env.STRICT_EMBED_DIM === '1') {
        console.error(`FAIL: embedding dimensions ${dims} !== expected ${expected} (STRICT_EMBED_DIM=1)`);
        process.exit(6);
      }
      console.warn(`WARN: embedding dimensions expected ${expected} but got ${dims}`);
    }

    if (!j.model) {
      console.warn('WARN: model field missing from embed response');
    }

    if (typeof j.latency_ms === 'undefined') {
      console.warn('WARN: latency_ms not provided');
    }

    // Optional numeric range assertions
    if (process.env.CHECK_EMBED_RANGE === '1') {
      const min = Number(process.env.EMBED_MIN || -100);
      const max = Number(process.env.EMBED_MAX || 100);
      let outOfRange = false;
      for (const v of j.embedding) {
        if (typeof v !== 'number' || Number.isNaN(v) || v < min || v > max) { outOfRange = true; break; }
      }
      if (outOfRange) {
        const msg = `Embedding values fell outside allowed range [${min},${max}]`;
        if (process.env.STRICT_EMBED_RANGE === '1') {
          console.error('FAIL:', msg);
          process.exit(7);
        }
        console.warn('WARN:', msg);
      }
    }

    console.log('PASS: embed response looks valid');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(5);
  }
})();
