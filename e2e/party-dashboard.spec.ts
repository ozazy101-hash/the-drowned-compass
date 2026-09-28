import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function enterAs(
  page: Page,
  role: "Player" | "Dungeon Master",
  password: string,
) {
  await page.getByRole("button", { name: role }).click();
  await page.getByLabel("Shared password").fill(password);
  await page.getByRole("button", { name: "Enter the Party" }).click();
}

const characterIdentity = {
  "Player name": "Mara",
  "Character name": "Neris Vale",
  "Primary class": "Rogue",
  "Subclass": "Thief",
  Species: "Human",
  Background: "Sailor",
  Level: "3",
};

const abilityScores = {
  Strength: "9",
  Dexterity: "17",
  Constitution: "13",
  Intelligence: "14",
  Wisdom: "12",
  Charisma: "11",
};

async function enterCharacterIdentity(page: Page) {
  const slot = page
    .getByRole("article", { name: "Unclaimed character slot" })
    .first();
  await slot.getByRole("button").click();

  for (const [label, value] of Object.entries(characterIdentity)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Continue to Ability Scores" }).click();
}

async function enterAbilityScores(page: Page) {
  for (const [label, value] of Object.entries(abilityScores)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
}

function isolatedPartyUrl(testInfo: TestInfo) {
  const namespace = [
    testInfo.project.name,
    testInfo.workerIndex,
    testInfo.retry,
    testInfo.testId,
  ].join("-");
  return `./?partyTestId=${encodeURIComponent(namespace)}`;
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

test("signing out leaves another browser signed in", async ({ browser, page }, testInfo) => {
  const otherContext = await browser.newContext({
    baseURL: String(testInfo.project.use.baseURL ?? "http://127.0.0.1:4173/the-drowned-compass/"),
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

test("a player completes both setup steps and opens the Character Page", async ({
  page,
}, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo));
  await enterAs(page, "Player", "player-password");
  await enterCharacterIdentity(page);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Claim Character Slot" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Enter all six Ability Scores as whole numbers from 1 to 30.",
  );

  await enterAbilityScores(page);
  await page.getByLabel("Strength", { exact: true }).fill("31");
  await page.getByRole("button", { name: "Claim Character Slot" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Enter all six Ability Scores as whole numbers from 1 to 30.",
  );

  await page.getByLabel("Strength", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Claim Character Slot" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Neris Vale" })).toBeVisible();
  await expect(page.getByText("Played by Mara", { exact: true })).toBeVisible();
  await expect(page.getByText("Level 3 Rogue · Thief", { exact: true })).toBeVisible();
  for (const [label, value] of Object.entries(abilityScores)) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Back to the Party" }).click();
  await expect(
    page.getByRole("article", { name: "Neris Vale, played by Mara" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(5);
});

test("another signed-in browser receives a claimed identity without reloading", async ({
  browser,
  page,
}, testInfo) => {
  const url = isolatedPartyUrl(testInfo);
  const otherContext = await browser.newContext({
    baseURL: String(testInfo.project.use.baseURL ?? "http://127.0.0.1:4173/the-drowned-compass/"),
  });
  const otherPage = await otherContext.newPage();

  await page.goto(url);
  await otherPage.goto(url);
  await enterAs(page, "Player", "player-password");
  await enterAs(otherPage, "Dungeon Master", "dm-password");
  await expect(
    otherPage.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(6);

  await enterCharacterIdentity(page);
  await enterAbilityScores(page);
  await page.getByRole("button", { name: "Claim Character Slot" }).click();

  await expect(
    otherPage.getByRole("article", { name: "Neris Vale, played by Mara" }),
  ).toBeVisible();
  await expect(
    otherPage.getByRole("article", { name: "Unclaimed character slot" }),
  ).toHaveCount(5);

  await otherPage
    .getByRole("article", { name: "Neris Vale, played by Mara" })
    .getByRole("button")
    .click();
  await expect(
    otherPage.getByRole("heading", { level: 1, name: "Neris Vale" }),
  ).toBeVisible();

  await otherContext.close();
});
