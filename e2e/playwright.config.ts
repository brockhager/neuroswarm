import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/tests',
  timeout: 8 * 60 * 1000, // longer global timeout (8m) for slow CI environments
  expect: { timeout: 30 * 1000 }, // longer default expect timeout for flaky networks
  retries: 1,
  reporter: process.env.CI ? [['github'], ['html', { outputFolder: 'e2e/playwright-report' }]] : 'list',
  use: {
    headless: true,
    // Traces and video/screenshot retention help debugging CI failures
    trace: process.env.CI ? 'on' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 180 * 1000
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
