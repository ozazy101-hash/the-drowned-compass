import bundled from "../data/srd/spells-5.2.1.json" with { type: "json" };
import { srdSource } from "./rules-reference";
export type CatalogSpell = Omit<
  Readonly<(typeof bundled)[number]>,
  "classes"
> & { readonly classes: readonly string[] };
export type SpellFilters = {
  name?: string;
  level?: number;
  class?: string;
  school?: string;
  ritual?: boolean;
  concentration?: boolean;
};
export const spellCatalogVersion = "5.2.1";
export const spellCatalogSource = srdSource;
export const spellClasses = [
  "Bard",
  "Cleric",
  "Druid",
  "Paladin",
  "Ranger",
  "Sorcerer",
  "Warlock",
  "Wizard",
] as const;
export const spellSchools = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation",
] as const;
export function validateSpellCatalog(spells: readonly CatalogSpell[]): void {
  const levels = [27, 57, 57, 42, 34, 38, 31, 20, 17, 16];
  if (
    spells.length !== 339 ||
    new Set(spells.map((s) => s.id)).size !== 339 ||
    new Set(spells.map((s) => s.name.toLowerCase())).size !== 339
  )
    throw new Error("Expected 339 unique SRD 5.2.1 spells");
  for (const [level, count] of levels.entries())
    if (spells.filter((s) => s.level === level).length !== count)
      throw new Error(`Invalid level ${level} coverage`);
  for (const s of spells) {
    if (
      ![
        s.id,
        s.name,
        s.castingTime,
        s.range,
        s.components,
        s.duration,
        s.description,
      ].every((v) => typeof v === "string" && v.trim()) ||
      !s.id.startsWith("srd-5.2.1:") ||
      !spellSchools.some((v) => v === s.school) ||
      !s.classes.length ||
      !s.classes.every((c) => spellClasses.some((v) => v === c)) ||
      typeof s.ritual !== "boolean" ||
      typeof s.concentration !== "boolean" ||
      s.ritual !== s.castingTime.includes("Ritual") ||
      s.concentration !== s.duration.includes("Concentration") ||
      s.components.includes("M") !== !!s.material ||
      s.source.version !== "5.2.1" ||
      s.source.license !== "CC-BY-4.0" ||
      !Number.isInteger(s.source.page) ||
      s.source.page < 107 ||
      s.source.page > 175
    )
      throw new Error(`Invalid SRD spell: ${s.name}`);
  }
}
validateSpellCatalog(bundled);
const catalog: readonly CatalogSpell[] = bundled.map((s) =>
  Object.freeze({
    ...s,
    classes: Object.freeze([...s.classes]),
    source: Object.freeze({ ...s.source }),
  }),
);
export function searchSpells(
  filters: SpellFilters = {},
): readonly CatalogSpell[] {
  const name = filters.name?.trim().toLowerCase() ?? "";
  return catalog
    .filter(
      (s) =>
        s.name.toLowerCase().includes(name) &&
        (filters.level === undefined || s.level === filters.level) &&
        (!filters.class || s.classes.includes(filters.class)) &&
        (!filters.school || s.school === filters.school) &&
        (filters.ritual === undefined || s.ritual === filters.ritual) &&
        (filters.concentration === undefined ||
          s.concentration === filters.concentration),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function findSpell(id: string): CatalogSpell | undefined {
  return catalog.find((s) => s.id === id);
}
