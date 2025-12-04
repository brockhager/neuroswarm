/*
Agent 9 Client Prototype
Demonstrates how Agent 9 (Discord bot) would call the Router API Prototype endpoints:
 - POST /governance/vote
 - POST /ingest/artifact

This prototype is intentionally simple and uses fetch (Node 18+ or polyfill)

Usage (PowerShell):
 node agent9_client_prototype.js vote
 node agent9_client_prototype.js ingest
*/

import fetch from 'node-fetch';

const ROUTER = process.env.ROUTER_URL || 'http://127.0.0.1:4001';
const TOKEN = process.env.AGENT9_TOKEN || 'prototype-token';

async function submitVote() {
  const body = {
    proposalId: 'proposal-abc-123',
    voterId: 'discord:user#1234',
    vote: 'yes',
    metadata: { reason: 'supports transparency' }
  };

  const res = await fetch(`${ROUTER}/governance/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(body)
  });

  console.log('status', res.status);
  console.log('body', await res.json());
}

async function ingestArtifact() {
  // In a real flow the user uploads a file, Agent 9 calculates a CID and posts it.
  const body = {
    contentCid: 'QmExampleCID12345',
    uploaderId: 'discord:user#1234',
    metadata: { filename: 'screenshot.png', size: 12345, mime: 'image/png' }
  };

  const res = await fetch(`${ROUTER}/ingest/artifact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(body)
  });

  console.log('status', res.status);
  console.log('body', await res.json());
}

const cmd = process.argv[2] || 'vote';
if (cmd === 'vote') submitVote().catch(e => console.error(e));
else if (cmd === 'ingest') ingestArtifact().catch(e => console.error(e));
else console.log('Usage: node agent9_client_prototype.js [vote|ingest]');
