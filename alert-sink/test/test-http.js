const http = require('http');
const assert = require('assert');
const { app } = require('..');

// Start transient server on ephemeral port to exercise HTTP routes
(async () => {
  console.log('Running alert-sink HTTP tests...');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const get = (path) => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port, path, timeout: 2000 }, res => {
      let body = '';
      res.on('data', c => body += c.toString());
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });

  try {
    const root = await get('/');
    assert.strictEqual(root.status, 200, 'GET / should return 200');
    assert.ok(root.body.includes('NeuroSwarm Alert Sink'), 'root page should include service title');

    const health = await get('/health');
    assert.strictEqual(health.status, 200, 'GET /health should return 200');
    const payload = JSON.parse(health.body);
    assert.ok(typeof payload.ok === 'boolean', 'health JSON should have ok boolean');

    console.log('Alert-sink HTTP tests passed.');
  } catch (err) {
    console.error('Alert-sink HTTP tests failed:', err);
    process.exit(1);
  } finally {
    server.close();
  }

})();
