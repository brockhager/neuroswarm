import test from 'node:test';
import assert from 'assert';
import express from 'express';
import bodyParser from 'body-parser';
import os from 'os';
import fs from 'fs';
import path from 'path';
import StateDatabase from '../../src/services/state-db.js';
import { sha256Hex, canonicalize, txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

test('REQUEST_BLOCKS_SYNC anchor mismatch is rejected and responder returns ANCESTRY_MISMATCH', async () => {
  // Setup DB for node B with a few blocks
  const tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-b-'));
  const tmpDbB = path.join(tmpDirB, `neuroswarm_b_${Date.now()}.db`);
  const dbB = new StateDatabase(tmpDbB);

  const blocks = [];
  for (let i = 0; i < 3; i++) {
    const txs = [{ id: `tx-${i}-1`, payload: `p${i}-1`, fee: 0 }];
    const txIds = txs.map(t => txIdFor(t));
    const merkle = computeMerkleRoot(txIds);
    const header = { version: '1.0.0', chainId: 'test', height: i + 1, validatorId: `val-b`, prevHash: i === 0 ? '0'.repeat(64) : blocks[i-1].blockHash, merkleRoot: merkle, timestamp: Date.now(), txCount: txs.length };
    const blockHash = sha256Hex(Buffer.from(canonicalize(header), 'utf8'));
    const block = { header, txs, blockHash, parentHash: header.prevHash };
    blocks.push(block);
    dbB.saveBlock(blockHash, block);
  }

  // Start Node A to receive responses
  const appA = express();
  appA.use(bodyParser.json());
  const received = [];
  appA.post('/p2p/message', (req, res) => {
    received.push(req.body || {});
    res.json({ ok: true });
  });
  const serverA = appA.listen(0);
  const portA = serverA.address().port;

  // Start Node B to handle requests and send responses
  const appB = express();
  appB.use(bodyParser.json());
  const peers = { 'node-a': { host: '127.0.0.1', port: portA } };

  appB.post('/p2p/message', async (req, res) => {
    const msg = req.body || {};
    if (msg.type === 'REQUEST_BLOCKS_SYNC') {
      const { fromHeight = 0, toHeight = null, anchorPrevHash = null } = msg.payload || {};
      const all = Array.from(dbB.getAllBlocks().values()).sort((a,b) => (a.header.height || 0) - (b.header.height || 0));
      const slice = (typeof toHeight === 'number') ? all.slice(fromHeight, toHeight + 1) : all.slice(fromHeight);

      // If anchorPrevHash provided and mismatch, respond with ANCESTRY_MISMATCH
      if (anchorPrevHash && slice.length > 0) {
        const firstPrev = slice[0].header.prevHash;
        if (firstPrev !== anchorPrevHash) {
          const errPayload = { requestId: msg.id, error: 'ANCESTRY_MISMATCH', details: { expected: anchorPrevHash, found: firstPrev } };
          const errMsg = { id: `resp-${Date.now()}`, type: 'RESPONSE_BLOCKS_SYNC', payload: errPayload, originNodeId: 'node-b' };
          const origin = msg.originNodeId;
          const target = peers[origin];
          if (target) {
            const url = `http://${target.host}:${target.port}/p2p/message`;
            try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(errMsg), timeout: 5000 }); } catch (e) {}
          }
          return res.json({ ok: true });
        }
      }

      // otherwise normal response
      const respPayload = { requestId: msg.id, blocks: slice.map(b => ({ header: b.header, blockHash: b.blockHash })) };
      const respMsg = { id: `resp-${Date.now()}`, type: 'RESPONSE_BLOCKS_SYNC', payload: respPayload, originNodeId: 'node-b' };
      const origin = msg.originNodeId;
      const target = peers[origin];
      if (target) {
        const url = `http://${target.host}:${target.port}/p2p/message`;
        try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(respMsg), timeout: 5000 }); } catch (e) {}
      }

      return res.json({ ok: true });
    }
    res.json({ ok: false, reason: 'unhandled' });
  });

  const serverB = appB.listen(0);
  const portB = serverB.address().port;

  // Send a request with an intentionally wrong anchorPrevHash
  const wrongAnchor = 'deadbeef'.padEnd(64, '0');
  const reqMsg = { id: `req-${Date.now()}`, type: 'REQUEST_BLOCKS_SYNC', payload: { fromHeight: 0, toHeight: 2, anchorPrevHash: wrongAnchor }, originNodeId: 'node-a' };
  await fetch(`http://127.0.0.1:${portB}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqMsg) });

  // wait a bit for Node B to respond
  await new Promise(r => setTimeout(r, 200));

  const found = received.find(m => m.type === 'RESPONSE_BLOCKS_SYNC');
  assert.ok(found, 'expected an ancestry error response');
  assert.strictEqual(found.payload && found.payload.error, 'ANCESTRY_MISMATCH');

  // Now send request with correct anchor (first block prevHash should be genesis)
  const goodAnchor = blocks[0].header.prevHash;
  const reqMsg2 = { id: `req2-${Date.now()}`, type: 'REQUEST_BLOCKS_SYNC', payload: { fromHeight: 0, toHeight: 2, anchorPrevHash: goodAnchor }, originNodeId: 'node-a' };
  await fetch(`http://127.0.0.1:${portB}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqMsg2) });
  await new Promise(r => setTimeout(r, 200));
  const found2 = received.find(m => m.type === 'RESPONSE_BLOCKS_SYNC' && m.payload && Array.isArray(m.payload.blocks));
  assert.ok(found2, 'expected a valid response with blocks when anchor matches');

  serverA.close(); serverB.close(); dbB.close();
  try { fs.unlinkSync(tmpDbB); fs.rmdirSync(tmpDirB); } catch (e) {}
});
