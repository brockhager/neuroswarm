#!/usr/bin/env node
import fetch from 'node-fetch';

// Usage: node scripts/integration/sources-allie.mjs --gateway http://localhost:8080 --ns http://localhost:3000 --vp http://localhost:4000 --timeout 30000

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

async function runPositiveTest(){
  console.log('Positive test: Allie adapter + block production + sources verification');
  const payload = { type: 'sample', fee: 2, content: `sources-allie-${Date.now()}`, sourcesRequired: ['allie-price'], sourceParams: { coin: 'bitcoin' } };
  const p = await fetch(gateway + '/v1/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!p.ok) throw new Error(`POST to gateway failed ${p.status}`);
  const j = await p.json();
  console.log('Gateway responded', j);
  const start = Date.now();
  let found = null;
  while (Date.now() - start < timeout) {
    const res = await fetch(gateway + '/v1/mempool');
    if (res.ok) {
      const o = await res.json();
      found = (o.mempool || []).find(e => e.txId === j.txId || (e.payload && e.payload.content === payload.content));
      if (found) break;
    }
    await sleep(1000);
  }
  if (!found) throw new Error('tx not found in mempool');
  console.log('Found mempool tx:', found.txId);
  const memTx = found.payload || found.tx || {};
  if (!memTx.sources || !Array.isArray(memTx.sources)) throw new Error('No sources metadata attached');
  if (!memTx.sourcesVerified) throw new Error('Sources were not verified by gateway');
  console.log('Gateway attached sources:', memTx.sources);

  // Wait for VP to produce a block with payload cid
  const start2 = Date.now();
  let payloadCid = null;
  while (Date.now() - start2 < timeout) {
    const res = await fetch(ns + '/blocks/latest');
    if (res.ok) {
      const o = await res.json();
      if (o && o.block && o.block.header && (o.block.header.payloadCid || o.block.header.cid)) {
        payloadCid = o.block.header.payloadCid || o.block.header.cid;
        break;
      }
    }
    await sleep(1000);
  }
  if (!payloadCid) throw new Error('No payloadCid found in latest blocks');
  const verify = await fetch(ns + '/ipfs/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cid: payloadCid, producerUrl: vp }) });
  if (!verify.ok) throw new Error(`ns ipfs verify failed ${verify.status}`);
  const vj = await verify.json();
  console.log('verify result:', vj);
  if (!vj.matches) throw new Error('merkle root mismatch');
  if (typeof vj.sourcesValid !== 'undefined' && !vj.sourcesValid) throw new Error('sourcesValid false');
  console.log('Positive test passed: sourcesValid true');
}

async function runNegativeTest(){
  console.log('Negative test: tamper with sourcesRoot in ipfs payload and verify NS detects mismatch');
  // get latest payload cid from ns
  const latest = await (await fetch(ns + '/blocks/latest')).json();
  const payloadCid = latest && latest.block && (latest.block.header && (latest.block.header.payloadCid || latest.block.header.cid));
  if (!payloadCid) throw new Error('no payloadCid found for negative test');
  console.log('Using payloadCid', payloadCid);
  // fetch from VP raw ipfs content
  const fetched = await fetch(vp.replace(/\/$/, '') + '/ipfs/' + payloadCid);
  if (!fetched.ok) throw new Error('vp ipfs fetch failed');
  const body = await fetched.json();
  const payloadContent = body && body.content ? body.content : null;
  if (!payloadContent) throw new Error('invalid payload content');
  // modify header.sourcesRoot to a wrong value but keep txs unchanged
  const bad = JSON.parse(JSON.stringify(payloadContent));
  bad.header = bad.header || {};
  bad.header.sourcesRoot = '0'.repeat(64);
  // post to VP ipfs: POST /ipfs
  const add = await fetch(vp.replace(/\/$/, '') + '/ipfs', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(bad) });
  if (!add.ok) throw new Error('vp ipfs add failed for tampered payload');
  const addj = await add.json();
  const badCid = addj && addj.cid;
  console.log('Tampered payload uploaded to IPFS cid', badCid);
  // Now ask ns to verify this invalid payload
  const verify = await fetch(ns + '/ipfs/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ cid: badCid, producerUrl: vp }) });
  if (!verify.ok) throw new Error(`ns ipfs verify failed for tampered ${verify.status}`);
  const vj = await verify.json();
  console.log('verify tampered result:', vj);
  if (vj.sourcesValid === true) throw new Error('tampered sources incorrectly reported as valid');
  console.log('Negative test passed: sourcesValid false as expected');
}

async function runAll(){
  await runPositiveTest();
  await runNegativeTest();
}

runAll().then(()=>{ console.log('All tests passed'); process.exit(0); }).catch(e=>{ console.error('Test failed:', e.message); process.exit(1); });
