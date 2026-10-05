import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', outputDir: './test-results/rests', testMatch: /character-rests.*\.spec\.ts/, fullyParallel: true, workers: 2, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4446/the-drowned-compass/', trace: 'retain-on-failure' },
  projects: [{ name: 'laptop-chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }, { name: 'phone-chromium', use: { ...devices['Pixel 7'], channel: 'chrome' } }],
  webServer: { command: 'VITE_USE_IN_MEMORY_DATA=true pnpm dev --host 127.0.0.1 --port 4446 --strictPort', url: 'http://127.0.0.1:4446/the-drowned-compass/', reuseExistingServer: false },
});
