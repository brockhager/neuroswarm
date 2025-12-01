import axios from 'axios';
import { Client } from 'pg';

jest.setTimeout(120000);

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const DB_URL = process.env.E2E_DATABASE_URL || 'postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test';

describe('E2E Refund Flow (integration)', () => {
  test('times out a job and refunds + persists tx signature', async () => {
    // 1) Submit a job
    const body = {
      user_wallet: 'Hn7cTestAddress',
      prompt: 'E2E refund flow test - please ignore',
      model: 'NS-LLM-TEST',
      max_tokens: 16,
      nsd_burned: '100',
      burn_tx_signature: 'test_burn_sig'
    };

    const createRes = await axios.post(`${BASE}/api/v1/request/submit`, body);
    expect([200, 202]).toContain(createRes.status);

    const jobId = createRes.data.job_id;
    expect(jobId).toBeTruthy();

    // 2) Force the job to appear timed-out by updating timeout_at in DB to the past
    const client = new Client({ connectionString: DB_URL });
    await client.connect();

    // Set the timeout_at to 2 minutes ago so monitor picks it up immediately
    await client.query('UPDATE jobs SET timeout_at = NOW() - INTERVAL \"2 minutes\" WHERE id = $1', [jobId]);

    // 3) Wait for timeout monitor to run and refund to be executed
    const start = Date.now();
    let refunded = false;
    let refundSig: string | null = null;

    while (Date.now() - start < 60000) { // wait up to 60s
      const r = await client.query('SELECT status, refund_tx_signature FROM jobs WHERE id = $1', [jobId]);
      if (r.rows.length > 0) {
        const row = r.rows[0];
        if (row.status === 'refunded') {
          refunded = true;
          refundSig = row.refund_tx_signature;
          break;
        }
      }
      await new Promise((res) => setTimeout(res, 2000));
    }

    await client.end();

    expect(refunded).toBe(true);
    expect(refundSig).toBeTruthy();
  });
});
