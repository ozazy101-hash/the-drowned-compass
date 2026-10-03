import { expect, type WebSocketRoute } from '@playwright/test';
import { test } from './browser-fixtures';
import { claimCharacter, enterAs, isolatedPartyUrl } from './overview-helpers';
import { applyClassEdit, type ClassEdit } from '../src/domain/character-classes';
import type { CharacterRecord } from '../src/domain/party';

for (const source of ['in-memory', 'Supabase'] as const) {
  test(`${source} class adapter preserves independent edits, conflicts, tombstones and reload totals`, async ({ page }, info) => {
    const record = { primaryClass: 'Rogue', level: 3, fieldVersions: {} } as CharacterRecord;
    const row = { id: 'class-slot', position: 1, claimed_at: '2026-10-03', primary_class: 'Rogue', level: 3, overview_field_versions: {} };
    let unavailable = false;
    await page.route('https://class-contract.invalid/rest/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (path.endsWith('/rpc/edit_character_class')) {
        if (unavailable) { unavailable = false; return route.fulfill({ status: 503, json: { message: 'Unavailable' } }); }
        const args = route.request().postDataJSON();
        expect(args.target_slot_id).toBe('class-slot');
        json = applyClassEdit(record, { id: args.target_entry_id, name: args.next_name, level: args.next_level, deleted: args.next_deleted }, args.expected_version);
        row.primary_class = record.primaryClass; row.level = record.level; row.overview_field_versions = record.fieldVersions;
      } else if (path.endsWith('/parties')) json = { id: 'party', name: 'The Drowned Compass' };
      else if (path.endsWith('/character_slots')) json = [row];
      else if (path.endsWith('/character_classes')) json = (record.classes ?? [{ id: 'primary', name: 'Rogue', level: 3, version: 1, deleted: false }]).map(entry => ({ ...entry, slot_id: row.id, entry_id: entry.id }));
      await route.fulfill({ json });
    });
    await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page);
    const results = await page.evaluate(async source => {
      const memoryPath = '/the-drowned-compass/src/data/in-memory-party-data.ts';
      const productionPath = '/the-drowned-compass/src/data/supabase-party-data.ts';
      const adapter = source === 'in-memory' ? (await import(memoryPath)).createInMemoryPartyData()
        : (await import(productionPath)).createSupabasePartyData('https://class-contract.invalid', 'test-publishable-key');
      const slotId = (await adapter.getParty()).slots[0].id;
      const cleric = { id: '11111111-1111-4111-8111-111111111111', name: 'Cleric', level: 2, deleted: false };
      const added = await adapter.editCharacterClass(slotId, cleric, 0);
      const primary = await adapter.editCharacterClass(slotId, { id: 'primary', name: 'Ranger', level: 4, deleted: false }, 1);
      const secondary = await adapter.editCharacterClass(slotId, { ...cleric, level: 3 }, 1);
      const stale = await adapter.editCharacterClass(slotId, cleric, 1);
      const removed = await adapter.editCharacterClass(slotId, { ...cleric, level: 3, deleted: true }, 2);
      const resurrected = await adapter.editCharacterClass(slotId, cleric, 3);
      let invalid = false;
      try { await adapter.editCharacterClass(slotId, { ...cleric, level: 0 }, 3); } catch { invalid = true; }
      return { added, primary, secondary, stale, removed, resurrected, invalid, reloaded: await adapter.getParty() };
    }, source);
    expect(results.added.ok).toBe(true);
    expect(results.primary.slot.character.level).toBe(6);
    expect(results.secondary.slot.character.level).toBe(7);
    expect(results.stale.ok).toBe(false);
    expect(results.stale.slot.character.level).toBe(7);
    expect(results.removed.ok).toBe(true);
    expect(results.resurrected.ok).toBe(false);
    expect(results.invalid).toBe(true);
    const reloaded = results.reloaded.slots[0].character;
    expect(reloaded.primaryClass).toBe('Ranger'); expect(reloaded.level).toBe(4);
    expect(reloaded.classes.find((entry: { id: string }) => entry.id.startsWith('1111'))).toMatchObject({ deleted: true, version: 3 });
    if (source === 'Supabase') {
      unavailable = true;
      expect(await page.evaluate(async () => {
        const path = '/the-drowned-compass/src/data/supabase-party-data.ts';
        const adapter = (await import(path)).createSupabasePartyData('https://class-contract.invalid', 'test-publishable-key');
        try { await adapter.editCharacterClass('class-slot', { id: 'primary', name: 'Ranger', level: 5, deleted: false }, 2); return false; }
        catch { return true; }
      })).toBe(true);
    }
  });
}

