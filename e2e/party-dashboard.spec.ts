import { expect, test, type Page } from "@playwright/test";

async function enterAs(
  page: Page,
  role: "Player" | "Dungeon Master",
  password: string,
) {
  await page.getByRole("button", { name: role }).click();
  await page.getByLabel("Shared password").fill(password);
  await page.getByRole("button", { name: "Enter the Party" }).click();
}

test("a player can enter the protected Party and stay signed in after refresh", async ({
  page,
}) => {
  await page.goto("./");

  await enterAs(page, "Player", "player-password");

  await expect(
    page.getByRole("heading", { level: 1, name: "The Drowned Compass" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(6);

  await page.reload();
  await expect(
    page.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(6);
});

test("invalid credentials show one non-revealing error", async ({ page }) => {
  await page.goto("./");
  await enterAs(page, "Player", "wrong-password");

  await expect(page.getByRole("alert")).toHaveText(
    "That password didn’t open the way. Check it and try again.",
  );
  await expect(page.getByLabel("Shared password")).toBeVisible();
});

test("the Dungeon Master can enter and sign out", async ({
  page,
}) => {
  await page.goto("./");
  await enterAs(page, "Dungeon Master", "dm-password");

  await expect(page.getByText("Dungeon Master", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "The Drowned Compass" }),
  ).toBeVisible();
  await expect(page.getByLabel("Shared password")).toBeVisible();
});

test("signing out leaves another browser signed in", async ({ browser, page }) => {
  const otherContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173/the-drowned-compass/",
  });
  const otherPage = await otherContext.newPage();

  await page.goto("./");
  await otherPage.goto("./");
  await enterAs(page, "Player", "player-password");
  await enterAs(otherPage, "Player", "player-password");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Shared password")).toBeVisible();

  await otherPage.reload();
  await expect(
    otherPage.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(6);

  await otherContext.close();
});
