import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';
export default defineConfig({...baseline, testDir:'.', testMatch:'integration-production-smoke.spec.ts', workers:1,
use:{...baseline.use, baseURL:'http://127.0.0.1:4390/the-drowned-compass/'}, webServer:undefined});
