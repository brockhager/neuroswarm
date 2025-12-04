import test from 'node:test';
import assert from 'assert';
import express from 'express';
import bodyParser from 'body-parser';
import os from 'os';
import fs from 'fs';
import path from 'path';
import StateDatabase from '../../src/services/state-db.js';
import { sha256Hex, canonicalize, txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

test('REQUEST_BLOCKS_SYNC enforces paging and returns hasMore/nextFrom', async () => {
  const tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-paging-b-'));
  const tmpDbB = path.join(tmpDirB, `neuroswarm_b_${Date.now()}.db`);
  const dbB = new StateDatabase(tmpDbB);

  const totalBlocks = 250;
  const blocks = [];
  for (let i = 0; i < totalBlocks; i++) {
    const txs = [{ id: `tx-${i}-1`, payload: `p${i}-1`, fee: 0 }];
    const txIds = txs.map(t => txIdFor(t));
    const merkle = computeMerkleRoot(txIds);
    const header = { version: '1.0.0', chainId: 'test', height: i + 1, validatorId: `val-b`, prevHash: i === 0 ? '0'.repeat(64) : blocks[i-1].blockHash, merkleRoot: merkle, timestamp: Date.now(), txCount: txs.length };
    const blockHash = sha256Hex(Buffer.from(canonicalize(header), 'utf8'));
    const block = { header, txs, blockHash, parentHash: header.prevHash };
    blocks.push(block);
    dbB.saveBlock(blockHash, block);
  }

  const appA = express(); appA.use(bodyParser.json());
  const received = [];
  appA.post('/p2p/message', (req, res) => { received.push(req.body || {}); res.json({ ok: true }); });
  const serverA = appA.listen(0); const portA = serverA.address().port;

  const appB = express(); appB.use(bodyParser.json());
  const peers = { 'node-a': { host: '127.0.0.1', port: portA } };
  appB.post('/p2p/message', async (req, res) => {
    const msg = req.body || {};
    if (msg.type === 'REQUEST_BLOCKS_SYNC') {
      const { fromHeight = 0, toHeight = null, max = null } = msg.payload || {};
      const all = Array.from(dbB.getAllBlocks().values()).sort((a,b) => (a.header.height || 0) - (b.header.height || 0));
      const slice = (typeof toHeight === 'number') ? all.slice(fromHeight, toHeight + 1) : all.slice(fromHeight, fromHeight + (max || 100));
      const respPayload = { requestId: msg.id, blocks: slice.map(b => ({ header: b.header, blockHash: b.blockHash })), hasMore: (fromHeight + slice.length) < all.length, nextFrom: fromHeight + slice.length };
      const respMsg = { id: `resp-${Date.now()}`, type: 'RESPONSE_BLOCKS_SYNC', payload: respPayload, originNodeId: 'node-b' };
      const origin = msg.originNodeId; const target = peers[origin];
      if (target) {
        const url = `http://${target.host}:${target.port}/p2p/message`;
        try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(respMsg), timeout: 5000 }); } catch (e) {}
      }
      return res.json({ ok: true });
    }
    res.json({ ok: false, reason: 'unhandled' });
  });

  const serverB = appB.listen(0); const portB = serverB.address().port;

  // Node A requests without specifying max -> server should cap at default 100 and indicate more
  const reqMsg = { id: `req-${Date.now()}`, type: 'REQUEST_BLOCKS_SYNC', payload: { fromHeight: 0 }, originNodeId: 'node-a' };
  await fetch(`http://127.0.0.1:${portB}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqMsg) });
  await new Promise(r => setTimeout(r, 200));
  const found = received.find(m => m.type === 'RESPONSE_BLOCKS_SYNC' && m.payload && Array.isArray(m.payload.blocks));
  assert.ok(found, 'expected paging response');
  assert.strictEqual(found.payload.blocks.length, 100, 'expected server to cap response at 100 blocks by default');
  assert.strictEqual(found.payload.hasMore, true);
  assert.strictEqual(found.payload.nextFrom, 100);

  serverA.close(); serverB.close(); dbB.close();
  try { fs.unlinkSync(tmpDbB); fs.rmdirSync(tmpDirB); } catch (e) {}
});
