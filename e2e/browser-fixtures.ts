import { test as base, type Browser, type BrowserContext, type TestInfo } from "@playwright/test";

async function useLocalFontFallback(context: BrowserContext) {
  // App acceptance must not wait for Google Fonts delivery. The application
  // already provides local font fallbacks; exercise those in every test session.
  await context.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({ contentType: "text/css", body: "" }),
  );
}

export const test = base.extend<{ localFontFallback: void }>({
  localFontFallback: [async ({ context }, use) => {
    await useLocalFontFallback(context);
    await use();
  }, { auto: true }],
});

export async function createPartyBrowserContext(browser: Browser, testInfo: TestInfo) {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: testInfo.project.use.viewport,
    isMobile: testInfo.project.use.isMobile,
    hasTouch: testInfo.project.use.hasTouch,
  });
  await useLocalFontFallback(context);
  return context;
}
