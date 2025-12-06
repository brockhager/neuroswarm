(async function () {
  // Integration smoke tests for the prototype embedding backend
  const port = process.env.PORT || 5555;
  // Start the server in a child process to isolate socket lifecycle and avoid
  // libuv handle assertions when the test runner exits on Windows.
  const { spawn } = await import('child_process');
  const { fileURLToPath } = await import('url');
  const path = await import('path');
  const serverPath = fileURLToPath(new URL('./index.js', import.meta.url));
  const cwd = path.dirname(serverPath);
  // Use `node` from PATH which works in CI / dev boxes (process.execPath sometimes
  // isn't directly spawnable in some Windows sandboxes).
  const serverProc = spawn('node', [serverPath], {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Wait for the child to announce it's listening
  await new Promise((resolve, reject) => {
    const onData = (d) => {
      const s = String(d);
      if (s.includes('ns-llm-prototype listening')) {
        serverProc.stdout.off('data', onData);
        resolve();
      }
    };
    serverProc.stdout.on('data', onData);
    serverProc.on('error', reject);
    // safety timeout
    setTimeout(() => reject(new Error('server start timeout')), 2000);
  });
  const base = `http://127.0.0.1:${port}`;

  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Give server a moment to start
  await wait(100);

  try {
    console.log('POST /api/embed -> short text');
    let res = await fetch(base + '/api/embed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Connection': 'close' }, body: JSON.stringify({ text: 'hello world' }) });
    console.log('status', res.status);
    let json = await res.json();
    console.log('embedding length', json.embedding.length, 'tokens', json.tokens, 'model', json.model);

    console.log('GET /health');
    res = await fetch(base + '/health', { headers: { 'Connection': 'close' } });
    console.log('status', res.status, 'body', await res.json());

    console.log('GET /metrics');
    res = await fetch(base + '/metrics', { headers: { 'Connection': 'close' } });
    console.log('status', res.status, 'body', await res.json());

    console.log('POST /api/embed -> long text');
    const longText = 'word '.repeat(200); // larger input
    res = await fetch(base + '/api/embed', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Connection': 'close' }, body: JSON.stringify({ text: longText }) });
    console.log('status', res.status);
    json = await res.json();
    console.log('embedding length', json.embedding.length, 'tokens', json.tokens);

    console.log('\nIntegration checks passed (prototype OK)');
    // Tell the server child process to shut down (SIGINT), then wait for exit
    try {
      serverProc.kill('SIGINT');
      await new Promise((res) => serverProc.on('exit', () => res()));
    } catch (e) {
      // best-effort; ignore
    }

    // Diagnostic: list active handles/requests to detect any lingering handles on Windows
    try {
      const handles = process._getActiveHandles ? process._getActiveHandles() : [];
      const reqs = process._getActiveRequests ? process._getActiveRequests() : [];
      console.log('diagnostic: activeHandles=', handles.map(h => h && h.constructor && h.constructor.name));
      console.log('diagnostic: activeRequests=', reqs.map(r => r && r.constructor && r.constructor.name));
    } catch (e) {
      console.log('diagnostic inspect failed', e && e.message);
    }
    process.exit(0);
  } catch (err) {
    console.error('integration test failed', err);
    try { serverProc.kill('SIGINT'); await new Promise((res) => serverProc.on('exit', () => res())); } catch (e) { }
    try {
      const handles = process._getActiveHandles ? process._getActiveHandles() : [];
      console.log('diagnostic (on error): activeHandles=', handles.map(h => h && h.constructor && h.constructor.name));
    } catch (e) { }
    process.exit(2);
  }
})();
