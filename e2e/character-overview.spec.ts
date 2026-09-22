import { expect, test, type Browser, type Locator, type Page, type TestInfo } from "@playwright/test";

async function enterAs(page: Page, role: "Player" | "Dungeon Master") {
  await page.getByRole("button", { name: role }).click();
  await page.getByLabel("Shared password").fill(role === "Player" ? "player-password" : "dm-password");
  await page.getByRole("button", { name: "Enter the Party" }).click();
}

function isolatedPartyUrl(testInfo: TestInfo, extra = "") {
  const namespace = [
    testInfo.project.name,
    testInfo.workerIndex,
    testInfo.retry,
    testInfo.testId,
  ].join("-");
  return `./?partyTestId=${encodeURIComponent(namespace)}${extra}`;
}

async function claimCharacter(page: Page) {
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

async function openClaimedCharacter(page: Page) {
  await page
    .getByRole("article", { name: /Neris .+, played by Mara/ })
    .getByRole("button")
    .click();
}

async function saveInput(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true });
  await input.fill(value);
  await input.press("Enter");
  await expectSaveFeedback(page, input, "Saved");
}

async function expectSaveFeedback(page: Page, control: Locator, text: string) {
  const feedbackId = await control.getAttribute("aria-describedby");
  expect(feedbackId).not.toBeNull();
  await expect(page.locator(`#${feedbackId}`)).toHaveText(text);
}

async function prepareTwoBrowsers(browser: Browser, page: Page, testInfo: TestInfo) {
  const url = isolatedPartyUrl(testInfo);
  const otherContext = await browser.newContext({
    baseURL: "http://127.0.0.1:4173/the-drowned-compass/",
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

test("the Character Overview is keyboard operable, responsive, and persists focused fields", async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo, "&slowOverviewSaves=once"));
  await enterAs(page, "Player");
  await claimCharacter(page);

  const navigation = page.getByRole("navigation", { name: "Character Record sections" });
  for (const section of ["Overview", "Combat", "Magic", "Inventory", "Features", "Story"]) {
    await expect(navigation.getByRole("button", { name: section })).toBeVisible();
  }
  await expect(navigation.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await expect(navigation.getByRole("button", { name: "Combat" })).toBeDisabled();

  const characterName = page.getByLabel("Character name", { exact: true });
  await characterName.fill("Neris Stormwake");
  await characterName.press("Enter");
  await expectSaveFeedback(page, characterName, "Saving…");
  await expectSaveFeedback(page, characterName, "Saved");
  const editedAbilities = {
    Strength: "10",
    Dexterity: "18",
    Constitution: "14",
    Intelligence: "15",
    Wisdom: "13",
    Charisma: "12",
  };
  for (const [label, value] of Object.entries(editedAbilities)) {
    await saveInput(page, label, value);
  }
  await saveInput(page, "Armor Class", "16");
  await saveInput(page, "Maximum Hit Points", "24");
  await saveInput(page, "Speed (feet)", "35");

  const wisdomSave = page.getByLabel("Wisdom saving throw proficiency");
  await wisdomSave.check();
  await expectSaveFeedback(page, wisdomSave, "Saved");

  await page.getByLabel("Perception", { exact: true }).selectOption("proficient");
  await expectSaveFeedback(page, page.getByLabel("Perception", { exact: true }), "Saved");
  await page.getByLabel("Spellcasting Ability").selectOption("wisdom");
  await expectSaveFeedback(page, page.getByLabel("Spellcasting Ability"), "Saved");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.reload();
  await openClaimedCharacter(page);
  await expect(page.getByLabel("Character name", { exact: true })).toHaveValue("Neris Stormwake");
  for (const [label, value] of Object.entries(editedAbilities)) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  }
  await expect(page.getByLabel("Armor Class")).toHaveValue("16");
  await expect(page.getByLabel("Maximum Hit Points")).toHaveValue("24");
  await expect(page.getByLabel("Speed (feet)")).toHaveValue("35");
  await expect(page.getByLabel("Wisdom saving throw proficiency")).toBeChecked();
  await expect(page.getByLabel("Perception", { exact: true })).toHaveValue("proficient");
  await expect(page.getByLabel("Spellcasting Ability")).toHaveValue("wisdom");
});

test("a rejected save stays visible and retries without losing the draft", async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo, "&failOverviewSaves=once"));
  await enterAs(page, "Player");
  await claimCharacter(page);

  const armorClass = page.getByLabel("Armor Class");
  await armorClass.fill("17");
  await armorClass.press("Enter");
  const alert = page.getByRole("alert").filter({ hasText: "Not saved" });
  await expect(alert).toContainText("Not saved. Check your connection and retry.");
  await expect(armorClass).toHaveValue("17");
  await alert.getByRole("button", { name: "Retry" }).click();
  await expectSaveFeedback(page, armorClass, "Saved");
});

test("two signed-in browsers preserve different-field edits and receive them live", async ({ browser, page }, testInfo) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, testInfo);

  await saveInput(page, "Armor Class", "17");
  await expect(otherPage.getByLabel("Armor Class")).toHaveValue("17");

  await saveInput(otherPage, "Speed (feet)", "40");
  await expect(page.getByLabel("Speed (feet)")).toHaveValue("40");
  await expect(page.getByLabel("Armor Class")).toHaveValue("17");
  await expect(otherPage.getByLabel("Armor Class")).toHaveValue("17");

  await otherContext.close();
});

test("two signed-in browsers visibly converge on the latest accepted same-field value", async ({ browser, page }, testInfo) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, testInfo);

  await saveInput(page, "Strength", "10");
  await expect(otherPage.getByLabel("Strength", { exact: true })).toHaveValue("10");

  await saveInput(otherPage, "Strength", "12");
  await expect(page.getByLabel("Strength", { exact: true })).toHaveValue("12");
  await expect(otherPage.getByLabel("Strength", { exact: true })).toHaveValue("12");

  await otherContext.close();
});
