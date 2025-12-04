/* Demo for Agent9.network_ingestion
 * shows a quick flow for ingesting a local file and submitting a governance vote
 */

const fs = require('fs');
const path = require('path');
const { ingestArtifactFromFile, submitGovernanceVote, createDeterministicCid } = require('../lib/network_ingestion');

async function runDemo() {
  console.log('[demo] Agent 9 network ingestion demo');

  // Demo file
  const demoFile = path.join(__dirname, 'sample.txt');
  fs.writeFileSync(demoFile, 'Hello NeuroSwarm — demo file ' + Date.now());
  const buf = fs.readFileSync(demoFile);

  try {
    const ingestResult = await ingestArtifactFromFile(buf, 'sample.txt', 'user#1234');
    console.log('Ingest result', ingestResult);

    const cid = createDeterministicCid(buf);
    const voteResult = await submitGovernanceVote({ proposalId: 'proposal-demo-1', userId: 'user#1234', vote: 'YEA', context: `Artifact ${cid}` });
    console.log('Vote result', voteResult);

  } catch (err) {
    console.error('[demo error]', err && err.message);
  }
}

runDemo().catch(e => console.error(e));
