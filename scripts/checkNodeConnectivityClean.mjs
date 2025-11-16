#!/usr/bin/env node
/* Simple connectivity check for ns-node and gateway endpoints (clean script) */
const { argv } = process;

function parseArgs() {
  const args = argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--ns') opts.ns = args[++i];
    else if (a === '--gateway') opts.gateway = args[++i];
    else if (a === '--timeout') opts.timeout = Number(args[++i]);
    else if (a === '--ci') opts.ci = true;
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
  // For CI usage, set non-zero exit code if any check failed
  if (opts.ci) {
    const failed = results.some(r => {
      const v = Object.values(r)[0];
      if (!v) return true;
      if (v.ok === false) return true;
      if (typeof v === 'object' && 'ok' in v) return !v.ok;
      return false;
    });
    if (failed) {
      console.error('One or more connectivity checks failed; exiting with non-zero code for CI.');
      process.exit(1);
    }
  }
}

main().catch(e => { console.error('checkNodeConnectivity failed', e); process.exit(1); });
