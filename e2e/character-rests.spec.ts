import { test } from './browser-fixtures';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { claimCharacter, enterAs, isolatedPartyUrl } from './overview-helpers';
async function prepare(page: Page, info: TestInfo, local = false, extra = '') {
  await page.goto(local ? `./?${extra.replace(/^&/, '')}` : isolatedPartyUrl(info, extra)); await enterAs(page, 'Player'); await claimCharacter(page);
  await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData(); const id = (await data.getParty()).slots[0].id;
    await data.updateCharacterOverviewField(id, 'maxHitPoints', 20, 0);
    for (const [i, command] of [{ kind: 'correct', field: 'current', value: 3 }, { kind: 'correct', field: 'temporary', value: 7 }, { kind: 'track', field: 'successes', value: 2 }, { kind: 'track', field: 'failures', value: 1 }].entries()) await data.updateSurvival(id, command, i, 1);
    for (const [i, recovery] of ['Short Rest', 'Long Rest', 'Dawn', 'Manual'].entries()) await data.writeLimitedResource(id, { id: `11111111-1111-4111-8111-11111111111${i}`, name: `${recovery} ability`, recovery, current: 1, maximum: 3, position: i, important: i === 0, deleted: false }, 0);
    await data.updateMagic(id, { kind: 'slots', level: 1, action: 'configure', maximum: 3, remaining: 1, expectedVersion: 0 });
    await data.updateMagic(id, { kind: 'slots', level: 2, action: 'configure', maximum: 0, remaining: 0, expectedVersion: 0 });
    await data.updateMagic(id, { kind: 'spell', spell: { id: 'srd-5.2.1:acid-splash', catalogId: 'srd-5.2.1:acid-splash', name: '', level: 0, availability: 'Known', source: '', notes: 'Keep notes', deleted: false }, expectedVersion: 0 });
  });
  await expect(page.getByLabel('Maximum Hit Points', { exact: true })).toHaveValue('20');
  await expect(page.getByRole('heading', { name: 'Level 1 slots · 1 / 3', includeHidden: true })).toHaveCount(1);
  await expect(page.getByRole('article', { name: 'Acid Splash Character Spell', exact: true, includeHidden: true }).getByLabel('Player notes')).toHaveValue('Keep notes');
}
async function saved(page: Page) { return page.evaluate(async () => { const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; return (await (await import(path)).createInMemoryPartyData().getParty()).slots[0].character; }); }
async function mutate(page: Page, kind: string) {
  await page.evaluate(async kind => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData(); const slot = (await data.getParty()).slots[0], c = slot.character;
    if (kind === 'slot') await data.updateMagic(slot.id, { kind: 'slots', level: 1, action: 'spend', expectedVersion: c.magic.slots[0].version });
    if (kind === 'maximum') await data.updateCharacterOverviewField(slot.id, 'maxHitPoints', 25, c.fieldVersions.maxHitPoints);
    if (kind === 'removed') { const { version, ...r } = c.limitedResources[0]; await data.writeLimitedResource(slot.id, { ...r, deleted: true }, version); }
    if (kind === 'independent') { await data.updateCharacterOverviewField(slot.id, 'characterName', 'Neris Updated', c.fieldVersions.characterName ?? 0); const { version, ...r } = c.limitedResources[2]; await data.writeLimitedResource(slot.id, { ...r, current: 0 }, version); }
  }, kind);
}
const preview = (page: Page) => page.getByLabel('Long Rest preview', { exact: true });
for (const local of [false, true]) test(`${local ? 'IndexedDB' : 'shared transport'} mixed timing, exclusions, cancellation and accepted synchronization`, async ({ page }, info) => {
  await prepare(page, info, local); const before = await saved(page);
  await page.getByRole('button', { name: 'Preview Short Rest', exact: true }).click();
  const short = page.getByLabel('Short Rest preview', { exact: true }); await expect(short.getByRole('checkbox')).toHaveCount(1); await expect(short.getByText('Short Rest ability:', { exact: false })).toContainText('1 / 3 → 3 / 3');
  await page.getByRole('button', { name: 'Cancel rest', exact: true }).click(); expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); await expect(preview(page).getByRole('checkbox')).toHaveCount(6); expect(await saved(page)).toEqual(before);
  await preview(page).getByRole('checkbox', { name: /Current Hit Points/ }).uncheck(); await preview(page).getByRole('checkbox', { name: /Death save failures/ }).uncheck(); await preview(page).getByRole('checkbox', { name: /Long Rest ability/ }).uncheck();
  await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByText('Long Rest saved. 3 selected recoveries accepted together.', { exact: true })).toBeVisible();
  const c = await saved(page); expect(c.survival).toMatchObject({ current: 3, temporary: 7, successes: 0, failures: 1, version: 5 }); expect(c.limitedResources.map((r: { current: number }) => r.current)).toEqual([3, 1, 1, 1]); expect(c.magic.slots[0]).toMatchObject({ remaining: 3, version: 2 });
  await page.getByRole('button', { name: 'Magic', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Level 1 slots · 3 / 3' })).toBeVisible(); await expect(page.getByRole('article', { name: 'Acid Splash Character Spell', exact: true }).getByLabel('Player notes')).toHaveValue('Keep notes');
  await page.getByRole('button', { name: 'Combat', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Health', exact: true })).toBeVisible(); await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth));
});
test('all selected recoveries synchronize while independent concurrent writes and dirty Magic draft survive', async ({ page }, info) => {
  await prepare(page, info); await page.getByText('Correct Current Hit Points', { exact: true }).click(); await page.getByLabel('Current Hit Points', { exact: true }).fill('9'); await page.getByRole('button', { name: 'Magic', exact: true }).click();
  const slots = page.getByRole('article', { name: 'Level 1 spell slots', exact: true }); await slots.getByLabel('Maximum slots', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); await mutate(page, 'independent');
  await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByText('Long Rest saved. 6 selected recoveries accepted together.', { exact: true })).toBeVisible();
  const c = await saved(page); expect(c.characterName).toBe('Neris Updated'); expect(c.limitedResources.find((r: { recovery: string }) => r.recovery === 'Dawn').current).toBe(0); expect(c.survival).toMatchObject({ current: 20, temporary: 7, successes: 0, failures: 0 });
  await expect(slots.getByLabel('Maximum slots', { exact: true })).toHaveValue('8'); await expect(slots.getByText(/Saved values: 3 remaining, 3 maximum/)).toBeVisible(); await expect(slots.getByRole('button', { name: 'Save slot counts', exact: true })).toBeDisabled();
  await slots.getByRole('button', { name: 'Use saved slots', exact: true }).click(); await expect(slots.getByLabel('Maximum slots', { exact: true })).toHaveValue('3');
  await page.getByRole('button', { name: 'Combat', exact: true }).click(); await expect(page.getByLabel('Current Hit Points', { exact: true })).toHaveValue('9'); await expect(page.getByText('Current HP:', { exact: false })).toContainText('20');
});
for (const kind of ['slot', 'maximum', 'removed']) test(`stale selected ${kind} rejects everything and fresh preview succeeds`, async ({ page }, info) => {
  await prepare(page, info); await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); await mutate(page, kind); const before = await saved(page);
  await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByText(/This attempt applied no recoveries/)).toBeVisible(); expect(await saved(page)).toEqual(before);
  await expect(preview(page).getByRole('checkbox').first()).toBeDisabled(); await page.getByRole('button', { name: 'Create fresh preview', exact: true }).click();
  if (kind === 'removed') await expect(preview(page).getByRole('checkbox', { name: /Short Rest ability/ })).toHaveCount(0);
  if (kind === 'maximum') await expect(preview(page).getByRole('checkbox', { name: /Current Hit Points/ })).toHaveAccessibleName(/3 → 25/);
  await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByText(/Long Rest saved\./)).toBeVisible();
});
test('failure freezes exact selection and retry applies once', async ({ page }, info) => {
  await prepare(page, info, false, '&failRestSaves=once'); await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); const before = await saved(page);
  await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByText(/The rest could not reach/)).toBeVisible(); expect(await saved(page)).toEqual(before);
  await expect(preview(page).getByRole('checkbox').first()).toBeDisabled(); await page.getByRole('button', { name: 'Retry rest save', exact: true }).click(); await expect(page.getByText(/Long Rest saved\./)).toBeVisible(); expect((await saved(page)).survival.version).toBe(5);
});
test('lost HTTP acknowledgement retry does not restore over independent spend', async ({ page }, info) => {
  await prepare(page, info); let intercepted = false;
  await page.route('**/__drowned_compass_test_party?*', async route => {
    if (!intercepted && route.request().method() === 'PATCH' && route.request().postDataJSON()?.restCommand) { intercepted = true; await route.fetch(); await route.abort('failed'); } else await route.continue();
  });
  await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByRole('button', { name: 'Retry rest save', exact: true })).toBeVisible();
  await mutate(page, 'slot'); const before = await saved(page); await page.getByRole('button', { name: 'Retry rest save', exact: true }).click(); await expect(page.getByText(/Long Rest saved\./)).toBeVisible(); expect(await saved(page)).toEqual(before);
});

