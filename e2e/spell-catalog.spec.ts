import { test } from "./browser-fixtures";
import { expect } from "@playwright/test";
import { enterAs, claimCharacter, isolatedPartyUrl } from "./overview-helpers";
test("Magic searches and composes filters, presents complete spell rules and works offline", async ({
  page,
}, info) => {
  await page.goto(isolatedPartyUrl(info));
  await enterAs(page, "Player");
  await claimCharacter(page);
  await page.getByRole("button", { name: "Magic", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "339 matching spells" }),
  ).toBeVisible();
  await page.getByLabel("Spell level", { exact: true }).selectOption("1");
  await page.getByLabel("Spell class", { exact: true }).selectOption("Wizard");
  await page
    .getByLabel("Spell school", { exact: true })
    .selectOption("Abjuration");
  await page.getByLabel("Ritual", { exact: true }).selectOption("true");
  await page.getByLabel("Concentration", { exact: true }).selectOption("false");
  await page.getByLabel("Search spells by name").fill("al");
  await expect(
    page.getByRole("list", { name: "Matching spells" }).getByRole("button"),
  ).toHaveCount(1);
  await page
    .getByRole("list", { name: "Matching spells" })
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("article", { name: "Alarm spell details" }),
  ).toContainText("a bell and silver wire");
  await page.getByRole("button", { name: "Clear spell filters" }).click();
  await page.getByLabel("Search spells by name").fill("zzzz");
  await expect(
    page.getByText("No spells match. Clear or adjust the filters."),
  ).toBeVisible();
  await page.context().setOffline(true);
  await page.getByLabel("Search spells by name").fill("hold person");
  await page
    .getByRole("list", { name: "Matching spells" })
    .getByRole("button")
    .click();
  const detail = page.getByRole("article", {
    name: "Hold Person spell details",
  });
  for (const label of [
    "Casting time",
    "Range",
    "Components",
    "Material component",
    "Duration",
    "Concentration",
    "Ritual",
    "Description",
    "Higher-level effect",
  ])
    await expect(
      detail.getByText(label, { exact: true }).first(),
    ).toBeVisible();
  const term = detail
    .getByRole("button", { name: "Paralyzed rules", exact: true })
    .first();
  await term.click();
  await expect(
    page.getByRole("dialog", { name: "Paralyzed", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Paralyzed", exact: true })
    .getByRole("button", { name: "Incapacitated", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Incapacitated", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Paralyzed", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(term).toBeFocused();
  await page.getByText("About / Legal", { exact: true }).click();
  await expect(page.locator(".srd-legal")).toContainText(
    "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.",
  );
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => innerWidth),
  );
  await page.context().setOffline(false);
});

test("spell tables retain headers and row associations on laptop and phone", async ({
  page,
}, info) => {
  await page.goto(isolatedPartyUrl(info));
  await enterAs(page, "Player");
  await claimCharacter(page);
  await page.getByRole("button", { name: "Magic", exact: true }).click();
  await page.getByLabel("Search spells by name").fill("teleport");
  await page
    .getByRole("list", { name: "Matching spells" })
    .getByRole("button", {
      name: "Teleport Level 7 · Conjuration",
      exact: true,
    })
    .click();
  const teleport = page.getByRole("table", { name: "Teleportation Outcome" });
  await expect(teleport.getByRole("columnheader")).toHaveText([
    "Familiarity",
    "Mishap",
    "Similar Area",
    "Off Target",
    "On Target",
  ]);
  await expect(
    teleport.getByRole("row", {
      name: "Viewed once or described 01–43 44–53 54–73 74–00",
    }),
  ).toBeVisible();
  await page.getByLabel("Search spells by name").fill("reincarnate");
  await page
    .getByRole("list", { name: "Matching spells" })
    .getByRole("button")
    .click();
  const species = page.getByRole("table", { name: "Reincarnate species" });
  await expect(species.getByRole("row")).toHaveCount(11);
  await expect(
    species.getByRole("row", { name: "6 Goliath", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => innerWidth),
  );
});
