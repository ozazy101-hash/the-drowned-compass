import { test, expect } from '@playwright/test';
import { createPartyBackup, serializePartyBackup } from '../src/domain/party-backup';
import { backupFixture } from './fixtures/party-backup';
test('versioned portable backup covers six slots, actual settings and pinned catalog identity', () => {
  const backup = createPartyBackup(backupFixture()); expect(backup).toMatchObject({ format: 'the-drowned-compass-party-data-backup', schemaVersion: 1, settings: { partyName: 'The Drowned Compass' }, catalog: { spells: 'SRD 5.2.1', identityPrefix: 'srd-5.2.1:' } });
  expect(backup.slots).toHaveLength(6); expect(backup.slots.slice(1).every(s => s.character === null)).toBe(true); expect(backup.scope.excluded).toContain('Campaign story');
});
test('complete Character data, trackers, zero values, legacy HP and tombstones survive projection', () => {
  const source = backupFixture(), c = createPartyBackup(source).slots[0].character!;
  for (const field of ['classes','survival','conditions','limitedResources','inventory','textEntries','combatEntries','magic','fieldVersions','derivedOverrides'] as const) expect(c[field]).toEqual(field === 'classes' ? [...source.slots[0].character!.classes!].sort((a,b) => a.id < b.id ? -1 : 1) : field === 'limitedResources' ? source.slots[0].character!.limitedResources : field === 'inventory' ? [...source.slots[0].character!.inventory!].sort((a,b) => a.id < b.id ? -1 : 1) : field === 'textEntries' ? [...source.slots[0].character!.textEntries!].sort((a,b) => a.id < b.id ? -1 : 1) : field === 'magic' ? { spells: [...source.slots[0].character!.magic!.spells].sort((a,b) => a.id < b.id ? -1 : 1), slots: source.slots[0].character!.magic!.slots } : field === 'conditions' ? [...source.slots[0].character!.conditions!].sort((a,b) => a.id < b.id ? -1 : 1) : source.slots[0].character![field]);
  expect(c.survival).toMatchObject({ current: 0, temporary: 7, successes: 2, failures: 1 }); expect(c.textEntries.some(t => t.body === 'Raised aboard a merchant ship')).toBe(true); expect(c.magic.spells.find(s => s.catalogId === null)).toMatchObject({ name: 'Sea Lantern', notes: 'Custom spell notes', source: 'Moon gift', deleted: true });
});
test('unknown fields at every nesting level, secrets and operational receipt never leak', () => {
  const party = backupFixture(), c = party.slots[0].character!; const secret = { credentials: 'DO-NOT-EXPORT', access_token: 'DO-NOT-EXPORT', campaignStory: 'DO-NOT-EXPORT' };
  for (const object of [party, party.slots[0], c, c.abilityScores, c.savingThrowProficiencies, c.skillProficiencies, c.derivedOverrides, c.fieldVersions, c.survival!, c.survival!.undo!, c.survival!.undo!.before, ...c.classes!, ...c.conditions!, ...c.limitedResources!, ...c.magic!.spells, ...c.magic!.slots, ...c.inventory!, ...c.textEntries!, c.combatEntries!, ...c.combatEntries!.entries, c.combatEntries!.entries[0].details]) Object.assign(object, secret);
  const backup = createPartyBackup(party); expect(serializePartyBackup(backup)).not.toContain('DO-NOT-EXPORT'); expect(backup.slots[0].character).not.toHaveProperty('lastRest');
});
test('content is deterministic despite storage order and serialization is portable JSON', () => {
  const party = backupFixture(), expected = serializePartyBackup(createPartyBackup(party)); party.slots.reverse(); const c = party.slots.find(s => s.character)!.character!;
  for (const list of [c.classes!, c.conditions!, c.limitedResources!, c.inventory!, c.textEntries!, c.magic!.spells, c.magic!.slots, c.combatEntries!.entries]) list.reverse();
  expect(serializePartyBackup(createPartyBackup(party))).toBe(expected); expect(JSON.parse(expected)).toEqual(createPartyBackup(party)); expect(expected.endsWith('\n')).toBe(true);
});
test('legacy records normalize absent feature seams and retain unknown HP explicitly', () => {
  const party = backupFixture(), c = party.slots[0].character!;
  for (const field of ['classes','survival','magic','conditions','inventory','textEntries','combatEntries','limitedResources'] as const) delete c[field];
  const backup = createPartyBackup(party).slots[0].character!; expect(backup.classes).toEqual([{ id: 'primary', name: 'Fighter', level: 4, version: 1, deleted: false }]); expect(backup.survival.current).toBeNull(); expect(backup.magic).toEqual({ spells: [], slots: [] }); expect(backup.combatEntries).toEqual({ entries: [], featuredIds: [], primaryId: null, primaryVersion: 0 });
});
for (const path of ['name','ability','override','inventory','spell','undo','featured'] as const) test(`malformed nested scalar ${path} fails closed rather than exporting unknown object`, () => {
  const party = backupFixture(), c = party.slots[0].character!, bad = { token: 'DO-NOT-EXPORT' };
  if (path === 'name') Object.assign(c, { playerName: bad }); if (path === 'ability') Object.assign(c.abilityScores, { strength: bad }); if (path === 'override') Object.assign(c.derivedOverrides, { initiative: bad }); if (path === 'inventory') Object.assign(c.inventory![0], { body: bad }); if (path === 'spell') Object.assign(c.magic!.spells[0], { notes: bad }); if (path === 'undo') Object.assign(c.survival!.undo!, { label: bad }); if (path === 'featured') Object.assign(c.combatEntries!, { featuredIds: [bad] });
  expect(() => createPartyBackup(party)).toThrow('unsupported field value');
});
