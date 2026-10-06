import { expect, test } from '@playwright/test';
import { reconcileParty, reconcilePartySlot } from '../src/domain/party-state';
import { applyRestCommand, previewRest } from '../src/domain/character-rests';
import type { CharacterRecord, Party } from '../src/domain/party';
import { backupFixture } from './fixtures/party-backup';

// Exercise accepted Party state after existing feature normalization (for example
// Inventory ordering), rather than asserting backup serialization order.
function partyFixture(): Party {
  const party = backupFixture();
  return reconcileParty(party, structuredClone(party));
}

function character(party: Party): CharacterRecord {
  const record = party.slots[0].character;
  if (!record) throw new Error('Expected the fixture Character Record');
  return record;
}

// Each change represents an already accepted save; test the Party interface,
// rather than duplicating any feature's own transition or merge implementation.
const changes: Record<string, (record: CharacterRecord) => void> = {
  survival: record => { record.survival!.current = 12; record.survival!.version++; },
  classes: record => { record.classes![0].name = 'Ranger'; record.classes![0].level = 5; record.classes![0].version++; record.primaryClass = 'Ranger'; record.level = 6; },
  limitedResources: record => { record.limitedResources![0].current = 1; record.limitedResources![0].version++; },
  inventory: record => { record.inventory![0].deleted = true; record.inventory![0].version++; },
  textEntries: record => { record.textEntries![0].body = 'New accepted feature'; record.textEntries![0].version++; },
  magic: record => { record.magic!.spells[0].deleted = true; record.magic!.spells[0].version++; record.magic!.slots[0].remaining = 0; record.magic!.slots[0].version++; },
  conditions: record => { record.conditions![0].deleted = true; record.conditions![0].version++; },
  combatEntries: record => { record.combatEntries!.entries[0].deleted = true; record.combatEntries!.entries[0].version++; record.combatEntries!.featuredIds = []; record.combatEntries!.primaryVersion++; },
};

for (const [feature, change] of Object.entries(changes)) {
  test(`${feature}: accepted saves survive delayed snapshots and genuinely newer snapshots win`, () => {
    const old = partyFixture(), newer = structuredClone(old);
    change(character(newer));
    const newest = structuredClone(newer);
    change(character(newest));
    const before = structuredClone([old, newer, newest]);
    const acceptedSave = reconcilePartySlot(old, newer.slots[0])!;
    expect(acceptedSave).toEqual(newer);
    expect(reconcileParty(acceptedSave, old)).toEqual(newer);
    expect(reconcileParty(old, newer)).toEqual(acceptedSave);
    expect(reconcileParty(acceptedSave, newest)).toEqual(newest);
    expect(reconcilePartySlot(acceptedSave, newest.slots[0])).toEqual(newest);
    expect([old, newer, newest]).toEqual(before);
  });
}

test('cross-feature and nested Overview edits combine per version without changing either input', () => {
  const current = partyFixture(), incoming = partyFixture();
  const local = character(current), remote = character(incoming);
  local.characterName = 'Accepted name'; local.fieldVersions.characterName = 4;
  local.abilityScores.strength = 18; local.fieldVersions.strength = 2;
  local.savingThrowProficiencies.wisdom = 'proficient'; local.fieldVersions['save.wisdom'] = 2;
  local.skillProficiencies.arcana = 'expertise'; local.fieldVersions['skill.arcana'] = 2;
  local.derivedOverrides.initiative = 7; local.fieldVersions['override.initiative'] = 2;
  changes.inventory(local); changes.magic(local); changes.classes(local);
  // Class entries, rather than stale legacy Overview values, drive projection.
  remote.primaryClass = 'Obsolete'; remote.level = 2;
  remote.fieldVersions.primaryClass = 99; remote.fieldVersions.level = 99;
  remote.speed = 40; remote.fieldVersions.speed = 2;
  changes.conditions(remote); changes.textEntries(remote);
  const before = structuredClone([current, incoming]);
  const merged = character(reconcileParty(current, incoming));
  expect(merged).toMatchObject({ characterName: 'Accepted name', primaryClass: 'Ranger', level: 6, speed: 40 });
  expect(merged.abilityScores.strength).toBe(18);
  expect(merged.savingThrowProficiencies.wisdom).toBe('proficient');
  expect(merged.skillProficiencies.arcana).toBe('expertise');
  expect(merged.derivedOverrides.initiative).toBe(7);
  expect(merged.inventory).toEqual(local.inventory); expect(merged.magic).toEqual(local.magic);
  expect(merged.conditions).toEqual(remote.conditions); expect(merged.textEntries).toEqual(remote.textEntries);
  expect([current, incoming]).toEqual(before);
});

test('accepted Long Rest survives an older snapshot while preserving unrelated Character data', () => {
  const old = partyFixture(), rested = structuredClone(old), record = character(rested);
  expect(applyRestCommand(record, {
    operationId: '33333333-3333-4333-8333-333333333333', rest: 'Long Rest',
    changes: previewRest(record, 'Long Rest').map(item => item.change),
  })).toBe(true);
  const accepted = reconcilePartySlot(old, rested.slots[0])!;
  const merged = character(reconcileParty(accepted, old));
  expect(merged.survival).toEqual(record.survival);
  expect(merged.magic).toEqual(record.magic);
  expect(merged.limitedResources).toEqual(record.limitedResources);
  expect(merged.inventory).toEqual(character(old).inventory);
  expect(merged.textEntries).toEqual(character(old).textEntries);
  // Unversioned receipt metadata retains the established incoming-snapshot policy.
  expect(merged.lastRest).toEqual(character(old).lastRest);
});

test('initial loads, slot identity/order, claims and untouched slots keep their established behavior', () => {
  const current = partyFixture();
  expect(reconcileParty(null, current)).toBe(current);
  expect(reconcilePartySlot(null, current.slots[0])).toBeNull();
  const incoming = structuredClone(current); incoming.name = 'Updated party'; incoming.slots.reverse();
  incoming.slots.find(slot => slot.id === current.slots[0].id)!.character = null;
  const merged = reconcileParty(current, incoming);
  expect(merged.name).toBe('Updated party');
  expect(merged.slots.map(slot => slot.id)).toEqual(incoming.slots.map(slot => slot.id));
  expect(merged.slots.at(-1)).toBe(current.slots[0]);
  const claimed = { ...current.slots[1], character: structuredClone(character(current)) };
  expect(reconcilePartySlot(current, claimed)!.slots[1]).toBe(claimed);
  expect(reconcileParty(current, { ...current, slots: current.slots.map(slot => slot.id === claimed.id ? claimed : slot) }).slots[1]).toBe(claimed);
  expect(reconcilePartySlot(current, claimed)!.slots[0]).toBe(current.slots[0]);
  const unclaimed = { ...current.slots[0], character: null };
  expect(reconcilePartySlot(current, unclaimed)!.slots[0]).toBe(unclaimed);
  expect(reconcilePartySlot(current, { ...claimed, id: 'missing' })).toEqual(current);
});

test('equal feature and Overview versions keep incoming values', () => {
  const current = partyFixture(), incoming = partyFixture();
  character(incoming).characterName = 'Equal-version incoming name';
  character(incoming).survival!.current = 9;
  character(incoming).inventory![0].body = 'Equal-version incoming description';
  const merged = character(reconcileParty(current, incoming));
  expect(merged.characterName).toBe('Equal-version incoming name');
  expect(merged.survival!.current).toBe(9);
  expect(merged.inventory![0].body).toBe('Equal-version incoming description');
});
