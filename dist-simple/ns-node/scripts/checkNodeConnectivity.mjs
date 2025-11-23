#!/usr/bin/env node
// Simple connectivity check for ns-node and gateway endpoints
const { argv } = process;

function parseArgs() {
  const args = argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ns') opts.ns = args[++i];
    else if (a === '--gateway') opts.gateway = args[++i];
    else if (a === '--timeout') opts.timeout = Number(args[++i]);
  }
  opts.timeout = opts.timeout || 5000;
  return opts;
}

async function check(url, path = '/health', timeoutMs = 5000) {
  if (!url) return { ok: false, reason: 'no_url' };
  const full = url.replace(/\/$/, '') + path;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(full, { method: 'GET', signal: controller.signal });
    clearTimeout(t);
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: full, body };
  } catch (e) {
    return { ok: false, error: String(e), url: full };
  }
}

async function main() {
  const opts = parseArgs();
  const results = [];
  if (opts.ns) {
    results.push({ nsHealth: await check(opts.ns, '/health', opts.timeout) });
    results.push({ nsPeers: await check(opts.ns, '/debug/peers', opts.timeout) });
    results.push({ nsGateways: await check(opts.ns, '/debug/gateways', opts.timeout) });
  }
  if (opts.gateway) {
    results.push({ gwHealth: await check(opts.gateway, '/health', opts.timeout) });
    results.push({ gwPeers: await check(opts.gateway, '/debug/peers', opts.timeout) });
    results.push({ gwHistory: await check(opts.gateway, '/history', opts.timeout) });
  }
  if (opts.ns && opts.gateway) {
    try {
      const tx = { type: 'test', fee: 1, body: 'connectivity-test' };
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), opts.timeout);
      const res = await fetch(opts.gateway.replace(/\/$/, '') + '/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx), signal: controller.signal });
      clearTimeout(t);
      const j = await res.json();
      results.push({ gwFwd: { ok: res.ok, status: res.status, body: j } });
    } catch (e) {
      results.push({ gwFwd: { ok: false, error: String(e) } });
    }
  }
  console.log(JSON.stringify({ checked: opts, results }, null, 2));
}

main().catch(e => { console.error('checkNodeConnectivity failed', e); process.exit(1); });
#!/usr/bin/env node
import { argv } from 'process';

function parseArgs() {
  const args = argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ns') opts.ns = args[++i];
    else if (a === '--gateway') opts.gateway = args[++i];
    else if (a === '--timeout') opts.timeout = Number(args[++i]);
  }
  opts.timeout = opts.timeout || 5000;
  return opts;
}

async function check(url, path = '/health', timeoutMs = 5000) {
  if (!url) return { ok: false, reason: 'no_url' };
  const full = url.replace(/\/$/, '') + path;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(full, { method: 'GET', signal: controller.signal });
    clearTimeout(t);
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: full, body };
  } catch (e) {
    return { ok: false, error: String(e), url: full };
  }
}

async function main() {
  const opts = parseArgs();
  const results = [];
  if (opts.ns) {
    console.log('Checking ns-node:', opts.ns);
    results.push({ ns: await check(opts.ns, '/health', opts.timeout) });
    results.push({ nsPeers: await check(opts.ns, '/debug/peers', opts.timeout) });
    results.push({ nsGatewayDebug: await check(opts.ns, '/debug/gateways', opts.timeout) });
  }
  if (opts.gateway) {
    console.log('Checking gateway:', opts.gateway);
    results.push({ gateway: await check(opts.gateway, '/health', opts.timeout) });
    results.push({ gatewayPeers: await check(opts.gateway, '/debug/peers', opts.timeout) });
    results.push({ gatewayHistory: await check(opts.gateway, '/history', opts.timeout) });
  }
  if (opts.gateway && opts.ns) {
    console.log('Testing gateway->ns-node forward sample transaction');
    try {
      const tx = { type: 'test', fee: 1, body: 'connectivity-test' };
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), opts.timeout);
      const res = await fetch(opts.gateway.replace(/\/$/, '') + '/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx), signal: controller.signal });
      clearTimeout(t);
      const j = await res.json();
      console.log('gateway->ns forward result:', res.status, j);
      results.push({ gatewayForward: j });
    } catch (e) {
      console.log('gateway->ns forward error:', String(e));
      results.push({ gatewayForward: { ok: false, error: String(e) } });
    }
  }
  console.log('Connectivity check results:', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('checkNodeConnectivity failed:', e); process.exit(1); });
#!/usr/bin/env node
import { argv } from 'process';

function parseArgs() {
  const args = argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ns') opts.ns = args[++i];
    else if (a === '--gateway') opts.gateway = args[++i];
    else if (a === '--timeout') opts.timeout = Number(args[++i]);
  }
  opts.timeout = opts.timeout || 5000;
  return opts;
}

async function check(url, path = '/health', timeoutMs = 5000) {
  if (!url) return { ok: false, reason: 'no_url' };
  const full = url.replace(/\/$/, '') + path;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(full, { method: 'GET', signal: controller.signal });
    clearTimeout(t);
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: full, body };
  } catch (e) {
    return { ok: false, error: String(e), url: full };
  }
}

