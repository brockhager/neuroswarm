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
    // Seed a founder token in localStorage before loading the page so protected calls return data
    const founderPrivateKeyPath = path.join(secretsDir, 'founder.jwt.key');
    const founderToken = createToken('founder', founderPrivateKeyPath);
    await setLocalToken(page, founderToken);
    await page.goto(`${baseUrl}/dashboard.html`);
    page.on('console', msg => {
      // Print console logs from the page to help debugging
      console.log('PAGE_CONSOLE>', msg.type().toUpperCase(), msg.text());
    });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // Ensure Governance Anchoring tab is loaded and click quick card 'Show Details'
      await page.click('button:has-text("Governance Anchoring")');
      // Prefer to use the quick card show details button if it exists, otherwise fallback to header button
      await page.waitForTimeout(1000);
      const quickDetails = page.locator('[data-testid="latest-anchor-show-details"]');
      if (await quickDetails.count() > 0) {
        const [response] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/v1/observability/latest-anchor'), { timeout: 5000 }),
          quickDetails.click(),
        ]);
      } else {
        const [response] = await Promise.all([
          page.waitForResponse(resp => resp.url().includes('/v1/observability/latest-anchor'), { timeout: 5000 }),
          page.click('button:has-text("Latest Anchor")'),
        ]);
      }

    // Modal should appear
    await expect(page.locator('#latest-anchor-modal')).toBeVisible();
    // Ensure it shows a transaction signature (could be INTEG_SIG, E2E_SIG, or other). Extract it for later steps.
    await expect(page.locator('#latest-anchor-content a.explorer-link')).toBeVisible();
    const txSigText = (await page.locator('#latest-anchor-content a.explorer-link').innerText()).trim();
    const genesisShaText = (await page.locator('#latest-anchor-content .hash-display').innerText()).trim();
    console.log('E2E: Found tx signature in modal:', txSigText, 'genesis:', genesisShaText);
    console.log('E2E: Found tx signature in modal:', txSigText);

    // Attempt to call the admin endpoint as admin (non-founder) - expect 403
    const adminPrivateKeyPath = path.join(secretsDir, 'admin-node.jwt.key');
    // Sign the admin token with founder's key for verification by the server's public key (used for e2e tests)
    const adminToken = createToken('admin', founderPrivateKeyPath);
    const adminReq = await page.request.post(`${baseUrl}/v1/admin/set-tx-signature`, {
      data: { txSignature: 'UI_TEST_SIG', genesisSha256: 'E2E_HASH' },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(adminReq.status()).toBe(403);

    // Now test with a founder token
    // Reuse founderToken that was set before page load to ensure UI is authenticated
    await setLocalToken(page, founderToken);
    await page.reload();
    await page.click('button:has-text("Latest Anchor")');

    // Copy verification command via the modal copy button
    const copyBtn = page.locator(`[data-testid="copy-btn-${txSigText}"]`);
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    // Expect a toast to appear with confirmation
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();
    await expect(page.locator('.toast').last()).toContainText('Verification command copied');
    // Optionally validate clipboard contents (may require permissions in driver)
    const clipboardText = await page.evaluate(async () => {
      try { return await navigator.clipboard.readText(); } catch (e) { return null; }
    });
      if (clipboardText) expect(clipboardText).toContain(`npm run verify-governance ${txSigText} genesis`);

      // Simulate clipboard API failure to test fallback mechanism
      await page.evaluate(() => { (navigator as any).clipboard.writeText = () => Promise.reject(new Error('fail')); });
      await copyBtn.click();
      await expect(page.locator('.toast').last()).toContainText('Verification command copied');

    // Now call as a founder - expect success (200)
    // Optionally verify that founder can call set-tx-signature directly
    const founderReq = await page.request.post(`${baseUrl}/v1/admin/set-tx-signature`, {
      data: { txSignature: txSigText, genesisSha256: genesisShaText, verifyIfMatching: true },
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    expect([200, 201, 204]).toContain(founderReq.status());

    // Use UI mark verified button to mark our seeded anchor
    // Ensure we are on governance anchoring tab for refresh
    if (await page.locator('#latest-anchor-modal').isVisible()) {
      await page.click('[data-testid="latest-anchor-close-btn"]');
      await expect(page.locator('#latest-anchor-modal')).not.toBeVisible();
    }
    await page.click('button:has-text("Governance Anchoring")');
    // Wait for anchor cards to render by waiting for the quick 'Show Details' button to be visible
    await page.waitForSelector('[data-testid="latest-anchor-show-details"], button:has-text("Show Details")', { timeout: 5000 });
    await page.click('button:has-text("Latest Anchor")');
    // Mark verified
    const markBtn = page.locator(`[data-testid="mark-verified-btn-${txSigText}"]`);
    await expect(markBtn).toBeVisible();
    // Intercept UI call to set-tx-signature when clicking Mark Verified
    const [setReq] = await Promise.all([
      page.waitForRequest(r => r.url().includes('/v1/admin/set-tx-signature') && r.method() === 'POST'),
      page.on('dialog', async dialog => { await dialog.accept(); }),
      markBtn.click(),
    ]);

    const setReqBody = JSON.parse(setReq.postData() || '{}');
    expect(setReqBody.txSignature).toBeTruthy();
    expect(setReqBody.genesisSha256).toBe(genesisShaText);
    expect(setReqBody.verifyIfMatching).toBeTruthy();
    // Wait for toast and anchoring tab update
    await expect(page.locator('.toast').last()).toBeVisible();

    // Poll the observability API to ensure the anchor verification status is updated
    let verificationSet = false;
    for (let i = 0; i < 10; i++) {
      const res = await page.request.get(`${baseUrl}/v1/observability/governance-anchoring`, {
        headers: { Authorization: `Bearer ${founderToken}` },
      });
      const json = await res.json();
      console.log(`E2E: Poll ${i}: status=${res.status()}, anchors count=${json.anchors?.length || 0}`);
      if (json.anchors && json.anchors.length > 0) {
        console.log('E2E: First anchor:', JSON.stringify(json.anchors[0], null, 2));
      }
      const anchor = (json.anchors || []).find(a => a.txSignature && a.txSignature.includes(txSigText));
      if (anchor) {
        console.log('E2E: Found matching anchor:', JSON.stringify(anchor, null, 2));
      }
      if (anchor && anchor.txSignature && (anchor.verificationStatus === 'verified' || anchor.verificationStatus === 'pending' || anchor.verificationStatus === 'failed')) { verificationSet = true; break; }
      await page.waitForTimeout(500);
    }
    expect(verificationSet).toBeTruthy();

    // Reload the Governance Anchoring tab to see the updated status in the UI
    if (await page.locator('#latest-anchor-modal').isVisible()) {
      await page.click('[data-testid="latest-anchor-close-btn"]');
      await expect(page.locator('#latest-anchor-modal')).not.toBeVisible();
    }
    await page.click('button:has-text("Governance Anchoring")');
    await page.waitForTimeout(1000); // Wait for tab content to reload

    // Confirm the anchor card for our tx signature shows verified badge in the UI
    // Use the copy button's data-testid (still present when verified) to locate the card
    const cardBadge = page.locator('.status-card', { has: page.locator(`[data-testid="copy-btn-${txSigText}"]`) }).locator('.status-badge.verified');
    await expect(cardBadge).toBeVisible({ timeout: 10000 });

    // Close modal and ensure it's not visible via close button
    if (await page.locator('#latest-anchor-modal').isVisible()) {
      await page.click('[data-testid="latest-anchor-close-btn"]');
      await expect(page.locator('#latest-anchor-modal')).not.toBeVisible();
    }

    // Re-open modal and close with Escape key
    await page.click('button:has-text("Latest Anchor")');
    await expect(page.locator('#latest-anchor-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#latest-anchor-modal')).not.toBeVisible();
  });
});
