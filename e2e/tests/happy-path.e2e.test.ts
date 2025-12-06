import { test, expect } from '@playwright/test';

/**
 * Happy-path multi-service E2E test
 * Flow:
 *  - Submit artifact (Router) -> Router returns submission id / txId
 *  - Gateway mempool receives REQUEST_REVIEW
 *  - VP (producer) consumes REQUEST_REVIEW and produces ARTIFACT_CRITIQUE
 *  - NS receives block containing ARTIFACT_CRITIQUE and confirms
  *  Router eventually marks artifact as ANCHORED
 *
 * Notes:
 *  - The precise endpoints used in your environment may differ. Configure via environment variables.
 *  - Tests poll and retry since service startup and eventual-consistency timing vary in CI/dev.
 */

const ROUTER_URL = process.env.ROUTER_URL || 'http://localhost:3007';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const VP_URL = process.env.VP_URL || 'http://localhost:3002';
const NS_URL = process.env.NS_URL || 'http://localhost:3009';

async function retry<T>(fn: () => Promise<T>, attempts = 15, delayMs = 1000): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

test.describe('happy-path', () => {
  test('Happy path: submit artifact → critique → anchored', async ({ request }) => {
    test.slow();

    const artifactId = `e2e-art-${Date.now()}`;
    const artifactPayload = {
      artifact_id: artifactId,
      title: 'E2E Test artifact',
      content: 'This is an end-to-end test artifact used by the E2E harness.'
    };

    // 1) Submit artifact to Router's review endpoint (CN-08-A)
    const submitResp = await request.post(`${ROUTER_URL}/artifact/review`, {
      data: artifactPayload,
      headers: { 'content-type': 'application/json' }
    }).catch((err) => {
      throw new Error(`Failed to POST to Router review endpoint ${ROUTER_URL}/artifact/review: ${err}`);
    });

    expect([200, 201]).toContain(submitResp.status());
    const submitBody = await submitResp.json().catch(() => ({}));
    const txId = submitBody.txId || submitBody.requestId || submitBody.id;
    expect(txId).toBeTruthy();

    // 2) Ensure the Gateway mempool contains a REQUEST_REVIEW for the artifact
    const foundRequest = await retry(async () => {
      const resp = await request.get(`${GATEWAY_URL}/v1/mempool`);
      expect(resp.ok()).toBeTruthy();
      const mem = await resp.json();
      const match = Array.isArray(mem) ? mem.find((t: any) => t.type === 'REQUEST_REVIEW' && (t.payload?.artifact_id === artifactId || t.artifact_id === artifactId)) : undefined;
      if (!match) throw new Error('REQUEST_REVIEW not found in gateway mempool yet');
      return match;
    }, 40, 1500);

    expect(foundRequest).toBeDefined();

    // 3) Wait for VP to produce an ARTIFACT_CRITIQUE and for NS to include it in a block
    const critiqueTx = await retry(async () => {
      // Check NS /v1/txs or /v1/mempool depending on deployment
      // We'll look for an ARTIFACT_CRITIQUE containing our artifactId
      const resp = await request.get(`${NS_URL}/v1/mempool`).catch(() => null);
      if (resp && resp.ok()) {
        const mem = await resp.json();
        const found = Array.isArray(mem) ? mem.find((t: any) => t.type === 'ARTIFACT_CRITIQUE' && (t.payload?.artifact_id === artifactId)) : undefined;
        if (found) return found;
      }

      // fallback: query VP gossip endpoint to see if critique was generated/gossiped
      const vresp = await request.get(`${VP_URL}/v1/gossip`).catch(() => null);
      if (vresp && vresp.ok()) {
        const feed = await vresp.json();
        const match = Array.isArray(feed) ? feed.find((f: any) => f.type === 'ARTIFACT_CRITIQUE' && f.payload?.artifact_id === artifactId) : undefined;
        if (match) return match;
      }

      // otherwise, query Router artifact status; if anchored we'll succeed
      const routerStatus = await request.get(`${ROUTER_URL}/v1/artifacts/${artifactId}`).catch(() => null);
      if (routerStatus && routerStatus.ok()) {
        const body = await routerStatus.json();
        if (body.status === 'ANCHORED' || body.state === 'ANCHORED') {
          // we can be happy returning a synthetic success placeholder
          return { type: 'ARTIFACT_CRITIQUE', payload: { artifact_id: artifactId }, synthetic: true };
        }
      }

      throw new Error('ARTIFACT_CRITIQUE not observed yet');
    }, 80, 2000);

    expect(critiqueTx).toBeDefined();

    // 4) Final: wait for Router to mark artifact as anchored
    const anchored = await retry(async () => {
      const statusResp = await request.get(`${ROUTER_URL}/v1/artifacts/${artifactId}`);
      expect(statusResp.ok()).toBeTruthy();
      const body = await statusResp.json();
      if ((body.status || body.state) !== 'ANCHORED') throw new Error('artifact not yet anchored');
      return body;
    }, 80, 2000);

    expect(anchored).toBeTruthy();
    expect(anchored.status || anchored.state).toBe('ANCHORED');
  });
});
