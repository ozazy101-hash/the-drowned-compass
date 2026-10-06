import { abilityScoreKeys, identityFieldKeys, skillKeys, type CharacterRecord, type Party } from './party.ts';
import { derivedValueKeys } from './derived-values.ts';
import { characterClasses } from './character-classes.ts';
import { featuredAttackIds, emptyCombatEntries } from './combat-entries.ts';
import { initialSurvival } from './survival.ts';
import { emptyMagic } from './character-magic.ts';
export const backupOverviewKeys = [...identityFieldKeys, ...abilityScoreKeys, ...abilityScoreKeys.map(k => `save.${k}`), ...skillKeys.map(k => `skill.${k}`), 'armorClass', 'maxHitPoints', 'speed', 'spellcastingAbility', ...derivedValueKeys.map(k => `override.${k}`)];
const scalar = <T>(value: T): T => { if (value !== null && (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)))) throw new Error('The saved Party data has an unsupported field value.'); return value; };
const pick = <T extends object>(value: T, keys: readonly string[]) => Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, scalar((value as Record<string, unknown>)[key])]));
const byId = <T extends { id: string }>(records: T[]) => [...records].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
// Explicit nested projections: unknown fields never become part of a backup.
function projectCharacter(c: CharacterRecord) {
  const survival = c.survival ?? initialSurvival(), magic = c.magic ?? emptyMagic(), combat = c.combatEntries ?? emptyCombatEntries();
  return {
    playerName: scalar(c.playerName), characterName: scalar(c.characterName), primaryClass: scalar(c.primaryClass), subclass: scalar(c.subclass), species: scalar(c.species), background: scalar(c.background), level: scalar(c.level),
    abilityScores: pick(c.abilityScores, abilityScoreKeys), savingThrowProficiencies: pick(c.savingThrowProficiencies, abilityScoreKeys), skillProficiencies: pick(c.skillProficiencies, skillKeys),
    armorClass: scalar(c.armorClass), maxHitPoints: scalar(c.maxHitPoints), speed: scalar(c.speed), spellcastingAbility: scalar(c.spellcastingAbility),
    derivedOverrides: pick(c.derivedOverrides, derivedValueKeys), fieldVersions: pick(c.fieldVersions, backupOverviewKeys),
    classes: byId(characterClasses(c)).map(e => ({ id: scalar(e.id), name: scalar(e.name), level: scalar(e.level), deleted: scalar(e.deleted), version: scalar(e.version) })),
    survival: { current: scalar(survival.current), temporary: scalar(survival.temporary), successes: scalar(survival.successes), failures: scalar(survival.failures), unconscious: scalar(survival.unconscious), inspiration: scalar(survival.inspiration), version: scalar(survival.version),
      undo: survival.undo ? { before: { current: scalar(survival.undo.before.current), temporary: scalar(survival.undo.before.temporary) }, maximumVersion: scalar(survival.undo.maximumVersion), label: scalar(survival.undo.label) } : null },
    limitedResources: byId(c.limitedResources ?? []).map(r => ({ id: scalar(r.id), name: scalar(r.name), current: scalar(r.current), maximum: scalar(r.maximum), recovery: scalar(r.recovery), position: scalar(r.position), important: scalar(r.important), deleted: scalar(r.deleted), version: scalar(r.version) })),
    conditions: byId(c.conditions ?? []).map(e => ({ id: scalar(e.id), standard: scalar(e.standard), label: scalar(e.label), deleted: scalar(e.deleted), version: scalar(e.version) })),
    magic: { spells: byId(magic.spells).map(e => ({ id: scalar(e.id), catalogId: scalar(e.catalogId), name: scalar(e.name), level: scalar(e.level), availability: scalar(e.availability), source: scalar(e.source), notes: scalar(e.notes), deleted: scalar(e.deleted), version: scalar(e.version) })),
      slots: [...magic.slots].sort((a, b) => a.level - b.level).map(e => ({ id: scalar(e.id), level: scalar(e.level), maximum: scalar(e.maximum), remaining: scalar(e.remaining), version: scalar(e.version) })) },
    inventory: byId(c.inventory ?? []).map(e => ({ id: scalar(e.id), kind: scalar(e.kind), title: scalar(e.title), body: scalar(e.body), rank: scalar(e.rank), deleted: scalar(e.deleted), version: scalar(e.version) })),
    textEntries: byId(c.textEntries ?? []).map(e => ({ id: scalar(e.id), kind: scalar(e.kind), title: scalar(e.title), body: scalar(e.body), deleted: scalar(e.deleted), version: scalar(e.version) })),
    combatEntries: { entries: byId(combat.entries).map(e => ({ id: scalar(e.id), rank: scalar(e.rank), deleted: scalar(e.deleted), version: scalar(e.version),
      details: { kind: scalar(e.details.kind), category: scalar(e.details.category ?? 'other'), name: scalar(e.details.name), attackBonus: scalar(e.details.attackBonus), ability: scalar(e.details.ability), range: scalar(e.details.range), damage: scalar(e.details.damage), damageType: scalar(e.details.damageType), notes: scalar(e.details.notes) } })),
      primaryId: scalar(combat.primaryId), featuredIds: featuredAttackIds(combat).map(scalar), primaryVersion: scalar(combat.primaryVersion) },
  };
}
export function createPartyBackup(party: Party) {
  return {
    format: 'the-drowned-compass-party-data-backup' as const, schemaVersion: 1 as const,
    scope: { included: 'Saved Party Companion Character Records, Character Spells, Session Trackers and settings', excluded: 'Campaign story, world, sessions and Dungeon Master preparation; authentication and credentials' },
    catalog: { spells: 'SRD 5.2.1', identityPrefix: 'srd-5.2.1:' },
    settings: { partyName: scalar(party.name) },
    slots: [...party.slots].sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(s => ({ id: scalar(s.id), position: scalar(s.position), character: s.character ? projectCharacter(s.character) : null })),
  };
}
export type PartyBackup = ReturnType<typeof createPartyBackup>;
export function serializePartyBackup(backup: PartyBackup): string { return JSON.stringify(backup, null, 2) + '\n'; }
