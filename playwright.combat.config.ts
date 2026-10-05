import config from './playwright.config';

// Focused Combat verification gets its own server, so another ticket's preview
// cannot silently supply an unrelated implementation to these checks.
const baseURL = 'http://127.0.0.1:4188/the-drowned-compass/';
export default {
  ...config,
  testMatch: ['**/combat-entries.spec.ts', '**/combat-adapter-contract.spec.ts'],
  workers: 2,
  timeout: 60_000,
  use: { ...config.use, baseURL },
  webServer: {
    command: 'VITE_USE_IN_MEMORY_DATA=true pnpm dev --host 127.0.0.1 --port 4188',
    url: baseURL,
    reuseExistingServer: false,
  },
};
