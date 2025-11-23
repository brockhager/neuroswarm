#!/usr/bin/env node
import fetch from 'node-fetch';

// Usage: node scripts/integration/ns-to-gateway.mjs --ns http://localhost:3000 --gateway http://localhost:8080 --timeout 20000

const argv = process.argv.slice(2);
let gateway = 'http://localhost:8080';
let ns = 'http://localhost:3000';
let timeout = 20000;
for (let i=0;i<argv.length;i++){
  if (argv[i]==='--gateway') gateway = argv[++i];
  else if (argv[i]==='--ns') ns = argv[++i];
  else if (argv[i]==='--timeout') timeout = Number(argv[++i]||timeout);
}

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function run(){
  const payload = { type: 'chat', fee: 1, content: `integration-ns2gateway-${Date.now()}` };
  console.log('Posting tx to ns', ns+'/tx', payload);
  const p = await fetch(ns + '/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!p.ok) {
    console.error('POST to ns failed:', p.status, await p.text());
    process.exit(2);
  }
  const j = await p.json();
  console.log('NS responded', j);
  let txId = null;
  if (j && j.forwarded && Array.isArray(j.forwarded)) {
    for (const f of j.forwarded) { if (f && f.resp && f.resp.txId) { txId = f.resp.txId; break; } }
  }
  if (!txId) txId = j && j.txId || null;
  // Poll the gateway mempool for the tx (gateway owns the canonical mempool)
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(gateway + '/v1/mempool');
      if (res.ok) {
        const o = await res.json();
        const found = (o.mempool || []).find(e => (e.txId === txId || (e.payload && e.payload.content === payload.content)));
        if (found) {
          console.log('Found tx in gateway mempool:', found.id || found.txId || '(content match)');
          console.log('Integration test succeeded');
          process.exit(0);
        }
      }
    } catch (e) {
      // ignore
    }
    await sleep(1000);
  }
  console.error('Timed out waiting for tx to appear on gateway mempool');
  process.exit(3);
}

run().catch(e=>{ console.error(e); process.exit(4); });
