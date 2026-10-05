import { test, expect } from "@playwright/test";
import {
  searchSpells,
  findSpell,
  validateSpellCatalog,
} from "../src/domain/spell-catalog";
const get = (name: string) => ({
  ...searchSpells().find((s) => s.name === name)!,
  description: searchSpells()
    .find((s) => s.name === name)!
    .description.replace(/\s+/g, " "),
});
test("official SRD set has 339 unique spells, full level coverage and validated metadata", () => {
  const spells = searchSpells();
  expect(spells).toHaveLength(339);
  expect(() => validateSpellCatalog(spells)).not.toThrow();
  expect(
    Array.from({ length: 10 }, (_, level) => searchSpells({ level }).length),
  ).toEqual([27, 57, 57, 42, 34, 38, 31, 20, 17, 16]);
  expect(findSpell("unknown")).toBeUndefined();
  expect(() => validateSpellCatalog(spells.slice(1))).toThrow();
  expect(() =>
    validateSpellCatalog(
      spells.map((s, i) =>
        i === 0 ? { ...s, source: { ...s.source, version: "5.1" } } : s,
      ),
    ),
  ).toThrow();
});
test("representative rules match independent official PDF anchors, including revised 2024 mechanics", () => {
  expect(get("Cure Wounds")).toMatchObject({
    level: 1,
    school: "Abjuration",
    range: "Touch",
    source: { page: 121 },
  });
  expect(get("Cure Wounds").description).toContain(
    "2d8 plus your spellcasting ability modifier",
  );
  expect(get("Cure Wounds").higherLevel).toContain("increases by 2d8");
  expect(get("Counterspell").description).toContain(
    "Constitution saving throw",
  );
  expect(get("Counterspell").description).toContain("the slot isn’t expended");
  expect(get("Counterspell").castingTime).toContain(
    "Verbal, Somatic, or Material",
  );
  expect(get("True Strike").description).toContain(
    "spellcasting ability for the attack and damage rolls",
  );
  expect(get("True Strike").higherLevel).toContain("17 (3d6)");
  expect(get("Find Familiar")).toMatchObject({
    ritual: true,
    material: "burning incense worth 10+ GP, which the spell consumes",
  });
  expect(get("Conjure Animals").description).toContain("3d10 Slashing damage");
  expect(get("Fireball")).toMatchObject({
    range: "150 feet",
    material: "a ball of bat guano and sulfur",
  });
  expect(get("Fireball").description).toContain("8d6 Fire damage");
  expect(get("Fireball").higherLevel).toBe(
    "Using a Higher-Level Spell Slot. The damage increases by 1d6 for each spell slot level above 3.",
  );
  expect(get("Wish").description).toContain("33 percent chance");
  expect(get("Wish").source.page).toBe(175);
});
test("floating creature stat blocks stay with their owning spell and outside scaling effects", () => {
  for (const [spell, block] of [
    ["Animate Objects", "Animated Object"],
    ["Find Steed", "Otherworldly Steed"],
    ["Giant Insect", "Giant Insect"],
    ["Summon Dragon", "Draconic Spirit"],
  ]) {
    expect(get(spell).statBlock).toContain(block);
    expect(get(spell).statBlock).toContain("MOD SAVE");
    expect(get(spell).higherLevel).not.toContain("MOD SAVE");
  }
  expect(get("Antipathy/Sympathy").description).toContain(
    "immune to it for 1 minute",
  );
  expect(get("Antipathy/Sympathy").statBlock).toBeNull();
  expect(get("Fireball").statBlock).toBeNull();
});
test("name and all six filters compose, including false flags and cantrips", () => {
  expect(searchSpells({ name: "  FIREBALL " }).map((s) => s.name)).toEqual([
    "Delayed Blast Fireball",
    "Fireball",
  ]);
  expect(searchSpells({ name: "zzzz" })).toHaveLength(0);
  expect(searchSpells({ level: 0 }).every((s) => s.level === 0)).toBe(true);
  expect(
    searchSpells({
      class: "Wizard",
      school: "Abjuration",
      level: 1,
      ritual: true,
      concentration: false,
    }).map((s) => s.name),
  ).toEqual(["Alarm"]);
  expect(
    searchSpells({ ritual: false, concentration: true }).every(
      (s) => !s.ritual && s.concentration,
    ),
  ).toBe(true);
});

test("table outcomes preserve source columns and all rows", () => {
  expect(get("Teleport").tables[0]).toMatchObject({
    headers: [
      "Familiarity",
      "Mishap",
      "Similar Area",
      "Off Target",
      "On Target",
    ],
  });
  expect(get("Teleport").tables[0].rows[4]).toEqual([
    "Viewed once or described",
    "01–43",
    "44–53",
    "54–73",
    "74–00",
  ]);
  expect(get("Reincarnate").tables[0].rows).toHaveLength(10);
  expect(get("Reincarnate").tables[0].rows[5]).toEqual(["6", "Goliath"]);
  expect(searchSpells({ name: "Confusion" })[0].description).toContain("\n");
});
