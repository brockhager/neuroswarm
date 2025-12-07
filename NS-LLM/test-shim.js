import NativeShim from './native-shim.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async function(){
  // Integration test: native-shim should fall back to HTTP prototype when binary is missing
  // Ensure prototype server available (importing index starts the server)
  const mod = await import('./index.js');
  const { server } = mod;

  // Point to a deliberately-missing binary path to force fallback
  const notExists = path.join(__dirname, 'native', 'build', 'nonexistent-binary');
  const shim = new NativeShim({ binaryPath: notExists, prototypeUrl: 'http://127.0.0.1:5555' });

  try {
    console.log('calling shim.health() (should hit prototype)');
    const h = await shim.health();
    console.log('health', h);
    if (!h || typeof h.status !== 'string') throw new Error('health response missing status');

    console.log('calling shim.embed() with short text (should hit prototype)');
    const r = await shim.embed('hello shim');
    console.log('embed dims', r.embedding ? r.embedding.length : '(none)', 'tokens', r.tokens);
    if (!r) throw new Error('embed returned empty');
    if (Array.isArray(r.embedding)) {
      if (r.embedding.length !== 384) throw new Error('unexpected embedding dimensions: ' + r.embedding.length);
    } else if (!(r.model && (r.loaded === true || r.loaded === 'true'))) {
      throw new Error('embed response neither embedding nor loaded model info');
    }

    console.log('calling shim.metrics()');
    const m = await shim.metrics();
    console.log('metrics', m);
    if (!m || typeof m.requests_total !== 'number') throw new Error('metrics missing requests_total');

    // Try to close the in-process prototype server cleanly before exiting
    try {
      await new Promise((res, rej) => server.close((err) => err ? rej(err) : res()));
      // small pause to allow sockets to finish closing on Windows
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      // best-effort: ignore close errors
    }
    console.log('\nShim fallback tests passed');
    process.exit(0);
  } catch (err) {
    console.error('shim test failed', err);
    try { await new Promise((res, rej) => server.close((err) => err ? rej(err) : res())); } catch (e) {}
    await new Promise(r => setTimeout(r, 150));
    process.exit(2);
  }
})();
