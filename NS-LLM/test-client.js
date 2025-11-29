(async function(){
  // Test ns-llm-client.js against the prototype server
  const { default: NsLlmClient } = await import('./ns-llm-client.js');
  // server auto-starts via importing index.js in this dir
  await import('./index.js');
  const client = new NsLlmClient({ baseUrl: 'http://127.0.0.1:5555', retries: 2, timeoutMs: 2000 });

  const wait = ms => new Promise(r => setTimeout(r, ms));
  await wait(100);

  try {
    console.log('health => ');
    const h = await client.health();
    console.log(h);

    console.log('embed => short');
    const e = await client.embed('hello world');
    console.log('dims', e.embedding.length, 'tokens', e.tokens);

    console.log('metrics => ');
    const m = await client.metrics();
    console.log(m);

    console.log('\nClient integration passed');
    process.exit(0);
  } catch (err) {
    console.error('client test failed', err);
    process.exit(3);
  }
})();
