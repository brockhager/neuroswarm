/*
NS-LLM Streaming Contract - minimal SSE demo

This lightweight server demonstrates the expected streaming contract for
`POST /api/generate-stream` used by Agent 9.

Usage:
  node ns_llm_streaming_contract.js [port]

Behavior:
- Accepts POST /api/generate-stream with JSON body: { text: string }
- Responds with Server-Sent Events (SSE) where each event contains a token JSON
  { token: string, idx: number }
- Sends final event `event: done` when complete

Note: This is a demo - production NS-LLM integrates with the native shim and real model.
*/

import http from 'http';
import { promisify } from 'util';

const PORT = process.env.PORT || process.argv[2] || 41234;

function sendSSE(res, event, data) {
  if (event) res.write(`event: ${event}\n`);
  // data must be sent as one or more `data: ` lines followed by a blank line
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  for (const line of json.split('\n')) {
    res.write(`data: ${line}\n`);
  }
  res.write('\n');
}

function simulateTokenize(text) {
  // naive tokenization for demo purposes
  const words = (text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['<empty>'];
  return words.map((w, i) => `${w}${i < words.length - 1 ? ' ' : ''}`);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && (req.url === '/api/generate-stream' || req.url === '/api/generate')) {
    let body = '';
    req.on('data', chunk => (body += chunk));
    await promisify(req.on.bind(req))('end');

    try {
      const payload = JSON.parse(body || '{}');
      const { text = '' } = payload;

      // If invoked via /api/generate on some clients, only treat as streaming when stream:true
      if (req.url === '/api/generate' && !payload.stream) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: (text || '').split(/\s+/).slice(0, 8).join(' '), tokens_generated: Math.max(1, (text || '').split(/\s+/).length) }));
        return;
      }

      // heartbeat headers for SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // send an initial notice
      sendSSE(res, 'meta', { model: 'ns-llm-proto-demo', received: text.length });

      const tokens = simulateTokenize(text || 'Hello from NS-LLM streaming demo!');

      // stream tokens at 150ms intervals
      for (let i = 0; i < tokens.length; i++) {
        await new Promise(r => setTimeout(r, 150));
        sendSSE(res, 'token', { token: tokens[i], idx: i });
      }

      // final completed message
      await new Promise(r => setTimeout(r, 80));
      sendSSE(res, 'done', { done: true, token_count: tokens.length });

      // close connection
      res.end();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid-body', message: err.message }));
    }

    return;
  }

  // simple index/help page
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('NS-LLM streaming demo: POST /api/generate-stream { text }');
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[ns-llm-demo] Listening on http://localhost:${PORT}`);
});

export default server;
