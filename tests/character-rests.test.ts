import { test, expect } from '@playwright/test';
import { previewRest, applyRestCommand, validateRestCommand, type RestCommand } from '../src/domain/character-rests';
import { initialSurvival } from '../src/domain/survival';
import { abilityScoreKeys, skillKeys, type CharacterRecord } from '../src/domain/party';
function character(): CharacterRecord { return {
  playerName: 'Mara', characterName: 'Neris', primaryClass: 'Fighter', subclass: '', species: '', background: '', level: 3,
  abilityScores: Object.fromEntries(abilityScoreKeys.map(k => [k, 10])) as CharacterRecord['abilityScores'],
  savingThrowProficiencies: Object.fromEntries(abilityScoreKeys.map(k => [k, 'none'])) as CharacterRecord['savingThrowProficiencies'],
  skillProficiencies: Object.fromEntries(skillKeys.map(k => [k, 'none'])) as CharacterRecord['skillProficiencies'],
  armorClass: 10, speed: 30, spellcastingAbility: null, derivedOverrides: {}, fieldVersions: { maxHitPoints: 2 }, maxHitPoints: 20,
  survival: { ...initialSurvival(), current: 3, temporary: 7, successes: 2, failures: 1, unconscious: true, inspiration: true, version: 3, undo: { before: { current: 2, temporary: 7 }, maximumVersion: 2, label: 'add' } },
  limitedResources: ['Short Rest', 'Long Rest', 'Dawn', 'Manual'].map((recovery, i) => ({ id: `11111111-1111-4111-8111-11111111111${i}`, name: recovery, recovery: recovery as 'Short Rest', maximum: 3, current: 1, version: 2, deleted: false, important: i === 0, position: i })),
  magic: { spells: [], slots: [{ id: 'slots.1', level: 1, maximum: 3, remaining: 1, version: 4 }, { id: 'slots.2', level: 2, maximum: 0, remaining: 0, version: 1 }] },
}; }
const command = (c: CharacterRecord, rest: 'Short Rest' | 'Long Rest' = 'Long Rest'): RestCommand => ({ operationId: '22222222-2222-4222-8222-222222222222', rest, changes: previewRest(c, rest).map(p => p.change) });
test('Short Rest proposes only eligible non-full saved resources without mutation', () => {
  const c = character(), before = structuredClone(c); expect(previewRest(c, 'Short Rest').map(p => p.label)).toEqual(['Short Rest']); expect(c).toEqual(before);
});
test('Long Rest previews all changes with counts and excludes Dawn, Manual and zero/full records', () => {
  expect(previewRest(character(), 'Long Rest').map(p => p.label)).toEqual(['Short Rest', 'Long Rest', 'Current Hit Points', 'Death save successes', 'Death save failures', 'Level 1 spell slots']);
});
test('all selected changes commit together, one Survival version, preserving legacy and unrelated data', () => {
  const c = character(), before = structuredClone(c); expect(applyRestCommand(c, command(c))).toBe(true);
  expect(c.survival).toMatchObject({ current: 20, temporary: 7, successes: 0, failures: 0, unconscious: true, inspiration: true, version: 4, undo: null });
  expect(c.magic!.slots[0]).toMatchObject({ remaining: 3, maximum: 3, version: 5 }); expect(c.magic!.slots[1]).toEqual(before.magic!.slots[1]);
  expect(c.limitedResources!.map(r => r.current)).toEqual([3, 3, 1, 1]); expect(c.limitedResources![0].important).toBe(true); expect(c.characterName).toBe(before.characterName);
});
test('individual HP, death-save and resource exclusions impose no version prerequisites', () => {
  const c = character(), cmd = command(c); cmd.changes = cmd.changes.filter(p => p.kind === 'slots'); c.survival!.version++; c.fieldVersions.maxHitPoints!++; c.limitedResources![0].version++;
  const before = structuredClone(c); expect(applyRestCommand(c, cmd)).toBe(true); expect(c.survival).toEqual(before.survival); expect(c.limitedResources).toEqual(before.limitedResources);
});
test('successes and failures are independently selectable; excluded failure and undo survive', () => {
  const c = character(), cmd = command(c); cmd.changes = cmd.changes.filter(p => p.kind === 'health' && p.field === 'successes');
  expect(applyRestCommand(c, cmd)).toBe(true); expect(c.survival).toMatchObject({ successes: 0, failures: 1, current: 3 }); expect(c.survival!.undo).not.toBeNull();
});
for (const mutation of ['resource', 'removed', 'missing', 'timing', 'slots', 'health', 'maximum'] as const) test(`stale ${mutation} conflicts without any selected writes`, () => {
  const c = character(), cmd = command(c);
  if (mutation === 'resource') c.limitedResources![0].version++;
  if (mutation === 'removed') c.limitedResources![0].deleted = true;
  if (mutation === 'missing') c.limitedResources!.shift();
  if (mutation === 'timing') c.limitedResources![0].recovery = 'Manual';
  if (mutation === 'slots') c.magic!.slots[0].version++;
  if (mutation === 'health') c.survival!.version++;
  if (mutation === 'maximum') c.fieldVersions.maxHitPoints!++;
  const before = structuredClone(c); expect(applyRestCommand(c, cmd)).toBe(false); expect(c).toEqual(before);
});
test('unrelated concurrent records and field writes do not block a rest', () => {
  const c = character(), cmd = command(c); c.characterName = 'New name'; c.fieldVersions.characterName = 5; c.limitedResources![2].current = 0; c.limitedResources![2].version++;
  expect(applyRestCommand(c, cmd)).toBe(true); expect(c.characterName).toBe('New name'); expect(c.limitedResources![2].current).toBe(0);
});
for (const maximum of [1, 20]) test(`unknown HP explicitly proposes saved maximum ${maximum}`, () => {
  const c = character(); c.maxHitPoints = maximum; c.survival!.current = null;
  expect(previewRest(c, 'Long Rest').find(p => p.label === 'Current Hit Points')).toMatchObject({ before: 'Unknown', after: String(maximum) }); expect(applyRestCommand(c, command(c))).toBe(true); expect(c.survival!.current).toBe(maximum);
});
test('receipt replay after unrelated actions does not apply recovery twice or undo new spending', () => {
  const c = character(), cmd = command(c); applyRestCommand(c, cmd); c.magic!.slots[0].remaining--; c.magic!.slots[0].version++; c.characterName = 'New';
  const before = structuredClone(c); expect(applyRestCommand(c, cmd)).toBe(true); expect(c).toEqual(before);
});
test('same operation identity cannot accept different selection', () => {
  const c = character(), cmd = command(c); applyRestCommand(c, cmd); expect(() => applyRestCommand(c, { ...cmd, changes: cmd.changes.slice(1) })).toThrow('identity');
});
test('superseded receipts cannot silently replay old recovery', () => {
  const c = character(), first = command(c); applyRestCommand(c, first); c.magic!.slots[0].remaining--; c.magic!.slots[0].version++;
  const second = { ...command(c), operationId: '33333333-3333-4333-8333-333333333333' }; applyRestCommand(c, second);
  const before = structuredClone(c); expect(applyRestCommand(c, first)).toBe(false); expect(c).toEqual(before);
});
for (const bad of [null, {}, { operationId: 'bad', rest: 'Long Rest', changes: [] }, { ...command(character()), changes: [] }, { ...command(character()), changes: [{ kind: 'health', field: 'temporary', expectedVersion: 3 }] }, { ...command(character()), rest: 'Short Rest' }, { ...command(character()), changes: [{ kind: 'slots', level: 1, expectedVersion: Number.MAX_SAFE_INTEGER }] }, { ...command(character()), changes: [{ kind: 'resource', id: '11111111-1111-4111-8111-111111111110', expectedVersion: 2147483647 }] }, { ...command(character()), changes: [{ kind: 'slots', level: 1, expectedVersion: 1 }, { kind: 'slots', level: 1, expectedVersion: 1 }] }] ) test(`invalid rest rejected ${JSON.stringify(bad)}`, () => expect(() => validateRestCommand(bad as RestCommand)).toThrow());
