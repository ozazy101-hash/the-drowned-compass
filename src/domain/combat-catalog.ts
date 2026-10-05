import data from '../data/srd/combat-5.2.1.json' with { type: 'json' };
import type { CombatEntryDetails } from './combat-entries';
import { srdSource } from './rules-reference';

export type CombatCatalogEntry = {
  id: string;
  name: string;
  kind: 'weapon' | 'ability';
  weaponGroup: string | null;
  classes: string[];
  level: number | null;
  use: string;
  summary: string;
  properties: string;
  mastery: string;
  damage: string;
  damageType: string;
  range: string;
  category: 'melee' | 'ranged' | 'other';
  sourcePage: number;
};
export const combatClasses = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'] as const;
export type CombatCatalogFilters = { name?: string; kind?: CombatCatalogEntry['kind']; class?: string; maxLevel?: number };

export function validateCombatCatalog(input: unknown): asserts input is CombatCatalogEntry[] {
  if (!Array.isArray(input) || input.length !== 79) throw new Error('Expected the pinned 79-entry Combat Catalog.');
  const ids = new Set<string>();
  for (const entry of input) {
    if (!entry || typeof entry !== 'object' || !['weapon', 'ability'].includes(entry.kind) || !['melee', 'ranged', 'other'].includes(entry.category)) throw new Error('Invalid Combat Catalog entry.');
    for (const key of ['id', 'name', 'use', 'summary', 'properties', 'mastery', 'damage', 'damageType', 'range']) {
      if (typeof entry[key] !== 'string') throw new Error('Missing Combat Catalog text.');
    }
    if (!entry.name.trim() || !entry.summary.trim() || !entry.id.startsWith('srd-5.2.1-') || ids.has(entry.id)) throw new Error('Invalid or duplicate Combat Catalog ID.');
    ids.add(entry.id);
    if (!Number.isInteger(entry.sourcePage) || entry.sourcePage < 28 || entry.sourcePage > 91) throw new Error('Invalid SRD page.');
    if (!Array.isArray(entry.classes) || entry.classes.some((c: string) => !(combatClasses as readonly string[]).includes(c))) throw new Error('Invalid class.');
    if (entry.kind === 'weapon') {
      if (entry.level !== null || entry.classes.length || !['Simple Melee', 'Simple Ranged', 'Martial Melee', 'Martial Ranged'].includes(entry.weaponGroup) || !entry.damage || !entry.range || !entry.mastery) throw new Error('Incomplete weapon.');
    } else if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > 20 || entry.classes.length !== 1 || entry.weaponGroup !== null) throw new Error('Incomplete class ability.');
  }
}
function loadCatalog(): CombatCatalogEntry[] {
  const input: unknown = data;
  validateCombatCatalog(input);
  return input;
}
const catalog = loadCatalog();
export function searchCombatCatalog(filters: CombatCatalogFilters = {}): CombatCatalogEntry[] {
  const name = filters.name?.trim().toLocaleLowerCase() ?? '';
  return catalog.filter(e => (!name || e.name.toLocaleLowerCase().includes(name)) && (!filters.kind || e.kind === filters.kind) && (!filters.class || e.classes.includes(filters.class)) && (filters.maxLevel === undefined || e.level === null || e.level <= filters.maxLevel)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export function combatCatalogDraft(entry: CombatCatalogEntry): CombatEntryDetails {
  const weapon = entry.kind === 'weapon';
  return {
    kind: weapon ? 'attack' : 'action', category: entry.category, name: entry.name,
    attackBonus: '', ability: null, range: entry.range, damage: entry.damage, damageType: entry.damageType,
    notes: [
      `SRD 5.2.1 · ${entry.name}${weapon ? '' : ` (${entry.classes.join(', ')} level ${entry.level}; ${entry.use})`}`,
      weapon ? `Properties: ${entry.properties}. Mastery: ${entry.mastery} (requires an eligible feature). Base weapon dice only; enter your own total damage and attack bonus.` : `Rules summary: ${entry.summary}`,
      `Source: ${srdSource}#page=${entry.sourcePage}`,
    ].join('\n\n'),
  };
}
