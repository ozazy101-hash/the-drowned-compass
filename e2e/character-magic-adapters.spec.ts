import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { applyMagicCommand, emptyMagic } from '../src/domain/character-magic';
import { claimCharacter, enterAs, isolatedPartyUrl } from './overview-helpers';
for (const source of ['local', 'shared', 'supabase'] as const) {
  test(`${source} Magic adapter preserves independent records, accepted versions and tombstones`, async ({ page }, info) => {
    const state = emptyMagic();
    const row = { id: 'slot', position: 1, claimed_at: '2026-10-05', player_name: 'Mara', character_name: 'Neris Vale', primary_class: 'Rogue', subclass: 'Thief', species: 'Human', background: 'Sailor', level: 3,
      strength: 9, dexterity: 17, constitution: 13, intelligence: 14, wisdom: 12, charisma: 11, saving_throw_proficiencies: {}, skill_proficiencies: {}, armor_class: 17, max_hit_points: 1, speed: 30, spellcasting_ability: null, derived_overrides: {}, overview_field_versions: {} };
    await page.route('https://magic-contract.invalid/rest/v1/**', async route => {
      const path = new URL(route.request().url()).pathname; let json: unknown = [];
      if (path.endsWith('/parties')) json = { id: 'party', name: 'The Drowned Compass' };
      else if (path.endsWith('/character_slots')) json = [row];
      else if (path.endsWith('/character_magic')) json = [...state.spells.map(({ id, version, ...state }) => ({ id, version, state, kind: 'spell', slot_id: 'slot' })), ...state.slots.map(({ id, version, ...state }) => ({ id, version, state, kind: 'slots', slot_id: 'slot' }))];
      else if (path.endsWith('/rpc/update_character_magic')) { const { command, target_slot_id } = route.request().postDataJSON(); expect(target_slot_id).toBe('slot'); json = applyMagicCommand(state, command); }
      await route.fulfill({ contentType: 'application/json', json });
    });
    await page.goto(source === 'shared' ? isolatedPartyUrl(info) : './'); await enterAs(page, 'Player'); await claimCharacter(page);
    const result = await page.evaluate(async source => {
      const memory = '/the-drowned-compass/src/data/in-memory-party-data.ts', production = '/the-drowned-compass/src/data/supabase-party-data.ts';
      const data = source === 'supabase' ? (await import(production)).createSupabasePartyData('https://magic-contract.invalid', 'test-key') : (await import(memory)).createInMemoryPartyData();
      const slotId = (await data.getParty()).slots[0].id;
      const spell = { id: 'srd-5.2.1:acid-splash', catalogId: 'srd-5.2.1:acid-splash', name: '', level: 0, availability: 'Known', source: '', notes: '', deleted: false };
      const custom = { ...spell, id: 'custom.11111111-1111-4111-8111-111111111111', catalogId: null, name: 'Sea Lantern', level: 2 };
      const first = await data.updateMagic(slotId, { kind: 'spell', spell, expectedVersion: 0 });
      const duplicate = await data.updateMagic(slotId, { kind: 'spell', spell, expectedVersion: 0 });
      await data.updateMagic(slotId, { kind: 'spell', spell: custom, expectedVersion: 0 });
      await data.updateMagic(slotId, { kind: 'spell', spell: { ...custom, name: 'Tide Lantern', availability: 'Item granted', source: 'Moon stone' }, expectedVersion: 1 });
      const removed = await data.updateMagic(slotId, { kind: 'spell', spell: { ...spell, deleted: true }, expectedVersion: 1 });
      const stale = await data.updateMagic(slotId, { kind: 'spell', spell, expectedVersion: 1 });
      const readd = await data.updateMagic(slotId, { kind: 'spell', spell, expectedVersion: 2 });
      await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'configure', maximum: 3, remaining: 3, expectedVersion: 0 });
      await data.updateMagic(slotId, { kind: 'slots', level: 2, action: 'configure', maximum: 2, remaining: 1, expectedVersion: 0 });
      const spent = await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'spend', expectedVersion: 1 });
      const staleSpend = await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'spend', expectedVersion: 1 });
      const retrySpend = await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'spend', expectedVersion: 2 });
      await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'restore', expectedVersion: 3 });
      await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'configure', maximum: 1, remaining: 0, expectedVersion: 4 });
      let invalid = false; try { await data.updateMagic(slotId, { kind: 'slots', level: 1, action: 'configure', maximum: 1, remaining: 2, expectedVersion: 5 }); } catch { invalid = true; }
      return { first, duplicate, removed, stale, readd, spent, staleSpend, retrySpend, invalid, party: await data.getParty() };
    }, source);
    expect(result.first.ok).toBe(true); expect(result.duplicate.ok).toBe(false); expect(result.removed.slot.character.magic.spells[0]).toMatchObject({ deleted: true, version: 2 });
    expect(result.stale.ok).toBe(false); expect(result.readd.ok).toBe(true); expect(result.spent.slot.character.magic.slots[0].remaining).toBe(2); expect(result.staleSpend.ok).toBe(false); expect(result.retrySpend.slot.character.magic.slots[0].remaining).toBe(1); expect(result.invalid).toBe(true);
    expect(result.party.slots[0].character.magic).toEqual({ spells: [expect.objectContaining({ id: 'srd-5.2.1:acid-splash', version: 3, deleted: false }), expect.objectContaining({ name: 'Tide Lantern', version: 2, source: 'Moon stone' })], slots: [expect.objectContaining({ level: 1, maximum: 1, remaining: 0, version: 5 }), expect.objectContaining({ level: 2, maximum: 2, remaining: 1, version: 1 })] });
    expect(result.party.slots[0].character.characterName).toBe('Neris Vale');
  });
}
test('Supabase Magic errors reject acknowledgement', async ({ page }) => {
  await page.route('https://magic-failure.invalid/rest/v1/rpc/update_character_magic', route => route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'Unavailable' } }));
  await page.goto('./');
  expect(await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts'; const data = (await import(path)).createSupabasePartyData('https://magic-failure.invalid', 'test-key');
    try { await data.updateMagic('slot', { kind: 'slots', level: 1, action: 'spend', expectedVersion: 1 }); return false; } catch { return true; }
  })).toBe(true);
});
test('Supabase Magic event and reconnect reload accepted state', async ({ page }) => {
  let remaining = 3, version = 1, joins = 0, topic = '', joinRef = '', filterId = 0;
  let socket: import('@playwright/test').WebSocketRoute;
  await page.route('https://magic-realtime.invalid/rest/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/parties') ? { id: 'party', name: 'The Drowned Compass' } : path.endsWith('/character_slots') ? [{ id: 'slot', position: 1, claimed_at: '2026-10-05', overview_field_versions: {} }]
      : path.endsWith('/character_magic') ? [{ slot_id: 'slot', id: 'slots.1', kind: 'slots', state: { level: 1, maximum: 3, remaining }, version }] : [];
    return route.fulfill({ contentType: 'application/json', json });
  });
  await page.routeWebSocket(/magic-realtime\.invalid\/realtime\/v1\/websocket/, connection => {
    socket = connection; connection.onMessage(message => {
      const [jr, ref, tp, event, payload] = JSON.parse(String(message)); if (event !== 'phx_join' && event !== 'heartbeat') return;
      const filters = event === 'phx_join' ? payload.config.postgres_changes.map((f: object, i: number) => ({ ...f, id: i + 1 })) : [];
      connection.send(JSON.stringify([jr, ref, tp, 'phx_reply', { status: 'ok', response: event === 'phx_join' ? { postgres_changes: filters } : {} }]));
      if (event === 'phx_join') { const filter = filters.find((f: { table: string }) => f.table === 'character_magic'); expect(filter).toMatchObject({ event: '*' }); topic = tp; joinRef = jr; filterId = filter.id; joins++; }
    });
  });
  await page.goto('./'); await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts'; const data = (await import(path)).createSupabasePartyData('https://magic-realtime.invalid', 'test-key');
    const stop = data.subscribeToParty((party: { slots: Array<{ character: { magic: { slots: Array<{ remaining: number }> } } }> }) => { document.body.dataset.magicRemaining = String(party.slots[0].character.magic.slots[0].remaining); });
    window.addEventListener('pagehide', stop, { once: true });
  });
  await expect.poll(() => joins).toBe(1); await expect(page.locator('body')).toHaveAttribute('data-magic-remaining', '3'); remaining = 2; version++;
  socket!.send(JSON.stringify([joinRef, null, topic, 'postgres_changes', { ids: [filterId], data: { schema: 'public', table: 'character_magic', type: 'UPDATE', commit_timestamp: '2026-10-05T00:00:00Z', new: {}, old: {}, columns: [], errors: null } }]));
  await expect(page.locator('body')).toHaveAttribute('data-magic-remaining', '2'); remaining = 1; version++; socket!.close({ code: 1012, reason: 'Magic reconnect acceptance' });
  await expect.poll(() => joins).toBe(2); await expect(page.locator('body')).toHaveAttribute('data-magic-remaining', '1');
});
