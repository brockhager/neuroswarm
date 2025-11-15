import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Governance Timeline and Anchoring', () => {
  const baseUrl = 'http://127.0.0.1:3000';
  const secretsDir = path.join(__dirname, '..', '..', 'secrets');

  test.beforeEach(async ({ page }) => {
    // Seed timeline entries
    const seedScript = path.join(process.cwd(), 'scripts', 'seed-e2e-timeline.js');
    try {
      const { execSync } = require('child_process');
      execSync(`node "${seedScript}"`);
    } catch (err) {
      console.warn('Failed to run seed script:', err);
    }
  });

  test('Timeline shows seeded anchor and verification status', async ({ page }) => {
    // Create founder token and set before navigation
    const jwt = require('jsonwebtoken');
    const privateKey = fs.readFileSync(path.join(secretsDir, 'founder.jwt.key'), 'utf8');
    const founderToken = jwt.sign({ id: 'founder-test', role: 'founder', permissions: ['*'] }, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
    await page.addInitScript(`window.localStorage.setItem('admin_token', '${founderToken}');`);

    await page.goto(`${baseUrl}/dashboard.html`);
    // Open Governance Timeline tab
    await page.click('button:has-text("Governance Timeline")');
    // Wait until the governance timeline tab content is visible and contains anchor links
    await page.waitForSelector('#governance-timeline.active', { timeout: 5000 });
    await page.waitForSelector('#governance-timeline .status-card a.explorer-link', { state: 'visible', timeout: 5000 });
    // Confirm an entry exists with a transaction signature
    const link = await page.locator('.status-card a.explorer-link').first().innerText();
    expect(link.length).toBeGreaterThan(0);
    // Confirm verification badge exists (may be verified, pending, or failed depending on seed)
    const badge = page.locator('#governance-timeline .status-card .status-badge').first();
    const badgeText = await badge.innerText();
    expect(badgeText && badgeText.trim().length).toBeGreaterThan(0);
  });
});
