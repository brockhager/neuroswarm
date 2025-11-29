(async function(){
  // Integration smoke tests for the prototype embedding backend
  const port = process.env.PORT || 5555;
  // Start server (index.js auto-starts on import)
  await import('./index.js');
  const base = `http://127.0.0.1:${port}`;
  
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Give server a moment to start
  await wait(100);

  try {
    console.log('POST /embed -> short text');
    let res = await fetch(base + '/embed', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({text: 'hello world'}) });
    console.log('status', res.status);
    let json = await res.json();
    console.log('embedding length', json.embedding.length, 'tokens', json.tokens, 'model', json.model);

    console.log('GET /health');
    res = await fetch(base + '/health');
    console.log('status', res.status, 'body', await res.json());

    console.log('GET /metrics');
    res = await fetch(base + '/metrics');
    console.log('status', res.status, 'body', await res.json());

    console.log('POST /embed -> long text');
    const longText = 'word '.repeat(200); // larger input
    res = await fetch(base + '/embed', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({text: longText}) });
    console.log('status', res.status);
    json = await res.json();
    console.log('embedding length', json.embedding.length, 'tokens', json.tokens);

    console.log('\nIntegration checks passed (prototype OK)');
    process.exit(0);
  } catch (err) {
    console.error('integration test failed', err);
    process.exit(2);
  }
})();
