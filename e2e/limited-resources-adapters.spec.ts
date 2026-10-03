import { test, expect } from '@playwright/test';

for (const backend of ['in-memory', 'Supabase']) {
  test(`${backend} adapter preserves independent resources, conflicts, importance and tombstones`, async ({ page }) => {
    const resources: Record<string, unknown>[] = [];
    await page.route('https://supabase-resource-contract.invalid/rest/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (path.endsWith('/rpc/write_limited_resource')) {
        const args = route.request().postDataJSON();
        expect(args.target_slot_id).toBe('test-slot');
        const existing = resources.find(resource => resource.id === args.target_resource_id);
        json = (existing?.version ?? 0) === args.expected_version && !existing?.deleted;
        if (json) {
          if (args.next_important) for (const resource of resources) {
            if (resource.important && resource.id !== args.target_resource_id) { resource.important = false; resource.version = Number(resource.version) + 1; }
          }
          const next = { id: args.target_resource_id, slot_id: args.target_slot_id, name: args.next_name, current: args.next_current, maximum: args.next_maximum,
            recovery: args.next_recovery, position: args.next_position, important: args.next_important && !args.next_deleted, deleted: args.next_deleted, version: args.expected_version + 1 };
          if (existing) Object.assign(existing, next); else resources.push(next);
        }
      } else if (path.endsWith('/character_survival')) json = [];
      else if (path.endsWith('/limited_resources')) json = resources;
      await route.fulfill({ contentType: 'application/json', json });
    });
    await page.goto('./');
    const result = await page.evaluate(async backend => {
      const partyPath = '/the-drowned-compass/src/data/in-memory-party-data.ts';
      const supabasePath = '/the-drowned-compass/src/data/supabase-party-data.ts';
      const { createInMemoryPartyData } = await import(partyPath);
      const { createSupabasePartyData } = await import(supabasePath);
      const adapter = backend === 'Supabase' ? createSupabasePartyData('https://supabase-resource-contract.invalid', 'test-publishable-key') : createInMemoryPartyData();
      const slotId = backend === 'Supabase' ? 'test-slot' : 'character-slot-1';
      if (backend !== 'Supabase') {
        localStorage.setItem('drowned-compass-party', JSON.stringify({ name: 'Party', slots: [{ id: slotId, position: 1, character: { characterName: 'Neris', abilityScores: {}, fieldVersions: {} } }] }));
      }
      const a = { id: crypto.randomUUID(), name: 'Second Wind', current: 3, maximum: 3, recovery: 'Short Rest', position: 0, important: true, deleted: false };
      const b = { ...a, id: crypto.randomUUID(), name: 'Luck', recovery: 'Dawn', important: false };
      const added = await adapter.writeLimitedResource(slotId, a, 0);
      const independent = await adapter.writeLimitedResource(slotId, b, 0);
      const spent = await adapter.writeLimitedResource(slotId, { ...a, current: 2 }, 1);
      const conflict = await adapter.writeLimitedResource(slotId, { ...a, current: 1 }, 1);
      const handoff = await adapter.writeLimitedResource(slotId, { ...b, important: true }, 1);
      const deleted = await adapter.writeLimitedResource(slotId, { ...b, important: true, deleted: true }, 2);
      const resurrected = await adapter.writeLimitedResource(slotId, b, 3);
      let invalid = false;
      try { await adapter.writeLimitedResource(slotId, { ...a, current: 4 }, 3); } catch { invalid = true; }
      return { added, independent, spent, conflict, handoff, deleted, resurrected, invalid };
    }, backend);
    expect(result.added.ok).toBe(true); expect(result.independent.resources).toHaveLength(2);
    expect(result.spent.resources.find(resource => resource.name === 'Luck')?.current).toBe(3);
    expect(result.conflict.ok).toBe(false);
    expect(result.conflict.resources.find(resource => resource.name === 'Second Wind')?.current).toBe(2);
    expect(result.handoff.resources.filter(resource => resource.important)).toHaveLength(1);
    expect(result.handoff.resources.find(resource => resource.name === 'Second Wind')?.version).toBe(3);
    expect(result.deleted.resources.find(resource => resource.name === 'Luck')).toMatchObject({ deleted: true, important: false, version: 3 });
    expect(result.resurrected.ok).toBe(false); expect(result.invalid).toBe(true);
  });
}

test('Supabase resource write errors are exposed and later writes can retry', async ({ page }) => {
  let attempts = 0;
  await page.route('https://supabase-resource-contract.invalid/rest/v1/**', async route => {
    if (route.request().url().includes('/rpc/')) {
      attempts++;
      await route.fulfill(attempts === 1 ? { status: 503, json: { message: 'Temporarily unavailable' } } : { json: true });
    } else await route.fulfill({ json: [] });
  });
  await page.goto('./');
  const result = await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/supabase-party-data.ts';
    const { createSupabasePartyData } = await import(path);
    const adapter = createSupabasePartyData('https://supabase-resource-contract.invalid', 'test-publishable-key');
    const resource = { id: crypto.randomUUID(), name: 'Luck', current: 1, maximum: 1, recovery: 'Manual', position: 1, important: false, deleted: false };
    let failed = false;
    try { await adapter.writeLimitedResource('slot', resource, 0); } catch { failed = true; }
    const retry = await adapter.writeLimitedResource('slot', resource, 0);
    return { failed, retry };
  });
  expect(result.failed).toBe(true); expect(result.retry.ok).toBe(true); expect(attempts).toBe(2);
});

test('localStorage cross-tab Overview, resource and Combat writes preserve all accepted changes', async ({ page, context }) => {
  await page.goto('./');
  const other = await context.newPage(); await other.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('drowned-compass-party', JSON.stringify({ name: 'Party', slots: [{ id: 'character-slot-1', position: 1, character: { characterName: 'Neris', abilityScores: {}, fieldVersions: {} } }] }));
  });
  for (let iteration = 0; iteration < 6; iteration++) {
    const [resource, overview, combat] = await Promise.all([
      page.evaluate(async iteration => {
        const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
        const { createInMemoryPartyData } = await import(path);
        return createInMemoryPartyData().writeLimitedResource('character-slot-1', { id: '51000000-0000-4000-8000-000000000001', name: 'Luck', current: iteration, maximum: 6, recovery: 'Manual', position: 1, important: false, deleted: false }, iteration);
      }, iteration),
      other.evaluate(async iteration => {
        const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
        const { createInMemoryPartyData } = await import(path);
        return createInMemoryPartyData().updateCharacterOverviewField('character-slot-1', 'speed', 31 + iteration, iteration);
      }, iteration),
      page.evaluate(async iteration => {
        const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
        const { createInMemoryPartyData } = await import(path);
        return createInMemoryPartyData().updateCombatEntry('character-slot-1', {
          type: 'save', id: '52000000-0000-4000-8000-000000000001', rank: 1, expectedVersion: iteration,
          details: { kind: 'action', name: 'Help', ability: null, attackBonus: '', range: '', damage: '', damageType: '', notes: String(iteration) },
        });
      }, iteration),
    ]);
    expect(resource.ok).toBe(true); expect(overview.ok).toBe(true); expect(combat.ok).toBe(true);
  }
  const record = await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
    const { createInMemoryPartyData } = await import(path);
    return (await createInMemoryPartyData().getParty()).slots[0].character;
  });
  expect(record.speed).toBe(36); expect(record.fieldVersions.speed).toBe(6);
  expect(record.limitedResources[0]).toMatchObject({ current: 5, version: 6 });
  expect(record.combatEntries.entries[0]).toMatchObject({ version: 6, details: { notes: '5' } });
  await other.close();
});
