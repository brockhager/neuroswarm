#!/usr/bin/env node
import fetch from 'node-fetch';

// Usage: node scripts/integration/gateway-sources-policy.mjs --gateway http://localhost:8080
const argv = process.argv.slice(2); let gateway = 'http://localhost:8080';
for (let i=0;i<argv.length;i++){ if (argv[i]==='--gateway') gateway = argv[++i]; }

async function run(){
  const many = ['allie-price','allie-eth','allie-weather','allie-news','allie-oracle','coingecko'];
  const tx = { type: 'sample', fee: 1, content: 'policy-test', sourcesRequired: many };
  const r = await fetch(gateway + '/v1/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(tx) });
  if (r.status === 400) {
    console.log('Gateway rejected tx due to too many sources as expected');
    process.exit(0);
  }
  const j = await r.json().catch(()=>null);
  console.error('Gateway did not reject tx; returned', r.status, j);
  process.exit(1);
}

run().catch(e=>{ console.error(e); process.exit(2); });
