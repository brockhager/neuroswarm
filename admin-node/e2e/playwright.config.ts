import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.join(__dirname, 'tests'),
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 5000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--enable-experimental-web-platform-features']
        },
        permissions: ['clipboard-read', 'clipboard-write']
      }
    }
  ],
  webServer: {
    command: 'node ../scripts/generate-jwt-keys.js && node ../scripts/seed-e2e-timeline.js && cross-env PORT=3000 SERVICE_JWT_PRIVATE_KEY_PATH=secrets/admin-node.jwt.key FOUNDER_PUBLIC_KEY_PATH=secrets/founder.jwt.pub npm run dev',
    port: 3000,
    reuseExistingServer: false,
    timeout: 60 * 1000,
  },
});
