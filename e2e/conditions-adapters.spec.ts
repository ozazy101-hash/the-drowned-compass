import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl } from './overview-helpers';
for (const source of ['local', 'shared', 'supabase'] as const) {
  test(`${source} adapter preserves independent Conditions, duplicate prevention, versions and tombstones`, async ({ page }, info) => {
    const records: Record<string, unknown>[] = [];
    const row = { id: 'slot', position: 1, claimed_at: '2026-10-03', player_name: 'Mara', character_name: 'Neris Vale',
      primary_class: 'Rogue', subclass: 'Thief', species: 'Human', background: 'Sailor', level: 3,
      strength: 9, dexterity: 17, constitution: 13, intelligence: 14, wisdom: 12, charisma: 11,
      saving_throw_proficiencies: {}, skill_proficiencies: {}, armor_class: 10, max_hit_points: 1,
      speed: 30, spellcasting_ability: null, derived_overrides: {}, overview_field_versions: {} };
    await page.route('https://conditions-contract.invalid/rest/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (path.endsWith('/parties')) json = { id: 'party', name: 'The Drowned Compass' };
      else if (path.endsWith('/character_slots')) json = [row];
      else if (path.endsWith('/character_conditions')) json = records;
      else if (path.endsWith('/rpc/update_character_condition')) {
        const { command, target_slot_id } = route.request().postDataJSON(); expect(target_slot_id).toBe('slot');
        const prior = records.find(r => r.id === command.id); const version = Number(prior?.version ?? 0);
        const accepted = command.expectedVersion === version;
        if (accepted) {
          const next = { id: command.id, standard: command.standard, label: command.label.trim(), deleted: command.deleted, version: version + 1, slot_id: 'slot' };
          if (prior) Object.assign(prior, next); else records.push(next);
        }
        json = accepted;
      }
      await route.fulfill({ contentType: 'application/json', json });
    });
    await page.goto(source === 'shared' ? isolatedPartyUrl(info) : './');
    await enterAs(page, 'Player'); await claimCharacter(page);
    const result = await page.evaluate(async source => {
      const memory = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const production = '/the-drowned-compass/src/data/supabase-party-data.ts';
      const adapter = source === 'supabase' ? (await import(production)).createSupabasePartyData('https://conditions-contract.invalid', 'test-publishable-key') : (await import(memory)).createInMemoryPartyData();
      const slotId = (await adapter.getParty()).slots[0].id;
      const prone = { id: 'srd.Prone', standard: 'Prone', label: 'Prone', deleted: false, expectedVersion: 0 };
      const custom = { id: 'custom.11111111-1111-4111-8111-111111111111', standard: null, label: 'Sea Curse', deleted: false, expectedVersion: 0 };
      const first = await adapter.updateCondition(slotId, prone); const duplicate = await adapter.updateCondition(slotId, prone);
      const second = await adapter.updateCondition(slotId, custom);
      const rename = await adapter.updateCondition(slotId, { ...custom, label: 'Marked', expectedVersion: 1 });
      const removed = await adapter.updateCondition(slotId, { ...prone, deleted: true, expectedVersion: 1 });
      const stale = await adapter.updateCondition(slotId, prone); const readded = await adapter.updateCondition(slotId, { ...prone, expectedVersion: 2 });
      let invalid = false; try { await adapter.updateCondition(slotId, { ...custom, label: ' ' }); } catch { invalid = true; }
      return { first, duplicate, second, rename, removed, stale, readded, invalid, party: await adapter.getParty() };
    }, source);
    expect(result.first.ok).toBe(true); expect(result.duplicate.ok).toBe(false); expect(result.second.slot.character.conditions).toHaveLength(2);
    expect(result.rename.ok).toBe(true); expect(result.removed.slot.character.conditions.find((c: { id: string }) => c.id === 'srd.Prone')).toMatchObject({ deleted: true, version: 2 });
    expect(result.stale.ok).toBe(false); expect(result.readded.ok).toBe(true); expect(result.invalid).toBe(true);
    expect(result.party.slots[0].character.conditions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'srd.Prone', version: 3, deleted: false }), expect.objectContaining({ label: 'Marked', version: 2 }),
    ]));
  });
}
test('Supabase Condition save errors do not acknowledge a save', async ({ page }) => {
  await page.route('https://conditions-failure.invalid/rest/v1/rpc/update_character_condition', route => route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'Unavailable' } }));
  await page.goto('./');
  expect(await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts';
    const adapter = (await import(path)).createSupabasePartyData('https://conditions-failure.invalid', 'test-publishable-key');
    try { await adapter.updateCondition('slot', { id: 'srd.Prone', standard: 'Prone', label: 'Prone', deleted: false, expectedVersion: 0 }); return false; } catch { return true; }
  })).toBe(true);
});

