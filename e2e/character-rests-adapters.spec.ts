import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { applyRestCommand } from '../src/domain/character-rests';
import type { CharacterRecord } from '../src/domain/party';
import { claimCharacter, enterAs, isolatedPartyUrl } from './overview-helpers';
for (const source of ['local', 'shared', 'supabase'] as const) test(`${source} atomic Rest adapter preserves exclusions, CAS, receipts and accepted records`, async ({ page }, info) => {
  await page.goto(source === 'shared' ? isolatedPartyUrl(info) : './'); await enterAs(page, 'Player'); await claimCharacter(page);
  const remote: CharacterRecord = await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData(); const slot = (await data.getParty()).slots[0];
    await data.updateCharacterOverviewField(slot.id, 'maxHitPoints', 20, 0);
    await data.updateMagic(slot.id, { kind: 'slots', level: 1, action: 'configure', maximum: 3, remaining: 1, expectedVersion: 0 });
    await data.updateMagic(slot.id, { kind: 'slots', level: 2, action: 'configure', maximum: 0, remaining: 0, expectedVersion: 0 });
    await data.writeLimitedResource(slot.id, { id: '11111111-1111-4111-8111-111111111110', name: 'Second Wind', current: 0, maximum: 1, recovery: 'Short Rest', important: true, deleted: false, position: 0 }, 0);
    return (await data.getParty()).slots[0].character;
  });
  let rpcCalls = 0;
  await page.route('https://rests-contract.invalid/rest/v1/**', async route => {
    const path = new URL(route.request().url()).pathname; let json: unknown = [];
    if (path.endsWith('/parties')) json = { id: 'party', name: 'The Drowned Compass' };
    if (path.endsWith('/character_slots')) json = [{ id: 'slot', position: 1, claimed_at: '2026-10-06', player_name: remote.playerName, character_name: remote.characterName, primary_class: remote.primaryClass, subclass: remote.subclass, species: remote.species, background: remote.background, level: remote.level,
      ...remote.abilityScores, saving_throw_proficiencies: remote.savingThrowProficiencies, skill_proficiencies: remote.skillProficiencies, armor_class: remote.armorClass, max_hit_points: remote.maxHitPoints, speed: remote.speed, spellcasting_ability: remote.spellcastingAbility, derived_overrides: remote.derivedOverrides, overview_field_versions: remote.fieldVersions }];
    if (path.endsWith('/character_survival')) json = [{ slot_id: 'slot', state: remote.survival }];
    if (path.endsWith('/limited_resources')) json = remote.limitedResources!.map(r => ({ ...r, slot_id: 'slot' }));
    if (path.endsWith('/character_magic')) json = remote.magic!.slots.map(({ id, version, ...state }) => ({ id, version, state, kind: 'slots', slot_id: 'slot' }));
    if (path.endsWith('/rpc/resolve_character_rest')) { rpcCalls++; const { command, target_slot_id } = route.request().postDataJSON(); expect(target_slot_id).toBe('slot'); try { json = applyRestCommand(remote, command); } catch { await route.fulfill({ status: 400, contentType: 'application/json', json: { message: 'Rest operation identity cannot change.' } }); return; } }
    await route.fulfill({ contentType: 'application/json', json });
  });
  const result = await page.evaluate(async source => {
    const memory = '/the-drowned-compass/src/data/in-memory-party-data.ts', production = '/the-drowned-compass/src/data/supabase-party-data.ts', domain = '/the-drowned-compass/src/domain/character-rests.ts';
    const data = source === 'supabase' ? (await import(production)).createSupabasePartyData('https://rests-contract.invalid', 'test-key') : (await import(memory)).createInMemoryPartyData();
    const { previewRest } = await import(domain); let slot = (await data.getParty()).slots[0];
    const command = { operationId: '22222222-2222-4222-8222-222222222222', rest: 'Long Rest', changes: previewRest(slot.character, 'Long Rest').map((p: { change: unknown }) => p.change) };
    const stale = await data.resolveRest(slot.id, { ...command, changes: command.changes.map((c: { kind: string; expectedVersion: number }) => c.kind === 'slots' ? { ...c, expectedVersion: 0 } : c) });
    const before = (await data.getParty()).slots[0]; const accepted = await data.resolveRest(slot.id, command); const replay = await data.resolveRest(slot.id, command);
    let mismatch = false; try { await data.resolveRest(slot.id, { ...command, changes: command.changes.slice(1) }); } catch { mismatch = true; }
    slot = (await data.getParty()).slots[0]; return { before, stale, accepted, replay, mismatch, final: slot };
  }, source);
  expect(result.stale.ok).toBe(false); expect(result.before.character.survival.current).toBeNull(); expect(result.before.character.limitedResources[0].current).toBe(0); expect(result.before.character.magic.slots[0].remaining).toBe(1);
  expect(result.accepted.ok).toBe(true); expect(result.replay.ok).toBe(true); expect(result.mismatch).toBe(true); expect(result.final.character.survival).toMatchObject({ current: 20, version: 1, temporary: 0 });
  expect(result.final.character.limitedResources[0]).toMatchObject({ current: 1, maximum: 1, version: 2, important: true }); expect(result.final.character.magic.slots[0]).toMatchObject({ remaining: 3, version: 2 }); expect(result.final.character.magic.slots[1]).toMatchObject({ remaining: 0, version: 1 });
  expect(result.final.character.characterName).toBe('Neris Vale'); if (source === 'supabase') expect(rpcCalls).toBe(4);
});
test('Supabase rest RPC error and accepted-but-load-failed retry are safely reported', async ({ page }) => {
  await page.goto('./');
  await page.route('https://rests-failure.invalid/rest/v1/rpc/resolve_character_rest', route => route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'Unavailable' } }));
  await page.route('https://rests-load-failure.invalid/rest/v1/rpc/resolve_character_rest', route => route.fulfill({ contentType: 'application/json', json: true }));
  await page.route('https://rests-load-failure.invalid/rest/v1/parties*', route => route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'Unavailable' } }));
  const rejected = await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts'; const { createSupabasePartyData } = await import(path); const command = { operationId: '22222222-2222-4222-8222-222222222222', rest: 'Long Rest', changes: [{ kind: 'slots', level: 1, expectedVersion: 1 }] };
    return Promise.all(['https://rests-failure.invalid', 'https://rests-load-failure.invalid'].map(async url => { try { await createSupabasePartyData(url, 'test-key').resolveRest('slot', command); return false; } catch { return true; } }));
  }); expect(rejected).toEqual([true, true]);
});
