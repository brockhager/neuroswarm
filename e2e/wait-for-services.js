#!/usr/bin/env node
/**
 * wait-for-services.js
 * Polls a set of service health endpoints until all respond 200/OK or until timeout.
 * Designed to be used in local dev and CI before launching Playwright e2e tests.
 *
 * Usage:
 *   node e2e/wait-for-services.js --urls=http://localhost:3009/health,http://localhost:8080/health --timeout=300000 --interval=5000
 */

const http = require('http');
const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
            json = JSON.parse(body);
          }
        } catch (e) { /* ignore */ }
        resolve({ code: res.statusCode, json });
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

async function waitForAll(urls, timeout = 300000, interval = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    let ok = true;
    for (const url of urls) {
      try {
        const { code, json } = await get(url);
        if (code < 200 || code >= 300) {
          ok = false;
          // console.log(`Waiting for ${url} (status ${code})...`);
          break;
        }

        // Smart check for VP Node readiness (CN-06 FSM)
        // If the service exposes vp_state, we must wait for it to be ready.
        if (json && json.vp_state) {
          const readyStates = ['LISTENING_FOR_REVIEWS', 'PRODUCING_BLOCK'];
          if (!readyStates.includes(json.vp_state)) {
            console.log(`Waiting for VP Node ${url} to reach ready state (current: ${json.vp_state})...`);
            ok = false;
            break;
          }
        }
      } catch (err) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

async function main() {
  // Simple arg parsing — avoids external dependencies so it runs in CI without extra installs
  const args = process.argv.slice(2);
  const kv = {};
  for (const a of args) {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      kv[k] = v === undefined ? 'true' : v;
    }
  }
  const urlsArg = kv.urls || process.env.WAIT_URLS || process.env.HEALTH_URLS || '';
  const urls = urlsArg.split(',').map((s) => s.trim()).filter(Boolean);
  if (!urls.length) {
    console.error('No URLs provided. Use --urls or set WAIT_URLS or HEALTH_URLS');
    process.exit(2);
  }

  const timeout = parseInt(argv.timeout || process.env.WAIT_TIMEOUT || '300000', 10);
  const interval = parseInt(argv.interval || process.env.WAIT_INTERVAL || '5000', 10);

  console.log(`Waiting up to ${timeout}ms for ${urls.length} services: ${urls.join(', ')}`);
  const ok = await waitForAll(urls, timeout, interval);
  if (!ok) {
    console.error('Services did not become ready within timeout');
    process.exit(1);
  }
  console.log('All services ready');
  process.exit(0);
}

main().catch((err) => {
  console.error('wait-for-services error', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
