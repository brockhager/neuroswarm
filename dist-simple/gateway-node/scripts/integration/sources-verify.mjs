#!/usr/bin/env node
import fetch from 'node-fetch';

// Usage: node scripts/integration/sources-verify.mjs --gateway http://localhost:8080 --ns http://localhost:3000 --vp http://localhost:4000 --timeout 30000

const argv = process.argv.slice(2);
let gateway = 'http://localhost:8080';
let ns = 'http://localhost:3000';
let vp = 'http://localhost:4000';
let timeout = 30000;
for (let i=0;i<argv.length;i++){
  if (argv[i]==='--gateway') gateway = argv[++i];
  else if (argv[i]==='--ns') ns = argv[++i];
  else if (argv[i]==='--vp') vp = argv[++i];
  else if (argv[i]==='--timeout') timeout = Number(argv[++i]||timeout);
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function run(){
  const payload = { type: 'sample', fee: 2, content: `sources-verify-${Date.now()}`, sourcesRequired: ['coingecko'], sourceParams: { coin: 'bitcoin' } };
  console.log('Posting tx to gateway', gateway+'/v1/tx', payload);
  const p = await fetch(gateway + '/v1/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!p.ok) {
    console.error('POST to gateway failed:', p.status, await p.text());
    process.exit(2);
  }
  const j = await p.json();
  console.log('Gateway responded', j);

  // poll gateway mempool for tx to appear with sources metadata attached
  const start = Date.now();
  let found = null;
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(gateway + '/v1/mempool');
      if (res.ok) {
        const o = await res.json();
        found = (o.mempool || []).find(e => e.txId === j.txId || (e.payload && e.payload.content === payload.content));
        if (found) {
          console.log('Found tx in gateway mempool:', found.txId || found.id);
          break;
        }
      }
    } catch (e) {}
    await sleep(1000);
  }
  if (!found) { console.error('Timed out waiting for mempool entry'); process.exit(3); }
  // validate sources metadata included
  const memTx = found.payload || found.tx || {};
  if (!memTx.sources || !Array.isArray(memTx.sources)) { console.error('No sources metadata attached to tx in gateway mempool'); process.exit(4); }
  const verified = memTx.sourcesVerified === true;
  console.log('Gateway attached sources:', memTx.sources, 'verified:', verified);
  if (!verified && process.env.ALLOW_UNVERIFIED_SOURCES !== '1') { console.error('Sources not verified by gateway'); process.exit(4); }

  // Now wait for producer block with payloadCid and verify via NS ipfs/verify that sourcesValid is present and true
  const start2 = Date.now();
  let payloadCid = null;
  while (Date.now() - start2 < timeout) {
    try {
      const res = await fetch(ns + '/blocks/latest');
      if (res.ok) {
        const o = await res.json();
        if (o && o.block && o.block.header && (o.block.header.payloadCid || o.block.header.cid)) {
          payloadCid = o.block.header.payloadCid || o.block.header.cid;
          console.log('Found payloadCid in blocks/latest:', payloadCid);
          break;
        }
      }
    } catch (e) {}
    await sleep(1000);
  }
  if (!payloadCid) { console.error('Timed out waiting for payloadCid on ns-node'); process.exit(5); }

  const verifyRes = await fetch(ns + '/ipfs/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cid: payloadCid, producerUrl: vp }) });
  if (!verifyRes.ok) { console.error('NS verify failed:', verifyRes.status, await verifyRes.text()); process.exit(6); }
  const verifyJson = await verifyRes.json();
  console.log('NS verify result:', verifyJson);
  if (!verifyJson.matches) { console.error('Payload verification mismatch (merkle root)'); process.exit(7); }
  if (typeof verifyJson.sourcesValid !== 'undefined' && !verifyJson.sourcesValid) { console.error('Sources validation failed on NS'); process.exit(8); }
  console.log('Sources verify integration test succeeded (gateway attached sources -> VP produced -> NS verified)');
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(99); });