test('Supabase subscribes to Condition events and reloads missed changes after reconnect', async ({ page }) => {
  let text = 'Before update';
  let version = 1;
  let socket: import('@playwright/test').WebSocketRoute;
  let channelTopic = '';
  let channelJoinRef = '';
  let conditionFilterId = 0;
  let joins = 0;
  await page.route('https://conditions-realtime.invalid/rest/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/parties') ? { id: 'party', name: 'The Drowned Compass' }
      : path.endsWith('/character_conditions') ? [{ slot_id: 'slot', id: 'custom.11111111-1111-4111-8111-111111111111', standard: null, label: text, deleted: false, version }]
      : path.endsWith('/character_text_entries') || path.endsWith('/character_combat_entries') || path.endsWith('/character_primary_attacks') || path.endsWith('/limited_resources') ? []
      : [{ id: 'slot', position: 1, claimed_at: '2026-09-28', overview_field_versions: {} }];
    await route.fulfill({ contentType: 'application/json', json });
  });
  await page.routeWebSocket(/conditions-realtime\.invalid\/realtime\/v1\/websocket/, connection => {
    socket = connection;
    connection.onMessage(message => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(message));
      if (event !== 'phx_join' && event !== 'heartbeat') return;
      const filters = event === 'phx_join' ? payload.config.postgres_changes.map((filter: Record<string, unknown>, index: number) => ({ ...filter, id: index + 1 })) : [];
      connection.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response: event === 'phx_join' ? { postgres_changes: filters } : {} }]));
      if (event === 'phx_join') {
        const filter = filters.find((filter: Record<string, unknown>) => filter.table === 'character_conditions');
        expect(filter).toMatchObject({ event: '*' });
        conditionFilterId = filter.id; channelTopic = topic; channelJoinRef = joinRef; joins += 1;
      }
    });
  });
  await page.goto('./');
  await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts';
    const adapter = (await import(path)).createSupabasePartyData('https://conditions-realtime.invalid', 'test-publishable-key');
    const unsubscribe = adapter.subscribeToParty((party: { slots: Array<{ character: { conditions: Array<{ label: string }> } }> }) => {
      document.body.dataset.conditionSubscription = party.slots[0].character.conditions[0].label;
    });
    window.addEventListener('pagehide', unsubscribe, { once: true });
  });
  await expect.poll(() => joins).toBe(1);
  await expect(page.locator('body')).toHaveAttribute('data-text-subscription', 'Before update');
  text = 'After text event'; version += 1;
  socket!.send(JSON.stringify([channelJoinRef, null, channelTopic, 'postgres_changes', {
    ids: [conditionFilterId], data: { schema: 'public', table: 'character_conditions', type: 'UPDATE', commit_timestamp: '2026-09-28T00:00:00Z', new: {}, old: {}, columns: [], errors: null },
  }]));
  await expect(page.locator('body')).toHaveAttribute('data-text-subscription', 'After text event');
  // Changes missed during disconnect must be loaded by SUBSCRIBED catch-up.
  text = 'During disconnect'; version += 1;
  socket!.close({ code: 1012, reason: 'Text reconnect acceptance' });
  await expect.poll(() => joins).toBe(2);
  await expect(page.locator('body')).toHaveAttribute('data-text-subscription', 'During disconnect');
});
