import { test } from "./browser-fixtures";
import { expect } from "@playwright/test";
import { enterAs, isolatedPartyUrl, claimCharacter, openClaimedCharacter, saveInput, expectSaveFeedback, prepareTwoBrowsers } from "./overview-helpers";

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
  await wisdomSave.selectOption("proficient");
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
  await expect(page.getByLabel("Wisdom saving throw proficiency")).toHaveValue("proficient");
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

test("typing during a pending save preserves the newer unsaved draft", async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo));
  await enterAs(page, "Player");
  await claimCharacter(page);

  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  let responseReady!: () => void;
  const ready = new Promise<void>((resolve) => { responseReady = resolve; });
  await page.route("**/__drowned_compass_test_party?*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    responseReady();
    await responseGate;
    await route.fulfill({ response });
  });

  const name = page.getByLabel("Character name", { exact: true });
  await name.fill("Neris Stormwake");
  await name.press("Enter");
  await ready;
  await name.fill("Neris Tidekeeper");
  releaseResponse();

  const alert = page.getByRole("alert").filter({ hasText: "newer changes" });
  await expect(alert).toBeVisible();
  await expect(name).toHaveValue("Neris Tidekeeper");
  await alert.getByRole("button", { name: "Retry" }).click();
  await expectSaveFeedback(page, name, "Saved");
  await page.reload();
  await openClaimedCharacter(page);
  await expect(page.getByLabel("Character name", { exact: true })).toHaveValue("Neris Tidekeeper");
});

test("a delayed save response does not replace newer realtime fields", async ({ browser, page }, testInfo) => {
  const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, testInfo);
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  let responseReady!: () => void;
  const ready = new Promise<void>((resolve) => { responseReady = resolve; });
  await page.route("**/__drowned_compass_test_party?*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    responseReady();
    await responseGate;
    await route.fulfill({ response });
  });

  const armorClass = page.getByLabel("Armor Class");
  await armorClass.fill("17");
  await armorClass.press("Enter");
  await ready;
  await expect(otherPage.getByLabel("Armor Class")).toHaveValue("17");
  await saveInput(otherPage, "Speed (feet)", "40");
  await expect(page.getByLabel("Speed (feet)")).toHaveValue("40");
  await saveInput(otherPage, "Armor Class", "18");
  releaseResponse();
  await expectSaveFeedback(page, armorClass, "Saved");
  await expect(page.getByLabel("Speed (feet)")).toHaveValue("40");
  await expect(armorClass).toHaveValue("18");
  await otherContext.close();
});

for (const controlType of ["skill", "saving throw"] as const) {
  test(`a conflicting ${controlType} choice preserves its draft for retry`, async ({ browser, page }, testInfo) => {
    const { otherContext, otherPage } = await prepareTwoBrowsers(browser, page, testInfo);
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => { releaseRequest = resolve; });
    let requestReady!: () => void;
    const ready = new Promise<void>((resolve) => { requestReady = resolve; });
    let held = false;
    await page.route("**/__drowned_compass_test_party?*", async (route) => {
      if (route.request().method() !== "PATCH" || held) return route.continue();
      held = true;
      requestReady();
      await requestGate;
      await route.continue();
    });

    const label = controlType === "skill" ? "Perception" : "Wisdom saving throw proficiency";
    const control = page.getByLabel(label, { exact: true });
    const otherControl = otherPage.getByLabel(label, { exact: true });
    if (controlType === "skill") await control.selectOption("expertise");
    else await control.selectOption("proficient");
    await ready;
    await expectSaveFeedback(page, control, "Saving…");
    if (controlType === "skill") await otherControl.selectOption("proficient");
    else await otherControl.selectOption("expertise");
    await expectSaveFeedback(otherPage, otherControl, "Saved");
    await saveInput(otherPage, "Speed (feet)", "40");
    await expect(page.getByLabel("Speed (feet)")).toHaveValue("40");
    releaseRequest();

    const alert = page.getByRole("alert").filter({ hasText: "Changed elsewhere" });
    await expect(alert).toBeVisible();
    if (controlType === "skill") await expect(control).toHaveValue("expertise");
    else await expect(control).toHaveValue("proficient");
    await alert.getByRole("button", { name: "Retry" }).click();
    await expectSaveFeedback(page, control, "Saved");
    if (controlType === "skill") await expect(otherControl).toHaveValue("expertise");
    else await expect(otherControl).toHaveValue("proficient");
    await otherContext.close();
  });
}

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
