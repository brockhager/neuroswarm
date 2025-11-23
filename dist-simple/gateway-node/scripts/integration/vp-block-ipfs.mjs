#!/usr/bin/env node
import fetch from 'node-fetch';

// Usage: node scripts/integration/vp-block-ipfs.mjs --gateway http://localhost:8080 --ns http://localhost:3000 --vp http://localhost:4000 --timeout 30000

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
  const payload = { type: 'chat', fee: 1, content: `integration-ipfs-${Date.now()}` };
  console.log('Posting tx to gateway', gateway+'/v1/tx', payload);
  const p = await fetch(gateway + '/v1/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!p.ok) {
    console.error('POST to gateway failed:', p.status, await p.text());
    process.exit(2);
  }
  const j = await p.json();
  console.log('Gateway responded', j);

  // poll ns mempool for tx content
  const start = Date.now();
  const txContent = payload.content;
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(gateway + '/v1/mempool');
      if (res.ok) {
        const o = await res.json();
        const found = (o.mempool || []).find(e => (e.txId === j.txId || (e.payload && e.payload.content === txContent) || e.id === j.txId));
        if (found) {
          console.log('Found tx in gateway mempool:', found.id || found.txId || '(content match)');
          break;
        }
      }
    } catch (e) {}
    await sleep(1000);
  }

  // Poll ns blocks latest until header has payloadCid
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

  if (!payloadCid) {
    console.error('Timed out waiting for payloadCid on ns-node');
    process.exit(3);
  }

  // Ask ns to verify payload via producer (vp)
  console.log('Verifying payload cid via ns /ipfs/verify', payloadCid);
  const verifyRes = await fetch(ns + '/ipfs/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cid: payloadCid, producerUrl: vp }) });
  if (!verifyRes.ok) {
    console.error('NS verify failed:', verifyRes.status, await verifyRes.text());
    process.exit(4);
  }
  const verifyJson = await verifyRes.json();
  console.log('NS verify result:', verifyJson);
  if (!verifyJson.matches) {
    console.error('Payload verification mismatch (merkle root)');
    process.exit(5);
  }
  if (typeof verifyJson.signatureValid !== 'undefined' && !verifyJson.signatureValid) {
    console.error('Payload signature invalid');
    process.exit(5);
  }
  console.log('Integration test succeeded (vp->ipfs->ns verification)');
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(99); });
