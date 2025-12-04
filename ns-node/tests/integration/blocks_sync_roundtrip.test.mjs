import test from 'node:test';
import assert from 'assert';
import express from 'express';
import bodyParser from 'body-parser';
import os from 'os';
import fs from 'fs';
import path from 'path';
import StateDatabase from '../../src/services/state-db.js';
import { sha256Hex, canonicalize, txIdFor, computeMerkleRoot } from '../../src/utils/crypto.js';

test('REQUEST_BLOCKS_SYNC from Node A -> Node B and RESPONSE_BLOCKS_SYNC back to A', async () => {
  // Create temp DBs for both nodes
  const tmpDirA = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-a-'));
  const tmpDbA = path.join(tmpDirA, `neuroswarm_a_${Date.now()}.db`);
  const tmpDirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-node-b-'));
  const tmpDbB = path.join(tmpDirB, `neuroswarm_b_${Date.now()}.db`);

  const dbA = new StateDatabase(tmpDbA);
  const dbB = new StateDatabase(tmpDbB);

  // Populate Node B with a few blocks
  const blocks = [];
  for (let i = 0; i < 3; i++) {
    const txs = [{ id: `tx-${i}-1`, payload: `p${i}-1`, fee: 0 }, { id: `tx-${i}-2`, payload: `p${i}-2`, fee: 0 }];
    const txIds = txs.map(t => txIdFor(t));
    const merkle = computeMerkleRoot(txIds);
    const header = { version: '1.0.0', chainId: 'test', height: i + 1, validatorId: `val-b`, prevHash: i === 0 ? '0'.repeat(64) : blocks[i-1].blockHash, merkleRoot: merkle, timestamp: Date.now(), txCount: txs.length };
    const blockHash = sha256Hex(Buffer.from(canonicalize(header), 'utf8'));
    const block = { header, txs, blockHash, parentHash: header.prevHash };
    blocks.push(block);
    dbB.saveBlock(blockHash, block);
  }

  // Start Node A server to receive responses
  const appA = express();
  appA.use(bodyParser.json());
  const received = [];
  appA.post('/p2p/message', (req, res) => {
    const msg = req.body || {};
    received.push(msg);
    res.json({ ok: true });
  });
  const serverA = appA.listen(0);
  const portA = serverA.address().port;

  // Start Node B server to handle requests and post back
  const appB = express();
  appB.use(bodyParser.json());
  // Simple peers mapping so Node B knows where Node A is
  const peers = { 'node-a': { host: '127.0.0.1', port: portA } };

  appB.post('/p2p/message', async (req, res) => {
    const msg = req.body || {};
    if (msg.type === 'REQUEST_BLOCKS_SYNC') {
      const { fromHeight = 0, toHeight = null } = msg.payload || {};
      // fetch blocks from DB in ascending order
      const all = Array.from(dbB.getAllBlocks().values());
      all.sort((a,b) => (a.header.height || 0) - (b.header.height || 0));
      const slice = (typeof toHeight === 'number') ? all.slice(fromHeight, toHeight + 1) : all.slice(fromHeight);

      const respPayload = { requestId: msg.id, blocks: slice.map(b => ({ header: b.header, blockHash: b.blockHash })) };
      const respMsg = { id: `resp-${Date.now()}`, type: 'RESPONSE_BLOCKS_SYNC', payload: respPayload, originNodeId: 'node-b' };

      // Send response to origin
      const origin = msg.originNodeId;
      const target = peers[origin];
      if (target) {
        const url = `http://${target.host}:${target.port}/p2p/message`;
        try {
          await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(respMsg), timeout: 5000 });
        } catch (e) {
          // ignore
        }
      }

      return res.json({ ok: true });
    }
    res.json({ ok: false, reason: 'unhandled' });
  });

  const serverB = appB.listen(0);
  const portB = serverB.address().port;

  // Now Node A sends a REQUEST_BLOCKS_SYNC to Node B
  const reqMsg = { id: `req-${Date.now()}`, type: 'REQUEST_BLOCKS_SYNC', payload: { fromHeight: 0, toHeight: 2 }, originNodeId: 'node-a' };
  const r = await fetch(`http://127.0.0.1:${portB}/p2p/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqMsg) });
  assert.strictEqual(r.ok, true);

  // wait a moment for Node B to callback
  await new Promise(r => setTimeout(r, 200));

  // Verify Node A received a RESPONSE_BLOCKS_SYNC
  const found = received.find(m => m.type === 'RESPONSE_BLOCKS_SYNC');
  assert.ok(found, 'expected to receive RESPONSE_BLOCKS_SYNC');
  assert.ok(found.payload && Array.isArray(found.payload.blocks) && found.payload.blocks.length === 3, 'expected 3 blocks in response');

  // cleanup
  serverA.close();
  serverB.close();
  dbA.close();
  dbB.close();
  try { fs.unlinkSync(tmpDbA); fs.unlinkSync(tmpDbB); fs.rmdirSync(tmpDirA); fs.rmdirSync(tmpDirB); } catch (e) {}
});
