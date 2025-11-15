import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

test.describe('Anchor mismatch behaviors', () => {
  const baseUrl = 'http://127.0.0.1:3000';
  const secretsDir = path.join(__dirname, '..', '..', 'secrets');

  function createToken(role: 'founder' | 'admin', privateKeyPath: string) {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    return jwt.sign({ id: `${role}-test`, role, permissions: ['*'] }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  }

  test('Setting tx-signature with wrong genesis hash does not verify anchor', async ({ page }) => {
    const founderPrivateKeyPath = path.join(secretsDir, 'founder.jwt.key');
    const founderToken = createToken('founder', founderPrivateKeyPath);
    await page.addInitScript(`window.localStorage.setItem('admin_token', '${founderToken}');`);
    await page.goto(`${baseUrl}/dashboard.html`);
    await page.click('button:has-text("Governance Anchoring")');
    // Open modal and extract tx signature
    await page.waitForSelector('[data-testid="latest-anchor-show-details"]', { timeout: 5000 });
    await page.click('button:has-text("Latest Anchor")');
    const txSigText = (await page.locator('#latest-anchor-content a.explorer-link').innerText()).trim();
    const wrongHash = 'DEADBEEF_HASH';

    // Ensure safe mode is disabled
    await page.request.post(`${baseUrl}/v1/admin/shutdown`, { data: { enabled: false }, headers: { Authorization: `Bearer ${founderToken}` } });

    const res = await page.request.post(`${baseUrl}/v1/admin/set-tx-signature`, {
      data: { txSignature: txSigText, genesisSha256: wrongHash, verifyIfMatching: true },
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    // The API should accept the request (not blocked by safe mode), but the anchor should NOT be verified when the genesis hash mismatches
    expect([200, 201, 204]).toContain(res.status());

    // Poll observability - ensure anchor still not 'verified'
    let foundVerified = false;
    for (let i=0;i<5;i++) {
      const resp = await page.request.get(`${baseUrl}/v1/observability/governance-anchoring`, { headers: { Authorization: `Bearer ${founderToken}` } });
      const json = await resp.json();
      const anchored = (json.anchors || []).find(a => a.txSignature && a.txSignature.includes(txSigText));
      if (anchored && anchored.verificationStatus !== 'verified') { foundVerified = false; break; }
      if (anchored && anchored.verificationStatus === 'verified') { foundVerified = true; break; }
      await page.waitForTimeout(400);
    }
    expect(foundVerified).toBe(false);
  });
});
