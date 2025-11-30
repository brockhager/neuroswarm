(async function(){
  // Integration smoke tests for the prototype embedding backend
  const port = process.env.PORT || 5555;
  // Start server (index.js exports `server` and auto-starts on import)
  const serverModule = await import('./index.js');
  const server = serverModule.server;
  const base = `http://127.0.0.1:${port}`;
  
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Give server a moment to start
  await wait(100);

  try {
    console.log('POST /embed -> short text');
    let res = await fetch(base + '/embed', { method: 'POST', headers: {'Content-Type':'application/json', 'Connection': 'close'}, body: JSON.stringify({text: 'hello world'}) });
    console.log('status', res.status);
    let json = await res.json();
    console.log('embedding length', json.embedding.length, 'tokens', json.tokens, 'model', json.model);

    console.log('GET /health');
    res = await fetch(base + '/health', { headers: { 'Connection': 'close' } });
    console.log('status', res.status, 'body', await res.json());

    console.log('GET /metrics');
    res = await fetch(base + '/metrics', { headers: { 'Connection': 'close' } });
    console.log('status', res.status, 'body', await res.json());

    console.log('POST /embed -> long text');
    const longText = 'word '.repeat(200); // larger input
    res = await fetch(base + '/embed', { method: 'POST', headers: {'Content-Type':'application/json', 'Connection': 'close'}, body: JSON.stringify({text: longText}) });
    console.log('status', res.status);
    json = await res.json();
    console.log('embedding length', json.embedding.length, 'tokens', json.tokens);

    console.log('\nIntegration checks passed (prototype OK)');
    // Close the server cleanly before exiting to avoid libuv async handle assertions on Windows
    try {
      await new Promise((resolve) => server.close(() => resolve()));
    } catch (e) {
      // ignore errors during close — we still want a successful exit
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
    try { await new Promise((resolve) => server && server.close(() => resolve())); } catch (e) {}
    try {
      const handles = process._getActiveHandles ? process._getActiveHandles() : [];
      console.log('diagnostic (on error): activeHandles=', handles.map(h => h && h.constructor && h.constructor.name));
    } catch (e) {}
    process.exit(2);
  }
})();
