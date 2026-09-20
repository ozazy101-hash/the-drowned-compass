import { expect, test } from "@playwright/test";

test("the party can see six unclaimed character slots", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { level: 1, name: "The Drowned Compass" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(6);
});
