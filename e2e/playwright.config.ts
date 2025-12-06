import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/tests',
  timeout: 5 * 60 * 1000,
  expect: { timeout: 10 * 1000 },
  retries: 1,
  reporter: process.env.CI ? [['github'], ['html', { outputFolder: 'e2e/playwright-report' }]] : 'list',
  use: {
    headless: true,
    trace: 'on-first-retry',
    actionTimeout: 120 * 1000
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
