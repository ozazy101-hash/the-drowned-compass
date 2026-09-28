import { expect, test } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl } from './overview-helpers';

for (const source of ['in-memory', 'supabase'] as const) {
  test(`${source} adapter loads, independently writes, conflicts and reports Character text failures`, async ({ page }, info) => {
    const entries: Record<string, unknown>[] = [];
    const row = {
      id: 'contract-slot', position: 1, claimed_at: '2026-09-28', player_name: 'Mara', character_name: 'Neris Vale',
      primary_class: 'Rogue', subclass: 'Thief', species: 'Human', background: 'Sailor', level: 3,
      strength: 9, dexterity: 17, constitution: 13, intelligence: 14, wisdom: 12, charisma: 11,
      saving_throw_proficiencies: {}, skill_proficiencies: {}, armor_class: 10, max_hit_points: 1,
      speed: 30, spellcasting_ability: null, derived_overrides: {}, overview_field_versions: {},
    };
    await page.route('https://text-contract.invalid/rest/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown;
      if (path.endsWith('/rpc/save_character_text_entry')) {
        const next = route.request().postDataJSON();
        expect(next.target_slot_id).toBe('contract-slot');
        const prior = entries.find(entry => entry.entry_id === next.target_entry_id);
        const version = Number(prior?.version ?? 0);
        const accepted = next.expected_version === version;
        if (accepted) {
          const entry = { slot_id: 'contract-slot', entry_id: next.target_entry_id, kind: next.target_kind,
            title: next.next_title, body: next.next_body, deleted: next.next_deleted, version: version + 1 };
          if (prior) entries[entries.indexOf(prior)] = entry; else entries.push(entry);
        }
        json = [{ accepted, current_version: accepted ? version + 1 : version }];
      } else if (path.endsWith('/parties')) json = { id: 'contract-party', name: 'The Drowned Compass' };
      else if (path.endsWith('/character_slots')) json = [row];
      else if (path.endsWith('/character_text_entries')) {
        expect(new URL(route.request().url()).searchParams.get('select')).toContain('version');
        json = entries;
      } else throw new Error(`Unexpected contract endpoint ${path}`);
      await route.fulfill({ contentType: 'application/json', json });
    });
    await page.goto(isolatedPartyUrl(info));
    await enterAs(page, 'Player'); await claimCharacter(page);
    const result = await page.evaluate(async source => {
      const memoryPath = '/the-drowned-compass/src/data/in-memory-party-data.ts';
      const productionPath = '/the-drowned-compass/src/data/supabase-party-data.ts';
      const adapter = source === 'in-memory' ? (await import(memoryPath)).createInMemoryPartyData()
        : (await import(productionPath)).createSupabasePartyData('https://text-contract.invalid', 'test-publishable-key');
      const party = await adapter.getParty();
      const slotId = party.slots[0].id;
      const feature = { id: 'feature.11111111-1111-4111-8111-111111111111', kind: 'class', title: 'Second Wind', body: 'My summary', deleted: false };
      const story = { id: 'story.notes', kind: 'notes', title: '', body: 'Party-visible notes', deleted: false };
      const first = await adapter.saveCharacterTextEntry(slotId, feature, 0);
      const second = await adapter.saveCharacterTextEntry(slotId, story, 0);
      const conflict = await adapter.saveCharacterTextEntry(slotId, { ...feature, body: 'Stale' }, 0);
      const retry = await adapter.saveCharacterTextEntry(slotId, { ...feature, body: 'Retried' }, 1);
      const removed = await adapter.saveCharacterTextEntry(slotId, { ...feature, deleted: true }, 2);
      let failed = false;
      try { await adapter.saveCharacterTextEntry(slotId, { ...story, body: 'x'.repeat(20001) }, 1); } catch { failed = true; }
      return { first, second, conflict, retry, removed, failed, reloaded: await adapter.getParty() };
    }, source);
    expect(result.first.ok).toBe(true);
    expect(result.second.slot.character.textEntries).toHaveLength(2);
    expect(result.conflict.ok).toBe(false);
    expect(result.conflict.slot.character.textEntries.find((entry: { kind: string }) => entry.kind === 'class').body).toBe('My summary');
    expect(result.retry.ok).toBe(true); expect(result.removed.ok).toBe(true); expect(result.failed).toBe(true);
    const persisted = result.reloaded.slots[0].character.textEntries;
    expect(persisted.find((entry: { kind: string }) => entry.kind === 'notes').body).toBe('Party-visible notes');
    expect(persisted.find((entry: { kind: string }) => entry.kind === 'class')).toMatchObject({ deleted: true, version: 3 });
  });
}

test('Supabase text RPC errors propagate without an acknowledged save', async ({ page }) => {
  await page.route('https://text-failure.invalid/rest/v1/rpc/save_character_text_entry', route => route.fulfill({
    status: 503, contentType: 'application/json', json: { message: 'Unavailable' },
  }));
  await page.goto('./');
  expect(await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts';
    const adapter = (await import(path)).createSupabasePartyData('https://text-failure.invalid', 'test-publishable-key');
    try { await adapter.saveCharacterTextEntry('slot', { id: 'story.notes', kind: 'notes', title: '', body: 'Draft', deleted: false }, 0); return false; }
    catch { return true; }
  })).toBe(true);
});
