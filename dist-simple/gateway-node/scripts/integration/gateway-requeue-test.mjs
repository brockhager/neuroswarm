#!/usr/bin/env node
import fetch from 'node-fetch';

// Usage: node scripts/integration/gateway-requeue-test.mjs --gateway http://localhost:8080

const argv = process.argv.slice(2);
let gateway = 'http://localhost:8080';
for (let i=0;i<argv.length;i++){
  if (argv[i]==='--gateway') gateway = argv[++i];
}

async function run(){
  const payload = { type: 'chat', fee: 1, content: `requeue-test-${Date.now()}` };
  console.log('Posting tx to gateway', gateway + '/v1/tx');
  let p = await fetch(gateway + '/v1/tx', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!p.ok) { console.error('POST to gateway failed:', p.status, await p.text()); process.exit(2); }
  const j = await p.json();
  console.log('Gateway responded', j);
  // get mempool and identify tx
  let res = await fetch(gateway + '/v1/mempool');
  let o = await res.json();
  const found = (o.mempool || []).find(e => e.payload && e.payload.content === payload.content);
  if (!found) { console.error('tx not found in gateway mempool'); process.exit(3); }
  console.log('Found tx in gateway mempool:', found.txId || found.id || found);

  // consume it to simulate block consumption
  res = await fetch(gateway + '/v1/mempool/consume', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ids: [ found.txId ] }) });
  if (!res.ok) { console.error('consume failed', res.status); process.exit(4); }
  console.log('Consumed tx, checking mempool...');
  res = await fetch(gateway + '/v1/mempool'); o = await res.json();
  const found2 = (o.mempool || []).find(e => e.txId === found.txId);
  if (found2) { console.error('tx was not consumed'); process.exit(5); }
  console.log('tx removed from mempool after consume')

  // now requeue the tx via requeue endpoint
  console.log('Requeueing tx using /v1/mempool/requeue...');
  res = await fetch(gateway + '/v1/mempool/requeue', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ txs: [ payload ] }) });
  if (!res.ok) { console.error('requeue failed', res.status, await res.text()); process.exit(6); }
  const rj = await res.json(); console.log('Requeue response:', rj);
  res = await fetch(gateway + '/v1/mempool'); o = await res.json();
  const found3 = (o.mempool || []).find(e => e.payload && e.payload.content === payload.content);
  if (!found3) { console.error('tx not requeued'); process.exit(7); }
  console.log('tx requeued successfully!');
  process.exit(0);
}

run().catch(e=>{ console.error('error', e.message); process.exit(99); });
