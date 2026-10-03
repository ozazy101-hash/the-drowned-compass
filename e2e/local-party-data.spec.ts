import { expect } from '@playwright/test';
import { test } from './browser-fixtures';
{
  const source = 'in-memory-party-data';
  test('committed local Party snapshots preserve independently accepted versions across tabs', async ({ page, context }) => {
    await page.goto('./'); const other = await context.newPage(); await other.goto('./');
    await page.evaluate(() => localStorage.setItem('drowned-compass-party', JSON.stringify({ name: 'Party', slots: [{ id: 'character-slot-1', position: 1, character: { characterName: 'Neris', abilityScores: {}, fieldVersions: {} } }] })));
    await page.evaluate(async source => { await (await import(`/the-drowned-compass/src/data/${source}.ts`)).createInMemoryPartyData().getParty(); }, source);
    for (let iteration = 0; iteration < 300; iteration++) {
      const [resource, overview] = await Promise.all([
        page.evaluate(async ({ iteration, source }) => {
          const { createInMemoryPartyData } = await import(`/the-drowned-compass/src/data/${source}.ts`);
          return createInMemoryPartyData().writeLimitedResource('character-slot-1', { id: '51000000-0000-4000-8000-000000000001', name: 'Luck', current: iteration, maximum: 300, recovery: 'Manual', position: 1, important: false, deleted: false }, iteration);
        }, { iteration, source }),
        other.evaluate(async ({ iteration, source }) => {
          const { createInMemoryPartyData } = await import(`/the-drowned-compass/src/data/${source}.ts`);
          return createInMemoryPartyData().updateCharacterOverviewField('character-slot-1', 'speed', iteration % 100, iteration);
        }, { iteration, source }),
      ]);
      expect(resource.ok && overview.ok, JSON.stringify({ iteration, resource, overview })).toBe(true);
    }
    await page.evaluate(() => localStorage.setItem('drowned-compass-party', '{}'));
    await page.reload();
    const record = await page.evaluate(async () => {
      const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
      return (await (await import(path)).createInMemoryPartyData().getParty()).slots[0].character;
    });
    expect(record.fieldVersions.speed).toBe(300);
    expect(record.limitedResources[0]).toMatchObject({ current: 299, version: 300 });
    await other.close();
  });
}

test('committed local inventory synchronizes when the legacy mirror cannot be written', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    localStorage.setItem('drowned-compass-party', JSON.stringify({ name: 'Party', slots: [{ id: 'character-slot-1', position: 1, character: { characterName: 'Neris', abilityScores: {}, fieldVersions: {} } }] }));
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
    await (await import(path)).createInMemoryPartyData().getParty();
  });
  const other = await context.newPage(); await other.goto('./');
  await other.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
    (await import(path)).createInMemoryPartyData().subscribeToParty((party: { slots: Array<{ character: { inventory: Array<{ title: string }> } }> }) => {
      document.body.dataset.inventory = party.slots[0].character.inventory[0]?.title;
    });
  });
  const result = await page.evaluate(async () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'drowned-compass-party') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    try {
      const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
      return await (await import(path)).createInMemoryPartyData().saveInventoryEntry('character-slot-1', {
        id: 'item.54000000-0000-4000-8000-000000000001', kind: 'equipment', title: 'Rope', body: '50 feet', rank: 0, deleted: false,
      }, 0);
    } finally { Storage.prototype.setItem = original; }
  });
  expect(result.ok).toBe(true);
  await expect(other.locator('body')).toHaveAttribute('data-inventory', 'Rope');
  await page.reload();
  expect(await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts';
    return (await (await import(path)).createInMemoryPartyData().getParty()).slots[0].character.inventory[0].title;
  })).toBe('Rope');
  await other.close();
});
