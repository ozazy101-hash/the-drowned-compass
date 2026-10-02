import { test, createPartyBrowserContext } from "./browser-fixtures";
import { expect, type Page } from "@playwright/test";
import { claimCharacter, enterAs, expectSaveFeedback, isolatedPartyUrl, openClaimedCharacter, prepareTwoBrowsers, saveInput } from "./overview-helpers";

function card(page: Page) { return page.getByRole("article", { name: /Neris .+, played by Mara/ }); }
async function back(page: Page) { await page.getByRole("button", { name: "Back to the Party" }).click(); }
async function override(page: Page, label: string, next: string) {
  await page.getByRole("button", { name: `Override ${label}`, exact: true }).click();
  await saveInput(page, `${label} override`, next);
}

test("Party cards show accepted identity, health, defences and effective abilities, persist, and open by keyboard", async ({ page }, testInfo) => {
  await page.goto(isolatedPartyUrl(testInfo));
  await enterAs(page, "Player");
  await claimCharacter(page);
  await saveInput(page, "Maximum Hit Points", "28");
  await saveInput(page, "Armor Class", "16");
  await back(page);
  await expect(card(page)).toContainText("Played by Mara");
  await expect(card(page)).toContainText("Level 3 Rogue · Thief");
  await expect(card(page).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("28");
  await expect(card(page)).toContainText("Current HP unknown");
  await expect(card(page).getByText("Armor Class", { exact: true }).locator("..")).toContainText("16");
  const modifiers = { Strength: "-1", Dexterity: "+3", Constitution: "+1", Intelligence: "+2", Wisdom: "+1", Charisma: "+0" };
  for (const [ability, modifier] of Object.entries(modifiers)) {
    await expect(card(page).getByLabel(`${ability} modifier: ${modifier}`, { exact: true })).toBeVisible();
  }
  await expect(card(page).getByLabel("Passive Perception: 11", { exact: true })).toBeVisible();
  await expect(card(page).getByText("Spell save DC", { exact: true })).toHaveCount(0);
  await expect(page.getByText("1 of 6 claimed", { exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Unclaimed character slot" })).toHaveCount(5);

  const open = card(page).getByRole("button", { name: "Open Neris Vale Character Page" });
  await open.focus();
  await expect(open).toBeFocused();
  await open.press("Enter");
  await expect(page.getByRole("heading", { name: "Neris Vale", level: 1 })).toBeVisible();
  await page.getByLabel("Spellcasting Ability").selectOption("wisdom");
  await expectSaveFeedback(page, page.getByLabel("Spellcasting Ability"), "Saved");
  await saveInput(page, "Level", "5");
  await saveInput(page, "Primary class", "Cleric");
  await saveInput(page, "Subclass", "Life Domain");
  await back(page);
  await expect(card(page)).toContainText("Level 5 Cleric · Life Domain");
  await expect(card(page).getByLabel("Spell save DC: 12", { exact: true })).toBeVisible();
  await page.reload();
  await expect(card(page)).toContainText("Level 5 Cleric · Life Domain");
  await expect(card(page).getByLabel("Spell save DC: 12", { exact: true })).toBeVisible();
  await expect(card(page).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("28");
});

test("live cards follow dependent overrides, meaningful zero values and reset without reloading", async ({ browser, page }, testInfo) => {
  const { otherPage, otherContext } = await prepareTwoBrowsers(browser, page, testInfo);
  await back(otherPage);
  await override(page, "Wisdom modifier", "4");
  await expect(card(otherPage).getByLabel("Wisdom modifier: +4 (override)", { exact: true })).toBeVisible();
  await expect(card(otherPage).getByLabel("Passive Perception: 14", { exact: true })).toBeVisible();
  await override(page, "Perception modifier", "8");
  await expect(card(otherPage).getByLabel("Passive Perception: 18", { exact: true })).toBeVisible();
  await override(page, "Dexterity modifier", "0");
  await expect(card(otherPage).getByLabel("Dexterity modifier: +0 (override)", { exact: true })).toBeVisible();
  await override(page, "Passive Perception", "0");
  await expect(card(otherPage).getByLabel("Passive Perception: 0 (override)", { exact: true })).toBeVisible();
  // An explicit DC applies even when no spellcasting Ability has been selected.
  await override(page, "Spell save DC", "0");
  await expect(card(otherPage).getByLabel("Spell save DC: 0 (override)", { exact: true })).toBeVisible();
  await expect(card(otherPage).getByText("* Override", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset Spell save DC", exact: true }).click();
  await expect(card(otherPage).getByText("Spell save DC", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Reset Passive Perception", exact: true }).click();
  await expect(card(otherPage).getByLabel("Passive Perception: 18", { exact: true })).toBeVisible();
  await otherPage.reload();
  await expect(card(otherPage).getByLabel("Dexterity modifier: +0 (override)", { exact: true })).toBeVisible();
  await otherContext.close();
});

test("cards retain accepted values through save failure, independent edits and a stale same-field draft until Retry", async ({ browser, page }, testInfo) => {
  const url = isolatedPartyUrl(testInfo, "&failOverviewSaves=once");
  await page.goto(url); await enterAs(page, "Player"); await claimCharacter(page);
  const otherContext = await createPartyBrowserContext(browser, testInfo);
  const otherPage = await otherContext.newPage();
  await otherPage.goto(isolatedPartyUrl(testInfo)); await enterAs(otherPage, "Dungeon Master");
  await expect(card(otherPage)).toBeVisible();
  const input = page.getByLabel("Maximum Hit Points", { exact: true });
  await input.fill("28"); await input.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Not saved");
  await expect(input).toHaveValue("28");
  await expect(card(otherPage).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("1");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expectSaveFeedback(page, input, "Saved");
  await expect(card(otherPage).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("28");
  await openClaimedCharacter(otherPage);
  await input.fill("33");
  await saveInput(otherPage, "Maximum Hit Points", "40");
  await saveInput(otherPage, "Armor Class", "17");
  await expect(page.getByLabel("Armor Class", { exact: true })).toHaveValue("17");
  await back(otherPage);
  await input.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Changed elsewhere");
  await expect(input).toHaveValue("33");
  await expect(card(otherPage).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("40");
  await expect(card(otherPage).getByText("Armor Class", { exact: true }).locator("..")).toContainText("17");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expectSaveFeedback(page, input, "Saved");
  await expect(card(otherPage).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("33");
  await back(page); await page.reload();
  await expect(card(page).getByText("Armor Class", { exact: true }).locator("..")).toContainText("17");
  await expect(card(page).getByText("Maximum HP", { exact: true }).locator("..")).toContainText("33");
  await otherContext.close();
});

test("six claimed cards remain readable with health before secondary values and every card opens", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(isolatedPartyUrl(testInfo)); await enterAs(page, "Player");
  for (let position = 1; position <= 6; position += 1) {
    await claimCharacter(page);
    await saveInput(page, "Character name", `Neris ${position} of the Moonlit Undertow`);
    await back(page);
  }
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(6);
  await expect(page.getByText("6 of 6 claimed", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const positions = await cards.evaluateAll((elements) => elements.map((element) => {
    const bounds = element.getBoundingClientRect();
    const health = element.querySelector(".party-card__vitals")!.getBoundingClientRect();
    const abilities = element.querySelector(".party-card__abilities")!.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, healthY: health.y, abilitiesY: abilities.y };
  }));
  const phone = testInfo.project.name.startsWith("phone");
  expect(new Set(positions.map((position) => Math.round(position.x))).size).toBe(phone ? 1 : 3);
  expect(new Set(positions.map((position) => Math.round(position.y))).size).toBe(phone ? 6 : 2);
  for (const position of positions) {
    expect(position.width).toBeGreaterThan(280);
    expect(position.healthY).toBeLessThan(position.abilitiesY);
  }
  await page.screenshot({ path: `/tmp/drowned-compass-dashboard-${testInfo.project.name}.png`, fullPage: true });
  for (let position = 1; position <= 6; position += 1) {
    const name = `Neris ${position} of the Moonlit Undertow`;
    const open = page.getByRole("button", { name: `Open ${name} Character Page`, exact: true });
    await open.focus(); await open.press("Enter");
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await back(page);
  }
});
