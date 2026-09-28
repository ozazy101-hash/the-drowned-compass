import { expect, type Browser, type Locator, type Page, type TestInfo } from "@playwright/test";

export async function enterAs(page: Page, role: "Player" | "Dungeon Master") {
  await page.getByRole("button", { name: role }).click();
  await page.getByLabel("Shared password").fill(role === "Player" ? "player-password" : "dm-password");
  await page.getByRole("button", { name: "Enter the Party" }).click();
}

export function isolatedPartyUrl(testInfo: TestInfo, extra = "") {
  const namespace = [
    testInfo.project.name,
    testInfo.workerIndex,
    testInfo.retry,
    testInfo.testId,
  ].join("-");
  return `./?partyTestId=${encodeURIComponent(namespace)}${extra}`;
}

export async function claimCharacter(page: Page) {
  await page.getByRole("article", { name: "Unclaimed character slot" }).first().getByRole("button").click();
  const identity = {
    "Player name": "Mara",
    "Character name": "Neris Vale",
    "Primary class": "Rogue",
    Subclass: "Thief",
    Species: "Human",
    Background: "Sailor",
    Level: "3",
  };
  for (const [label, value] of Object.entries(identity)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Continue to Ability Scores" }).click();
  const abilities = {
    Strength: "9",
    Dexterity: "17",
    Constitution: "13",
    Intelligence: "14",
    Wisdom: "12",
    Charisma: "11",
  };
  for (const [label, value] of Object.entries(abilities)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Claim Character Slot" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Neris Vale" })).toBeVisible();
}

export async function openClaimedCharacter(page: Page) {
  await page
    .getByRole("article", { name: /Neris .+, played by Mara/ })
    .getByRole("button")
    .click();
}

export async function saveInput(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press("Enter");
  await expectSaveFeedback(page, input, "Saved");
}

export async function expectSaveFeedback(page: Page, control: Locator, text: string) {
  const feedbackId = await control.getAttribute("aria-describedby");
  expect(feedbackId).not.toBeNull();
  await expect(page.locator(`#${feedbackId}`)).toHaveText(text);
}

export async function prepareTwoBrowsers(browser: Browser, page: Page, testInfo: TestInfo) {
  const url = isolatedPartyUrl(testInfo);
  const otherContext = await browser.newContext({
    baseURL: new URL("./", page.url()).toString(),
  });
  const otherPage = await otherContext.newPage();
  await page.goto(url);
  await otherPage.goto(url);
  await enterAs(page, "Player");
  await enterAs(otherPage, "Dungeon Master");
  await claimCharacter(page);
  await expect(otherPage.getByRole("article", { name: "Neris Vale, played by Mara" })).toBeVisible();
  await openClaimedCharacter(otherPage);
  return { otherContext, otherPage };
}

