import { test, expect } from '@playwright/test';
import { applyMagicCommand, emptyMagic, mergeMagic, availabilityKinds, type CharacterSpell, type MagicCommand } from '../src/domain/character-magic';
import { findSpell } from '../src/domain/spell-catalog';
const spell: Omit<CharacterSpell, 'version'> = { id: 'srd-5.2.1:acid-splash', catalogId: 'srd-5.2.1:acid-splash', name: '', level: 0, availability: 'Known', source: '', notes: '', deleted: false };
const custom = { ...spell, id: 'custom.11111111-1111-4111-8111-111111111111', catalogId: null, name: 'Sea Lantern', level: 2 };
const command = (s = spell, expectedVersion = 0): MagicCommand => ({ kind: 'spell', spell: s, expectedVersion });
test('catalog association stores identity and availability without copied catalog rules', () => {
  const state = emptyMagic(); applyMagicCommand(state, command());
  expect(state.spells[0]).toEqual({ ...spell, version: 1 });
  expect(findSpell(state.spells[0].catalogId!)?.description).toBeTruthy();
  expect(state.spells[0]).not.toHaveProperty('description');
});
test('independent spell writes, removal and re-add preserve CAS and tombstones', () => {
  const state = emptyMagic();
  expect(applyMagicCommand(state, command())).toBe(true); expect(applyMagicCommand(state, command(custom))).toBe(true);
  expect(applyMagicCommand(state, command())).toBe(false);
  const old = structuredClone(state);
  expect(applyMagicCommand(state, command({ ...spell, deleted: true }, 1))).toBe(true);
  expect(mergeMagic(state, old)).toEqual(state);
  expect(applyMagicCommand(state, command(spell, 1))).toBe(false);
  expect(applyMagicCommand(state, command(spell, 2))).toBe(true);
  expect(state.spells[1]).toEqual({ ...custom, version: 1 });
});
for (const availability of availabilityKinds) test(`${availability} has manual state and source`, () => {
  const state = emptyMagic(); expect(applyMagicCommand(state, command({ ...custom, availability, source: ' Moon gift ' }))).toBe(true);
  expect(state.spells[0].source).toBe('Moon gift');
});
test('Custom Spell editing and removal are scoped to its Character', () => {
  const a = emptyMagic(), b = emptyMagic(); applyMagicCommand(a, command(custom)); applyMagicCommand(b, command(custom));
  applyMagicCommand(a, command({ ...custom, name: 'Tide Lantern', level: 3, notes: 'Use at dusk' }, 1));
  expect(b.spells[0].name).toBe('Sea Lantern');
  applyMagicCommand(a, command({ ...custom, deleted: true }, 2)); expect(a.spells[0].deleted).toBe(true);
});
test('manual slot configure, delta spend, restore and correction preserve independent levels', () => {
  const state = emptyMagic();
  applyMagicCommand(state, { kind: 'slots', level: 1, action: 'configure', maximum: 3, remaining: 3, expectedVersion: 0 });
  applyMagicCommand(state, { kind: 'slots', level: 2, action: 'configure', maximum: 1, remaining: 1, expectedVersion: 0 });
  const spend: MagicCommand = { kind: 'slots', level: 1, action: 'spend', expectedVersion: 1 };
  expect(applyMagicCommand(state, spend)).toBe(true); expect(applyMagicCommand(state, spend)).toBe(false);
  // An explicitly retried delta applies to accepted remaining, never an old absolute count.
  expect(applyMagicCommand(state, { ...spend, expectedVersion: 2 })).toBe(true); expect(state.slots[0].remaining).toBe(1);
  applyMagicCommand(state, { kind: 'slots', level: 1, action: 'restore', expectedVersion: 3 });
  applyMagicCommand(state, { kind: 'slots', level: 1, action: 'configure', maximum: 1, remaining: 0, expectedVersion: 4 });
  expect(state.slots[1]).toMatchObject({ maximum: 1, remaining: 1, version: 1 });
  expect(() => applyMagicCommand(state, { kind: 'slots', level: 1, action: 'spend', expectedVersion: 5 })).toThrow('bounds');
});
for (const [index, bad] of [
  command({ ...spell, catalogId: 'fake', id: 'fake' }), command({ ...spell, name: 'copied' }), command({ ...custom, name: ' ' }),
  command({ ...custom, level: 10 }), command({ ...custom, notes: 'x'.repeat(10001) }), command({ ...custom, availability: 'Item granted' }),
  command({ ...custom, availability: 'Feature granted' }), command(custom, -1), command(custom, 1.5), command(custom, Number.MAX_SAFE_INTEGER),
  { kind: 'slots', level: 0, action: 'configure', maximum: 1, remaining: 1, expectedVersion: 0 },
  { kind: 'slots', level: 1, action: 'configure', maximum: 1, remaining: 2, expectedVersion: 0 },
  { kind: 'slots', level: 1, action: 'configure', maximum: 100, remaining: 1, expectedVersion: 0 },
  { kind: 'slots', level: 1, action: 'configure', maximum: NaN, remaining: 1, expectedVersion: 0 },
] .entries()) test(`invalid Magic command rejected ${index} ${JSON.stringify(bad).slice(0, 170)}`, () => expect(() => applyMagicCommand(emptyMagic(), bad as MagicCommand)).toThrow());
test('delayed snapshots retain accepted slot levels and spell tombstones', () => {
  const state = emptyMagic(); applyMagicCommand(state, command(custom)); const old = structuredClone(state);
  applyMagicCommand(state, command({ ...custom, deleted: true }, 1));
  applyMagicCommand(state, { kind: 'slots', level: 5, action: 'configure', maximum: 2, remaining: 0, expectedVersion: 0 });
  expect(mergeMagic(state, old)).toEqual(state);
});
