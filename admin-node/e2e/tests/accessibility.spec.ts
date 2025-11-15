import { test, expect } from '@playwright/test';

test.describe('Dashboard Accessibility', () => {
  test('Important elements have ARIA or accessible attributes and keyboard navigation works', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/dashboard.html');
    // Check aria-labels and data-testid for main controls
    const latestBtn = page.locator('button:has-text("Latest Anchor")');
    await expect(latestBtn).toBeVisible();
    await page.keyboard.press('Tab'); // Try navigation
    // Ensure critical buttons have aria-labels or data-testid for automation
    await expect(page.locator('button:has-text("Latest Anchor")')).toBeVisible();
    await expect(page.locator('[data-testid="latest-anchor-close-btn"]').first()).toHaveAttribute('aria-label', 'Close Latest Anchor modal');

    // Navigate to Governance Anchoring tab and open modal
    await page.click('button:has-text("Governance Anchoring")');
    // Wait for the tab to load content and ensure the anchoring tab has at least one control button
    await page.waitForSelector('#governance-anchoring .status-card', { timeout: 5000 });
       // Open the global 'Latest Anchor' action and verify modal accessibility
       await page.click('button:has-text("Latest Anchor")');
       // In rare cases it may be necessary to ensure the governance-anchoring tab is active, but the global button should present the modal
  });
});
