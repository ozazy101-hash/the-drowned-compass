import base from './playwright.ticket21.config';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, use: { ...base.use, baseURL: 'http://127.0.0.1:4423/the-drowned-compass/' }, webServer: { command: 'pnpm preview --host 127.0.0.1 --port 4423 --strictPort', url: 'http://127.0.0.1:4423/the-drowned-compass/', reuseExistingServer: false } });
