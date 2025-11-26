#!/usr/bin/env node
import fetch from 'node-fetch';

const PORT = process.env.PORT || 3009;
const URL = `http://127.0.0.1:${PORT}/health`;

(async () => {
  console.log(`Checking NS Node health at ${URL} ...`);
  try {
    const r = await fetch(URL, { timeout: 5000 });
    if (!r.ok) {
      console.error(`Health endpoint returned HTTP ${r.status}`);
      process.exit(2);
    }
    const j = await r.json();
    if (!j.nsLlm) {
      console.error('FAIL: nsLlm field missing from /health response');
      console.error('Full /health response:', JSON.stringify(j, null, 2));
      process.exit(3);
    }

    console.log('nsLlm found in /health:', JSON.stringify(j.nsLlm, null, 2));
    if (j.nsLlm.available || j.nsLlm.status === 'healthy' || j.nsLlm.model) {
      console.log('PASS: NS-LLM appears healthy or present');
      process.exit(0);
    }

    console.warn('WARN: nsLlm present but not reporting healthy/available status');
    process.exit(1);
  } catch (err) {
    console.error('Error calling /health:', err.message || err);
    process.exit(4);
  }
})();
