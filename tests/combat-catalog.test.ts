import { expect, test } from '@playwright/test';
import { combatClasses, searchCombatCatalog, combatCatalogDraft, validateCombatCatalog } from '../src/domain/combat-catalog';
import { validateCombatDetails } from '../src/domain/combat-entries';

test('pinned SRD weapons and selected abilities retain source anchors and complete editable templates', () => {
  const all = searchCombatCatalog();
  expect(all).toHaveLength(79);
  expect(searchCombatCatalog({ kind: 'weapon' })).toHaveLength(38);
  expect(searchCombatCatalog({ kind: 'ability' })).toHaveLength(41);
  for (const cls of combatClasses) expect(searchCombatCatalog({ class: cls }).length).toBeGreaterThan(0);
  for (const entry of all) {
    const draft = combatCatalogDraft(entry);
    expect(() => validateCombatDetails(draft)).not.toThrow();
    expect(draft.attackBonus).toBe('');
    expect(draft.ability).toBeNull();
    expect(draft.notes).toContain(`#page=${entry.sourcePage}`);
    expect(draft.kind).toBe(entry.kind === 'weapon' ? 'attack' : 'action');
  }
  expect(() => validateCombatCatalog(all.slice(1))).toThrow();
  expect(() => validateCombatCatalog(all.map((e, i) => i === 0 ? { ...e, sourcePage: 0 } : e))).toThrow();
  expect(() => validateCombatCatalog(all.map((e, i) => i === 0 ? { ...e, id: all[1].id } : e))).toThrow();
});

test('official weapon-table anchors preserve 2024 base dice, range, properties and mastery', () => {
  const find = (name: string) => searchCombatCatalog({ kind: 'weapon', name }).find(e => e.name === name)!;
  expect(find('Dagger')).toMatchObject({ damage: '1d4', damageType: 'Piercing', mastery: 'Nick', range: '5 feet; thrown 20/60 feet', category: 'melee' });
  expect(find('Longsword')).toMatchObject({ damage: '1d8', properties: 'Versatile (1d10)', mastery: 'Sap' });
  expect(find('Lance')).toMatchObject({ damage: '1d10', range: '10 feet', properties: 'Heavy, Reach, Two-Handed (unless mounted)' });
  expect(find('Longbow')).toMatchObject({ damage: '1d8', range: '150/600 feet', category: 'ranged', mastery: 'Slow' });
  expect(find('Blowgun')).toMatchObject({ damage: '1', range: '25/100 feet' });
  expect(find('Musket')).toMatchObject({ damage: '1d12', range: '40/120 feet' });
});

test('name, class, type and inclusive class-level filters compose without enforcing character eligibility', () => {
  expect(searchCombatCatalog({ name: '  SNEAK  ', class: 'Rogue', kind: 'ability', maxLevel: 1 }).map(e => e.name)).toEqual(['Sneak Attack']);
  expect(searchCombatCatalog({ class: 'Rogue', maxLevel: 3 }).map(e => e.name)).toEqual(['Cunning Action', 'Sneak Attack', 'Steady Aim', 'Weapon Mastery']);
  expect(searchCombatCatalog({ class: 'Fighter', name: 'surge', maxLevel: 1 })).toHaveLength(0);
  expect(searchCombatCatalog({ class: 'Fighter', name: 'surge', maxLevel: 2 })).toHaveLength(1);
  expect(searchCombatCatalog({ name: 'not in the catalog' })).toHaveLength(0);
  const sneak = searchCombatCatalog({ name: 'Sneak Attack' })[0];
  expect(sneak).toMatchObject({ sourcePage: 61, use: 'Attack modifier' });
  expect(sneak.summary).toContain('Once per turn');
  expect(sneak.summary).toContain('Finesse or Ranged');
  expect(combatCatalogDraft(sneak)).toMatchObject({ kind: 'action', damage: '', attackBonus: '' });
});
