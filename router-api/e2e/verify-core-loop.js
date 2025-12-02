const { spawn } = require('child_process');
const axios = require('axios');
const { Client } = require('pg');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test';
const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function waitFor(url, timeoutMs = 120000){
  const start = Date.now();
  while(Date.now() - start < timeoutMs){
    try{
      const r = await axios.get(url, { timeout: 2000 });
      if (r.status >= 200 && r.status < 400) return true;
    }catch(e){}
    await sleep(1000);
  }
  return false;
}

function startBg(cmd, args, opts = {}){
  console.log(`Spawning: ${cmd} ${args.join(' ')} (cwd=${opts.cwd || process.cwd()})`);
  const p = spawn(cmd, args, { stdio: ['ignore','pipe','pipe'], ...opts });
  p.stdout.on('data', d => process.stdout.write(`[${path.basename(opts.cwd || '')}] ${d.toString()}`));
  p.stderr.on('data', d => process.stderr.write(`[${path.basename(opts.cwd || '')}] ERR: ${d.toString()}`));
  return p;
}

async function run() {
  console.log('=== Verify Core NeuroSwarm Loop: starting services ===');

  try{
    // 1) Start Postgres for router-api
    console.log('Bringing up Postgres for router-api (docker compose)');
    const cwdRouter = path.join(ROOT, 'router-api');
    await new Promise((resolve, reject) => {
      const up = spawn('docker', ['compose', '-f', 'docker-compose.test.yml', 'up', '-d', '--build', 'db'], { cwd: cwdRouter, stdio: 'inherit' });
      up.on('exit', code => code === 0 ? resolve() : reject(new Error('docker compose up failed')));
    });

    // wait for postgres to be ready
    console.log('Waiting for Postgres to become healthy...');
    let pgReady = false;
    for(let i=0;i<60;i++){
      try{
        const check = spawn('docker', ['compose', '-f', 'docker-compose.test.yml', 'exec', '-T', 'db', 'pg_isready', '-U', 'neuroswarm_user', '-d', 'neuroswarm_router_db_test'], { cwd: cwdRouter });
        await new Promise(r=> check.on('exit', r));
        pgReady = true; break;
      }catch(e){ await sleep(1000); }
    }

    if(!pgReady){ throw new Error('Postgres failed to become healthy'); }

    // 2) Start Router API
    console.log('Starting Router API...');
    const routerEnv = Object.assign({}, process.env, { DATABASE_URL: DB_URL, PORT: '3000' });
    const router = startBg('pnpm', ['start'], { cwd: path.join(ROOT, 'router-api'), env: routerEnv });

    // 3) Start NS-LLM and VP node
    const nsllm = startBg('pnpm', ['start'], { cwd: path.join(ROOT, 'NS-LLM') });
    const vpnode = startBg('pnpm', ['start'], { cwd: path.join(ROOT, 'vp-node'), env: Object.assign({}, process.env, { PORT: '4000' }) });

    // Wait for health endpoints
    console.log('Waiting for Router API health...');
    const okRouter = await waitFor(`${BASE}/health`, 120000);
    if (!okRouter) throw new Error('Router API did not become healthy');

    console.log('Waiting for VP node health...');
    const okVp = await waitFor('http://localhost:4000/health', 120000);
    if (!okVp) throw new Error('VP Node did not become healthy');

    console.log('Waiting for NS-LLM health...');
    const okNs = await waitFor('http://localhost:3006/health', 120000);
    // NS-LLM may be optional; just warn
    if (!okNs) console.warn('NS-LLM health not detected (continuing)');

    // 4) Submit a job to Router API
    console.log('Submitting a test job to Router API...');
    const body = {
      user_wallet: 'E2E-TEST-WALLET',
      prompt: 'E2E core loop test - please ignore',
      model: 'NS-LLM-TEST',
      max_tokens: 16,
      nsd_burned: '1',
      burn_tx_signature: 'test_burn_sig'
    };

    const submitRes = await axios.post(`${BASE}/api/v1/request/submit`, body, { timeout: 10000 });
    console.log('Submit response status:', submitRes.status, submitRes.data);
    const jobId = submitRes.data.job_id;
    if (!jobId) throw new Error('No job id returned from Router submit');

    // 5) Wait for job to be persisted & optionally assigned
    console.log('Waiting for job to be present in Postgres...');
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    let jobRecord = null;
    const start = Date.now();
    while(Date.now() - start < 60000){
      const r = await client.query('SELECT id,status,assigned_validator,validator_endpoint FROM jobs WHERE id = $1', [jobId]);
      if (r.rows.length > 0) { jobRecord = r.rows[0]; break; }
      await sleep(1000);
    }

    if (!jobRecord) { throw new Error('Job not found in DB after 60s'); }
    console.log('Job found:', jobRecord);

    // 6) Simulate validator completing the job by calling Router's complete endpoint
    console.log('Simulating validator completion via Router API /complete endpoint...');
    const completePayload = {
      jobId: jobId,
      validatorId: jobRecord.assigned_validator || 'validator_001',
      inferenceResult: 'e2e test inference result (mocked)',
      success: true,
      feeAmount: 1,
      userWallet: body.user_wallet
    };

    const compRes = await axios.post(`${BASE}/api/v1/request/complete`, completePayload, { timeout: 10000 });
    console.log('Complete response status:', compRes.status, compRes.data);

    // 7) Poll DB for completion
    console.log('Polling DB for completed status...');
    let completed = false;
    let finalRow = null;
    const start2 = Date.now();
    while(Date.now() - start2 < 60000){
      const r = await client.query('SELECT id, status, result, completed_at FROM jobs WHERE id = $1', [jobId]);
      if (r.rows.length > 0) {
        finalRow = r.rows[0];
        if (finalRow.status === 'completed') { completed = true; break; }
      }
      await sleep(1000);
    }

    await client.end();

    if (!completed) {
      console.error('Job did not reach completed status:', finalRow);
      throw new Error('Job not completed');
    }

    console.log('Job completed successfully. Result:', finalRow.result);

    // 8) Cleanup: kill background processes and bring down Postgres
    console.log('Cleaning up processes...');
    [router, nsllm, vpnode].forEach(p => { try { p.kill(); } catch(e){} });

    console.log('Tearing down Postgres docker compose...');
    await new Promise((resolve) => {
      const down = spawn('docker', ['compose', '-f', 'docker-compose.test.yml', 'down', '--volumes'], { cwd: cwdRouter, stdio: 'inherit' });
      down.on('exit', () => resolve());
    });

    console.log('Core loop verification succeeded');
    process.exit(0);

  } catch (err) {
    console.error('Core loop verification failed:', err?.message || err);
    process.exit(2);
  }
}

run();