async function main() {
  const opts = parseArgs();
  const results = [];
  if (opts.ns) {
    console.log('Checking ns-node:', opts.ns);
    results.push({ ns: await check(opts.ns, '/health', opts.timeout) });
    results.push({ nsPeers: await check(opts.ns, '/debug/peers', opts.timeout) });
    results.push({ nsGatewayDebug: await check(opts.ns, '/debug/gateways', opts.timeout) });
  }
  if (opts.gateway) {
    console.log('Checking gateway:', opts.gateway);
    results.push({ gateway: await check(opts.gateway, '/health', opts.timeout) });
    results.push({ gatewayPeers: await check(opts.gateway, '/debug/peers', opts.timeout) });
    results.push({ gatewayHistory: await check(opts.gateway, '/history', opts.timeout) });
  }
  if (opts.gateway && opts.ns) {
    console.log('Testing gateway->ns-node forward sample transaction');
    try {
      const tx = { type: 'test', fee: 1, body: 'connectivity-test' };
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), opts.timeout);
      const res = await fetch(opts.gateway.replace(/\/$/, '') + '/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx), signal: controller.signal });
      clearTimeout(t);
      const j = await res.json();
      console.log('gateway->ns forward result:', res.status, j);
      results.push({ gatewayForward: j });
    } catch (e) {
      console.log('gateway->ns forward error:', String(e));
      results.push({ gatewayForward: { ok: false, error: String(e) } });
    }
  }
  console.log('Connectivity check results:', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('checkNodeConnectivity failed:', e); process.exit(1); });
#!/usr/bin/env node
import { argv } from 'process';

function parseArgs() {
  const args = argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ns') opts.ns = args[++i];
    else if (a === '--gateway') opts.gateway = args[++i];
    else if (a === '--timeout') opts.timeout = Number(args[++i]);
  }
  opts.timeout = opts.timeout || 5000;
  return opts;
}

async function check(url, path = '/health', timeoutMs = 5000) {
  if (!url) return { ok: false, reason: 'no_url' };
  const full = url.replace(/\/$/, '') + path;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(full, { method: 'GET', signal: controller.signal });
    clearTimeout(t);
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: full, body };
  } catch (e) {
    return { ok: false, error: String(e), url: full };
  }
}

async function main() {
  const opts = parseArgs();
  const results = [];
  if (opts.ns) {
    console.log('Checking ns-node:', opts.ns);
    results.push({ ns: await check(opts.ns, '/health', opts.timeout) });
    results.push({ nsPeers: await check(opts.ns, '/debug/peers', opts.timeout) });
    results.push({ nsGatewayDebug: await check(opts.ns, '/debug/gateways', opts.timeout) });
  }
  if (opts.gateway) {
    console.log('Checking gateway:', opts.gateway);
    results.push({ gateway: await check(opts.gateway, '/health', opts.timeout) });
    results.push({ gatewayPeers: await check(opts.gateway, '/debug/peers', opts.timeout) });
    results.push({ gatewayHistory: await check(opts.gateway, '/history', opts.timeout) });
  }
  if (opts.gateway && opts.ns) {
    console.log('Testing gateway->ns-node forward sample transaction');
    try {
      const tx = { type: 'test', fee: 1, body: 'connectivity-test' };
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), opts.timeout);
      const res = await fetch(opts.gateway.replace(/\/$/, '') + '/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx), signal: controller.signal });
      clearTimeout(t);
      const j = await res.json();
      console.log('gateway->ns forward result:', res.status, j);
      results.push({ gatewayForward: j });
    } catch (e) {
      console.log('gateway->ns forward error:', String(e));
      results.push({ gatewayForward: { ok: false, error: String(e) } });
    }
  }
  console.log('Connectivity check results:', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('checkNodeConnectivity failed:', e); process.exit(1); });
#!/usr/bin/env node
import fetch from 'node-fetch';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('ns', { type: 'string', description: 'ns-node URL (http://host:port)', demandOption: false })
  .option('gateway', { type: 'string', description: 'gateway URL (http://host:port)', demandOption: false })
  .option('timeout', { type: 'number', description: 'Timeout per request in ms', default: 5000 })
  .argv;

async function check(url, path = '/health', timeoutMs = 5000) {
  if (!url) return { ok: false, reason: 'no_url' };
  const full = url.replace(/\/$/, '') + path;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(full, { method: 'GET', signal: controller.signal });
    clearTimeout(t);
    return { ok: res.ok, status: res.status, url: full, body: await res.text() };
  } catch (e) {
    return { ok: false, error: String(e), url: full };
  }
}

async function main() {
  const results = [];
  if (argv.ns) {
    console.log('Checking ns-node:', argv.ns);
    results.push({ ns: await check(argv.ns, '/health', argv.timeout) });
    results.push({ nsPeers: await check(argv.ns, '/debug/peers', argv.timeout) });
    results.push({ nsGatewayDebug: await check(argv.ns, '/debug/gateways', argv.timeout) });
  }
  if (argv.gateway) {
    console.log('Checking gateway:', argv.gateway);
    results.push({ gateway: await check(argv.gateway, '/health', argv.timeout) });
    results.push({ gatewayPeers: await check(argv.gateway, '/debug/peers', argv.timeout) });
    results.push({ gatewayHistory: await check(argv.gateway, '/history', argv.timeout) });
  }
  // if both provided, test simple flow: gateway -> ns-node
  if (argv.gateway && argv.ns) {
    console.log('Testing gateway->ns-node forward sample transaction');
    try {
      const tx = { type: 'test', fee: 1, body: 'connectivity-test' };
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), argv.timeout);
      const res = await fetch(argv.gateway.replace(/\/$/, '') + '/v1/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx), signal: controller.signal });
      clearTimeout(t);
      const j = await res.json();
      console.log('gateway->ns forward result:', res.status, j);
      results.push({ gatewayForward: j });
    } catch (e) {
      console.log('gateway->ns forward error:', String(e));
      results.push({ gatewayForward: { ok: false, error: String(e) } });
    }
  }
  console.log('Connectivity check results:', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('checkNodeConnectivity failed:', e); process.exit(1); });
