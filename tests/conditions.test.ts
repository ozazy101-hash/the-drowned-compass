import { test, expect } from '@playwright/test';
import { applyConditionCommand, activeConditions, mergeConditions, type Condition, type ConditionCommand } from '../src/domain/conditions';
import { standardConditionNames, rulesReferences } from '../src/domain/rules-reference';
const prone: ConditionCommand = { id: 'srd.Prone', standard: 'Prone', label: 'Prone', deleted: false, expectedVersion: 0 };
const custom: ConditionCommand = { id: 'custom.11111111-1111-4111-8111-111111111111', standard: null, label: 'Sea Curse', deleted: false, expectedVersion: 0 };
test('standard catalogue has all 15 Conditions and contextual linked references', () => {
  expect(standardConditionNames).toHaveLength(15); expect(new Set(standardConditionNames).size).toBe(15);
  for (const name of standardConditionNames) expect(rulesReferences[name].paragraphs.length).toBeGreaterThan(0);
  expect(rulesReferences.Exhaustion.paragraphs.join(' ')).toContain('level 6');
  expect(rulesReferences.Stunned.paragraphs.join(' ')).not.toContain('Speed is 0');
  expect(rulesReferences.Invisible.paragraphs.join(' ')).toContain('creatures that can see you');
});
test('independent associations retain versions across remove/re-add and reject stale commands', () => {
  const state: Condition[] = [];
  expect(applyConditionCommand(state, prone)).toBe(true); expect(applyConditionCommand(state, custom)).toBe(true);
  expect(applyConditionCommand(state, prone)).toBe(false);
  expect(applyConditionCommand(state, { ...prone, deleted: true, expectedVersion: 1 })).toBe(true);
  expect(activeConditions(state)).toHaveLength(1);
  expect(applyConditionCommand(state, prone)).toBe(false);
  expect(applyConditionCommand(state, { ...prone, expectedVersion: 2 })).toBe(true);
  expect(state.find(c => c.id === prone.id)?.version).toBe(3);
  expect(state.find(c => c.id === custom.id)?.version).toBe(1);
});
test('custom names are trimmed, case-insensitive unique and Character-scoped', () => {
  const state: Condition[] = [];
  expect(applyConditionCommand(state, { ...custom, label: '  Sea Curse  ' })).toBe(true);
  expect(state[0].label).toBe('Sea Curse');
  expect(() => applyConditionCommand(state, { ...custom, id: 'custom.22222222-2222-4222-8222-222222222222', label: 'sea curse' })).toThrow('already active');
  expect(applyConditionCommand([], custom)).toBe(true);
});
for (const command of [
  { ...prone, standard: 'Fake' }, { ...prone, label: 'Renamed' }, { ...prone, expectedVersion: -1 },
  { ...prone, expectedVersion: 1.5 }, { ...custom, label: ' ' }, { ...custom, label: 'x'.repeat(121) },
  { ...custom, id: 'srd.Homebrew' },
]) test(`invalid Condition command rejected: ${JSON.stringify(command).slice(0,100)}`, () => {
  expect(() => applyConditionCommand([], command)).toThrow();
});
test('delayed snapshots cannot resurrect Conditions or erase distinct records', () => {
  const state: Condition[] = [];
  applyConditionCommand(state, prone); const old = structuredClone(state);
  applyConditionCommand(state, { ...prone, deleted: true, expectedVersion: 1 }); applyConditionCommand(state, custom);
  expect(mergeConditions(state, old)).toEqual(state);
});
