import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';
export default defineConfig({
  ...baseline,
  workers: 2,
  use: { ...baseline.use, baseURL: 'http://127.0.0.1:4394/the-drowned-compass/' },
  webServer: {
    command: 'VITE_USE_IN_MEMORY_DATA=true pnpm dev --host 127.0.0.1 --port 4394 --strictPort',
    url: 'http://127.0.0.1:4394/the-drowned-compass/',
    reuseExistingServer: false,
  },
});
