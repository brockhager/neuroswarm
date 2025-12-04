/*
Agent 9 streaming client demo (Node.js)

This client demonstrates how Agent 9 can consume the NS-LLM `POST /api/generate` SSE contract (stream:true).
It connects, prints tokens as they arrive and closes when it receives the `done` event.

Usage:
  node agent9_streaming_client.js <endpoint>

e.g.
  node agent9_streaming_client.js http://localhost:41234/api/generate
*/

import http from 'http';
import https from 'https';
import { URL } from 'url';

async function run(endpoint, text = 'Hello Agent 9 streaming client test') {
  if (!endpoint) {
    console.error('Usage: node agent9_streaming_client.js <endpoint>');
    process.exit(1);
  }

  const u = new URL(endpoint);
  const payload = JSON.stringify({ text, stream: true });

  const opts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const client = u.protocol === 'https:' ? https : http;

  const req = client.request(u, opts, res => {
    if (res.statusCode !== 200) {
      console.error('Non-200 response', res.statusCode);
      res.resume();
      return;
    }

    res.setEncoding('utf8');

    let buffer = '';

    res.on('data', chunk => {
      buffer += chunk;

      // SSE events are delimited by double-newline
      while (true) {
        const idx = buffer.indexOf('\n\n');
        if (idx === -1) break;
        const raw = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        parseSSE(raw);
      }
    });

    res.on('end', () => {
      console.log('\n[client] stream ended');
    });
  });

  req.on('error', (err) => console.error('Request error:', err));
  req.write(payload);
  req.end();

  function parseSSE(raw) {
    // raw contains one or more 'data: ' lines and optionally an 'event: ' line
    const lines = raw.split('\n');
    let event = 'message';
    let dataLines = [];

    for (const l of lines) {
      const m = l.match(/^event:\s*(.+)$/);
      if (m) { event = m[1]; continue; }
      const md = l.match(/^data:\s*(.*)$/);
      if (md) dataLines.push(md[1]);
    }

    const dataStr = dataLines.join('\n');
    let parsed = null;
    try { parsed = JSON.parse(dataStr); } catch (e) { parsed = dataStr; }

    if (event === 'meta') {
      console.log('[client][meta]', parsed);
      return;
    }

    if (event === 'token') {
      process.stdout.write(parsed.token);
      return;
    }

    if (event === 'done') {
      console.log('\n[client] done:', parsed);
      return;
    }

    console.log('[client][', event, ']', parsed);
  }
}

// CLI
  const arg = process.argv[2] || 'http://localhost:41234/api/generate';
run(arg).catch(e => console.error(e));
