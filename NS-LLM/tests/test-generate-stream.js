/*
  Integration test: POST /api/generate (streaming)
  Spawns NS-LLM server and verifies it returns SSE events for stream:true.
*/
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';

const serverPath = fileURLToPath(new URL('../server.js', import.meta.url));
const PORT = process.env.PORT || 6002;

async function waitForStart(proc) {
  return new Promise((resolve, reject) => {
    const onData = d => {
      const s = String(d);
      if (s.includes('Listening on port')) {
        proc.stdout.off('data', onData);
        resolve();
      }
    };
    proc.stdout.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => reject(new Error('server start timeout')), 3000);
  });
}

async function run() {
  const proc = spawn('node', [serverPath], {
    env: { ...process.env, PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForStart(proc);

    const payload = JSON.stringify({ text: 'stream test tokens', stream: true });

    await new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/generate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res) => {
        if (res.statusCode !== 200) return reject(new Error('non-200 status ' + res.statusCode));

        let buf = '';
        const tokens = [];
        res.setEncoding('utf8');

        res.on('data', chunk => {
          buf += chunk;
          // process all complete SSE events (delimited by \n\n)
          while (true) {
            const idx = buf.indexOf('\n\n');
            if (idx === -1) break;
            const raw = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 2);
            // parse
            const lines = raw.split('\n');
            let event = 'message';
            let dataLines = [];
            for (const l of lines) {
              const m = l.match(/^event:\s*(.+)$/);
              if (m) { event = m[1]; continue; }
              const md = l.match(/^data:\s*(.*)$/);
              if (md) dataLines.push(md[1]);
            }
            const data = dataLines.join('\n');
            let parsed = null;
            try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
            if (event === 'token') {
              tokens.push(parsed.token || parsed);
            }
            if (event === 'done') {
              // done - validations
              if (tokens.length === 0) return reject(new Error('no tokens received'));
              // cleanup and success
              req.destroy();
              return resolve();
            }
          }
        });

        res.on('end', () => {
          // Sometimes stream ends without explicit done event; accept tokens > 0
          if (buf.length && buf.includes('done')) return resolve();
          reject(new Error('stream ended without done event'));
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    proc.kill('SIGINT');
    await new Promise(r => proc.on('exit', r));
    console.log('generate-stream OK');
    process.exit(0);
  } catch (err) {
    try { proc.kill('SIGINT'); } catch (e) {}
    console.error('stream test failed', err && err.message);
    process.exit(2);
  }
}

run();
