import { test, expect } from '@playwright/test';

/**
 * Security negative test for CN-08-C: ensure NS rejects ARTIFACT_CRITIQUE txs not signed by canonical producer
 *
 * This test attempts to submit an ARTIFACT_CRITIQUE transaction signed by an arbitrary/incorrect validator
 * and asserts that NS rejects the tx (4xx) or returns an error specifically pointing to invalid signature / producer provenance.
 */

const NS_URL = process.env.NS_URL || 'http://localhost:3009';

test.describe('security-cn08c', () => {
  test('NS rejects ARTIFACT_CRITIQUE signed by non-producer', async ({ request }) => {
    test.slow();

    const artifactId = `e2e-art-invalid-${Date.now()}`;

    // 1) Construct an invalid ARTIFACT_CRITIQUE payload (signed by 'not-a-producer')
    const fakeCritique = {
      type: 'ARTIFACT_CRITIQUE',
      payload: {
        artifact_id: artifactId,
        summary: 'Fake critique for negative test',
        issues: [ { code: 'FAKE-1', message: 'This critique is forged and should be rejected.' } ]
      },
      // CN-08-C requires signedBy + signature for ARTIFACT_CRITIQUE
      signedBy: 'validator-not-producer',
      signature: 'deadbeefdeadbeef',
      meta: { nonce: Math.floor(Math.random() * 1000000) }
    };

    // 2) Try submitting directly to NS's tx admission endpoint (some deployments accept /v1/tx)
    const target = `${NS_URL}/v1/tx`;
    const resp = await request.post(target, { data: fakeCritique, headers: { 'content-type': 'application/json' } }).catch((err) => ({ status: 500, ok: () => false, error: String(err) }));

    // Expect non-OK response (NS must not accept a forged critique)
    expect(resp.ok()).toBeFalsy();

    // If body present, check for explicit producer/signature rejection reason
    let body: any = null;
    try {
      body = await resp.json();
    } catch (e) {
      body = null;
    }

    const message = (body && (body.message || body.error || body.reason || JSON.stringify(body))) || (resp as any).error || 'no-body';

    // Assert error references signature/producer where possible
    const lower = String(message).toLowerCase();
    const expectedWords = ['signature', 'signed', 'producer', 'designated', 'not allowed', 'invalid'];
    const found = expectedWords.some((w) => lower.includes(w));

    expect(found, `NS should reject forged ARTIFACT_CRITIQUE with signature/producer error, got: ${message}`).toBeTruthy();
  });
});
