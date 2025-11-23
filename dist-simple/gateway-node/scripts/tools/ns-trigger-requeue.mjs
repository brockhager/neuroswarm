#!/usr/bin/env node
import fetch from 'node-fetch';
import fs from 'fs';

// Usage: node scripts/tools/ns-trigger-requeue.mjs --ns http://localhost:3000 --gateway http://localhost:8080 --tx '{"type":"chat","fee":1,"content":"..."}'

const argv = process.argv.slice(2);
let ns = 'http://localhost:3000';
let gw = 'http://localhost:8080';
let tx = null;
let txFile = null;
for (let i=0;i<argv.length;i++){
  if (argv[i]==='--ns') ns = argv[++i];
  else if (argv[i]==='--gateway') gw = argv[++i];
  else if (argv[i]==='--tx') tx = JSON.parse(argv[++i]);
  else if (argv[i]==='--tx-file') txFile = argv[++i];
}
if (!tx && txFile) {
  const content = fs.readFileSync(txFile, 'utf8');
  tx = JSON.parse(content);
}
if (!tx) {
  console.error('tx JSON required via --tx or --tx-file');
  process.exit(2);
}

async function run(){
  console.log('Triggering requeue via NS debug endpoint...');
  // ensure debug requeue is enabled on NS (NS_ALLOW_REQUEUE_SIM=true)
  const res = await fetch(ns + '/debug/requeue', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({ txs: [tx] }) });
  if (!res.ok) {
    console.error('NS debug requeue failed', res.status, await res.text());
    process.exit(3);
  }
  const j = await res.json();
  console.log('NS debug requeue response:', j);
  // now verify gateway mempool contains tx again
  const g = await fetch(gw + '/v1/mempool');
  const o = await g.json();
  const found = (o.mempool || []).find(e => e.payload && e.payload.content === tx.content);
  if (!found) { console.error('tx not found in gateway mempool after requeue'); process.exit(4); }
  console.log('tx found in gateway mempool:', found.txId || found.id);
  process.exit(0);
}

run().catch(e=>{ console.error('error', e.message); process.exit(99); });
