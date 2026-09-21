import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/the-drowned-compass/",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "laptop-chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "phone-chromium",
      use: { ...devices["Pixel 7"], channel: "chrome" },
    },
  ],
  webServer: {
    command:
      "VITE_USE_IN_MEMORY_DATA=true pnpm dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/the-drowned-compass/",
    reuseExistingServer: true,
  },
});
