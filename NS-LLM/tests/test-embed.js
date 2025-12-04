/*
  Integration test: POST /api/embed
  Spawns NS-LLM server and verifies embedding response.
*/
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import http from 'http';

const serverPath = fileURLToPath(new URL('../server.js', import.meta.url));
const PORT = process.env.PORT || 6003;

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

    const payload = JSON.stringify({ text: 'embed me' });

    const res = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/api/embed', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (r) => {
        let buf = '';
        r.setEncoding('utf8');
        r.on('data', c => buf += c);
        r.on('end', () => resolve({ status: r.statusCode, body: buf }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (res.status !== 200) {
      console.error('embed non-200', res.status, res.body);
      throw new Error('embed failed');
    }

    const json = JSON.parse(res.body);
    if (!json.embedding || !Array.isArray(json.embedding)) throw new Error('unexpected embed response');

    console.log('embed ok len=', json.embedding.length);
    proc.kill('SIGINT');
    await new Promise(r => proc.on('exit', r));
    process.exit(0);
  } catch (err) {
    try { proc.kill('SIGINT'); } catch (e) {}
    console.error('test failed', err && err.message);
    process.exit(2);
  }
}

run();