test('Supabase class subscriptions deliver edits and catch up after reconnect', async ({ page }) => {
  let level = 2; let version = 1; let joins = 0;
  let socket!: WebSocketRoute; let topic = ''; let joinRef = ''; let filterId = 0;
  await page.route('https://class-realtime.invalid/rest/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/parties') ? { id: 'party', name: 'The Drowned Compass' }
      : path.endsWith('/character_slots') ? [{ id: 'slot', position: 1, claimed_at: '2026-10-03', primary_class: 'Rogue', level: 3, overview_field_versions: {} }]
      : path.endsWith('/character_classes') ? [
        { slot_id: 'slot', entry_id: 'primary', name: 'Rogue', level: 3, version: 1, deleted: false },
        { slot_id: 'slot', entry_id: '11111111-1111-4111-8111-111111111111', name: 'Cleric', level, version, deleted: false },
      ] : [];
    return route.fulfill({ json });
  });
  await page.routeWebSocket(/class-realtime\.invalid\/realtime\/v1\/websocket/, connection => {
    socket = connection;
    connection.onMessage(message => {
      const [nextJoin, ref, nextTopic, event, payload] = JSON.parse(String(message));
      if (event !== 'phx_join' && event !== 'heartbeat') return;
      const filters = event === 'phx_join' ? payload.config.postgres_changes.map((filter: Record<string, unknown>, index: number) => ({ ...filter, id: index + 1 })) : [];
      connection.send(JSON.stringify([nextJoin, ref, nextTopic, 'phx_reply', { status: 'ok', response: event === 'phx_join' ? { postgres_changes: filters } : {} }]));
      if (event === 'phx_join') {
        const filter = filters.find((item: { table: string }) => item.table === 'character_classes');
        expect(filter).toMatchObject({ event: '*' }); filterId = filter.id;
        topic = nextTopic; joinRef = nextJoin; joins += 1;
      }
    });
  });
  await page.goto('./');
  await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts';
    const adapter = (await import(path)).createSupabasePartyData('https://class-realtime.invalid', 'test-publishable-key');
    const unsubscribe = adapter.subscribeToParty((party: { slots: Array<{ character: { level: number } }> }) => { document.body.dataset.classTotal = String(party.slots[0].character.level); });
    window.addEventListener('pagehide', unsubscribe, { once: true });
  });
  await expect.poll(() => joins).toBe(1);
  await expect(page.locator('body')).toHaveAttribute('data-class-total', '5');
  level = 3; version = 2;
  socket.send(JSON.stringify([joinRef, null, topic, 'postgres_changes', { ids: [filterId], data: { schema: 'public', table: 'character_classes', type: 'UPDATE', commit_timestamp: '2026-10-03T00:00:00Z', new: {}, old: {}, columns: [], errors: null } }]));
  await expect(page.locator('body')).toHaveAttribute('data-class-total', '6');
  level = 4; version = 3;
  socket.close({ code: 1012, reason: 'Class catch-up test' });
  await expect.poll(() => joins).toBe(2);
  await expect(page.locator('body')).toHaveAttribute('data-class-total', '7');
});

test('localStorage class and Overview writes use one cross-tab lock', async ({ context, page }) => {
  await page.goto('./'); await enterAs(page, 'Player'); await claimCharacter(page);
  const peer = await context.newPage(); await peer.goto('./');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('drowned-compass-party')!));
  const edits = [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Cleric', level: 2, deleted: false },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Fighter', level: 1, deleted: false },
  ];
  const write = async (tab: Page, edit: ClassEdit) => tab.evaluate(async edit => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
    return (await import(path)).createInMemoryPartyData().editCharacterClass('character-slot-1', edit, 0);
  }, edit);
  const outcomes = await Promise.all([write(page, edits[0]), write(peer, edits[1]), peer.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
    return (await import(path)).createInMemoryPartyData().updateCharacterOverviewField('character-slot-1', 'armorClass', 18, 0);
  })]);
  expect(outcomes.every(outcome => outcome.ok)).toBe(true);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('drowned-compass-party')!));
  expect(after.slots[0].character.classes.filter((entry: { deleted: boolean }) => !entry.deleted)).toHaveLength(3);
  expect(after.slots[0].character.level).toBe(6);
  expect(after.slots[0].character.armorClass).toBe(18);
  expect(after.slots[0].character.abilityScores).toEqual(before.slots[0].character.abilityScores);
});
