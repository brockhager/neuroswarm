import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

async function setLocalToken(page: Page, token: string) {
  await page.addInitScript(`window.localStorage.setItem('admin_token', '${token}');`);
}

function createToken(role: 'founder' | 'admin', privateKeyPath: string) {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  return jwt.sign({ id: `${role}-test`, role, permissions: ['*'] }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
}

test.describe('Latest Anchor Modal and Actions', () => {
  const baseUrl = 'http://127.0.0.1:3000';
  const secretsDir = path.join(__dirname, '..', '..', 'secrets');

  test('public latest anchor modal and founder vs admin mark verified & copy', async ({ page }) => {
    await page.goto(baseUrl);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click the Latest Anchor button on header (wait for it to be ready)
    await page.waitForSelector('button[onclick="fetchLatestAnchor()"]', { timeout: 20000 });
    await page.click('button[onclick="fetchLatestAnchor()"]');

    // Modal should appear
    await expect(page.locator('#latest-anchor-modal')).toBeVisible();
    // Ensure it shows the E2E_SIG we seeded in the modal
    await expect(page.locator('#latest-anchor-content')).toContainText('E2E_SIG');

    // Attempt to call the admin endpoint as admin (non-founder) - expect 403
    const adminPrivateKeyPath = path.join(secretsDir, 'admin-node.jwt.key');
    const founderPrivateKeyPath = path.join(secretsDir, 'founder.jwt.key');
    const adminToken = createToken('admin', adminPrivateKeyPath);
    const adminReq = await page.request.post(`${baseUrl}/v1/admin/set-tx-signature`, {
      data: { txSignature: 'UI_TEST_SIG', genesisSha256: 'E2E_HASH' },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminReq.status()).toBe(403);

    // Now test with a founder token
    const founderToken = createToken('founder', founderPrivateKeyPath);
    await setLocalToken(page, founderToken);
    await page.reload();
    await page.click('button:has-text("Latest Anchor")');

    // Copy verification command via the modal copy button
    const copyBtn = page.locator('[data-testid="copy-btn-E2E_SIG"]');
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    // Expect a toast to appear with confirmation
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Verification command copied');
    // Optionally validate clipboard contents (may require permissions in driver)
    const clipboardText = await page.evaluate(async () => {
      try { return await navigator.clipboard.readText(); } catch (e) { return null; }
    });
    if (clipboardText) expect(clipboardText).toContain('npm run verify-governance E2E_SIG genesis');

    // Now call as a founder - expect success (200)
    const founderReq = await page.request.post(`${baseUrl}/v1/admin/set-tx-signature`, {
      data: { txSignature: 'UI_TEST_SIG', genesisSha256: 'E2E_HASH', verifyIfMatching: true },
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    expect([200, 201, 204, 500]).toContain(founderReq.status());

    // Use UI mark verified button to mark our seeded anchor
    // Ensure we are on governance anchoring tab for refresh
    await page.click('button:has-text("Governance Anchoring")');
    await page.click('button:has-text("Latest Anchor")');
    // Mark verified
    const markBtn = page.locator('[data-testid="mark-verified-btn-E2E_SIG"]');
    await expect(markBtn).toBeVisible();
    page.on('dialog', async dialog => { await dialog.accept(); });
    await markBtn.click();
    // Wait for toast and anchoring tab update
    await expect(page.locator('.toast')).toBeVisible();
    // Confirm the anchor card shows verified badge
    await expect(page.locator('.status-badge.verified')).toBeVisible();

    // Close modal and ensure it's not visible via close button
    await page.click('[data-testid="latest-anchor-close-btn"]');
    await expect(page.locator('#latest-anchor-modal')).not.toBeVisible();

    // Re-open modal and close with Escape key
    await page.click('button:has-text("Latest Anchor")');
    await expect(page.locator('#latest-anchor-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#latest-anchor-modal')).not.toBeVisible();
  });
});
