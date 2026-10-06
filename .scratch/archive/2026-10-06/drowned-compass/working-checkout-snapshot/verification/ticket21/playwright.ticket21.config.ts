import base from './playwright.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, workers: 2, use: { ...base.use, baseURL: 'http://127.0.0.1:4421/the-drowned-compass/' }, webServer: { command: 'VITE_USE_IN_MEMORY_DATA=true pnpm dev --host 127.0.0.1 --port 4421 --strictPort', url: 'http://127.0.0.1:4421/the-drowned-compass/', reuseExistingServer: false } });
