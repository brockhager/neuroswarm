#!/usr/bin/env node
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

function usage() {
  console.log('Usage: node scripts/integration/gateway-to-ns.mjs --gateway http://localhost:8080 --ns http://localhost:3000 --timeout 20000');
}

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
  const payload = { type: 'chat', fee: 1, content: `integration-test-${Date.now()}` };
  console.log('Posting tx to gateway', gateway+'/v1/tx', payload);
  const p = await fetch(gateway + '/v1/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!p.ok) {
    console.error('POST to gateway failed:', p.status, await p.text());
    process.exit(2);
  }
  const j = await p.json();
  console.log('Gateway responded', j);
  const txId = j && j.fwd && j.fwd.txId || j.txId || null;
  // Poll the NS mempool for the tx
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(ns + '/mempool');
      if (res.ok) {
        const o = await res.json();
        const found = (o.mempool || []).find(e => e.tx && (e.tx.txId === txId || e.tx.content === payload.content || e.id === txId));
        if (found) {
          console.log('Found tx in ns-node mempool:', found.id || '(content match)');
          console.log('Integration test succeeded');
          process.exit(0);
        }
      }
    } catch (e) {
      // ignore
    }
    await sleep(1000);
  }
  console.error('Timed out waiting for tx to appear on ns-node mempool');
  process.exit(3);
}

run().catch(e=>{ console.error(e); process.exit(4); });