test('unknown HP preview, no-change Short Rest and excluding every change stay deliberate', async ({ page }, info) => {
  await page.goto(isolatedPartyUrl(info)); await enterAs(page, 'Player'); await claimCharacter(page); const before = await saved(page);
  await page.getByRole('button', { name: 'Preview Short Rest', exact: true }).click(); await expect(page.getByText('No saved values need recovery.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Confirm Short Rest', exact: true })).toBeDisabled(); await page.getByRole('button', { name: 'Cancel rest', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); await expect(preview(page).getByRole('checkbox')).toHaveCount(1); await expect(preview(page).getByRole('checkbox')).toHaveAccessibleName(/Unknown → 1/); await preview(page).getByRole('checkbox').uncheck(); await expect(page.getByRole('button', { name: 'Confirm Long Rest', exact: true })).toBeDisabled(); expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: 'Cancel rest', exact: true }).click(); expect(await saved(page)).toEqual(before); await page.getByRole('button', { name: 'Preview Long Rest', exact: true }).click(); await page.getByRole('button', { name: 'Confirm Long Rest', exact: true }).click(); await expect(page.getByText('Long Rest saved. 1 selected recoveries accepted together.', { exact: true })).toBeVisible(); expect((await saved(page)).survival.current).toBe(1);
});
