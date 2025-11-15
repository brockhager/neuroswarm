import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

test.describe.serial('Shutdown E2E behavior', () => {
  const baseUrl = 'http://127.0.0.1:3000';
  const secretsDir = path.join(__dirname, '..', '..', 'secrets');

  function createToken(role: 'founder' | 'admin', privateKeyPath: string) {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    return jwt.sign({ id: `${role}-test`, role, permissions: ['*'] }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
  }

  test('Mark Verified is blocked in shutdown mode', async ({ page }) => {
    const founderPrivateKeyPath = path.join(secretsDir, 'founder.jwt.key');
    const founderToken = createToken('founder', founderPrivateKeyPath);
    await page.addInitScript(`window.localStorage.setItem('admin_token', '${founderToken}');`);
    await page.goto(`${baseUrl}/dashboard.html`);

    // Enable shutdown mode via API
    const res = await page.request.post(`${baseUrl}/v1/admin/shutdown`, { data: { enabled: true }, headers: { Authorization: `Bearer ${founderToken}` } });
    expect(res.status()).toBe(200);

    // Open Latest Anchor and attempt to click mark verified
    await page.click('button:has-text("Governance Anchoring")');
    await page.waitForSelector('[data-testid="latest-anchor-show-details"]', { timeout: 5000 });
    await page.click('button:has-text("Latest Anchor")');
    const txSigText = (await page.locator('#latest-anchor-content a.explorer-link').innerText()).trim();
    const markBtn = page.locator(`[data-testid="mark-verified-btn-${txSigText}"]`);
    await expect(markBtn).toBeVisible();

    // Attempt to click and assert a failure toast is shown
    const [setReq] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/v1/admin/set-tx-signature') && r.method() === 'POST'),
      page.on('dialog', async dialog => { await dialog.accept(); }),
      markBtn.click()
    ]);
    const setReqBody = JSON.parse(setReq.postData() || '{}');
    // Ensure the request was made
    expect(setReqBody.txSignature).toBeTruthy();

    // Wait for toast indicating failure (the UI shows HTTP 503 service unavailable)
    await expect(page.locator('.toast').last()).toContainText('Service Unavailable');

    // Disable shutdown mode for cleanup
    await page.request.post(`${baseUrl}/v1/admin/shutdown`, { data: { enabled: false }, headers: { Authorization: `Bearer ${founderToken}` } });
  });
});
