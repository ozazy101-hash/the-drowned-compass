import { test } from './browser-fixtures';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { backupFixture } from '../tests/fixtures/party-backup';
import { createPartyBackup } from '../src/domain/party-backup';
import { enterAs, isolatedPartyUrl } from './overview-helpers';
async function seed(page: Page, info: TestInfo, source: 'local' | 'shared', extra = '') {
  await page.goto(source === 'shared' ? isolatedPartyUrl(info, extra) : `./?${extra.replace(/^&/, '')}`);
  const party = backupFixture(); Object.assign(party.slots[0].character!, { credentials: 'DO-NOT-EXPORT', campaignStory: 'DO-NOT-EXPORT' });
  await page.evaluate(async party => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData();
    await data.claimCharacterSlot('character-slot-1', party.slots[0].character);
    localStorage.setItem('unrelated-supabase-auth-token', 'DO-NOT-EXPORT'); sessionStorage.setItem('secret', 'DO-NOT-EXPORT');
  }, party);
  return party;
}
async function downloaded(page: Page, button = 'Download Party Data Backup') {
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: button, exact: true }).click(); const file = await download;
  expect(file.suggestedFilename()).toBe('the-drowned-compass-party-data-v1.json'); expect(await file.failure()).toBeNull(); return JSON.parse(await readFile((await file.path())!, 'utf8'));
}
for (const source of ['local', 'shared'] as const) test(`${source} DM downloads complete allowlisted saved file while Character Story draft stays excluded`, async ({ page }, info) => {
  const party = await seed(page, info, source); await enterAs(page, 'Dungeon Master'); await page.getByRole('button', { name: 'Open Neris Vale Character Page', exact: true }).click(); await page.getByRole('button', { name: 'Story', exact: true }).click();
  await page.getByRole('article', { name: 'Backstory', exact: true }).getByRole('textbox').fill('UNSAVED-DRAFT-NOT-IN-BACKUP');
  await expect(page.getByText('This is not a backup of campaign story, world, sessions or Dungeon Master preparation.', { exact: false })).toBeVisible(); const backup = await downloaded(page); expect(backup).toEqual(createPartyBackup(party)); expect(JSON.stringify(backup)).not.toContain('DO-NOT-EXPORT'); expect(JSON.stringify(backup)).not.toContain('UNSAVED-DRAFT');
  await expect(page.getByRole('article', { name: 'Backstory', exact: true }).getByRole('textbox')).toHaveValue('UNSAVED-DRAFT-NOT-IN-BACKUP'); await expect(page.getByText('Party Data Backup download started. Includes saved data only.', { exact: true })).toBeVisible(); await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.evaluate(() => innerWidth));
  const second = await downloaded(page); expect(second).toEqual(backup);
});
for (const source of ['local', 'shared'] as const) test(`${source} Player cannot export directly or forge a displayed DM role; signout revokes capability`, async ({ page }, info) => {
  await seed(page, info, source); await enterAs(page, 'Player'); await expect(page.getByRole('button', { name: 'Download Party Data Backup', exact: true })).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData(); const rejected = async () => { try { await data.exportPartyBackup(); return false; } catch { return true; } };
    const player = await rejected(); localStorage.setItem('drowned-compass-session-role', 'dungeon-master'); const forged = await rejected(); const session = await data.getSession();
    await data.signOut(); const signedOut = await rejected(); return { player, forged, session, signedOut };
  }); expect(result).toEqual({ player: true, forged: true, session: { role: 'player' }, signedOut: true });
});
test('shared backend rejects unknown token, forged role and cross-namespace capability; valid token revoked on signout', async ({ page }, info) => {
  await seed(page, info, 'shared'); await enterAs(page, 'Dungeon Master');
  const result = await page.evaluate(async () => {
    const namespace = new URL(location.href).searchParams.get('partyTestId')!, key = `drowned-compass-session-token:${namespace}`, token = localStorage.getItem(key)!;
    const endpoint = (ns = namespace) => `/__drowned_compass_test_backup?namespace=${encodeURIComponent(ns)}`;
    const unknown = await fetch(endpoint(), { headers: { authorization: 'Bearer unknown', role: 'dungeon-master' } });
    const cross = await fetch(endpoint('unrelated-party'), { headers: { authorization: `Bearer ${token}` } });
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; await (await import(path)).createInMemoryPartyData().signOut(); const revoked = await fetch(endpoint(), { headers: { authorization: `Bearer ${token}` } });
    return [unknown.status, cross.status, revoked.status];
  }); expect(result).toEqual([403, 403, 403]);
});
test('backup preparation failure offers retry and successful file includes fresh saved data', async ({ page }, info) => {
  const party = await seed(page, info, 'shared', '&failBackupDownloads=once'); await enterAs(page, 'Dungeon Master'); let downloads = 0; page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'Download Party Data Backup', exact: true }).click(); await expect(page.getByRole('alert')).toHaveText('The Party Data Backup could not be prepared. Please retry.'); expect(downloads).toBe(0);
  await page.evaluate(async () => { const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; await (await import(path)).createInMemoryPartyData().updateCharacterOverviewField('character-slot-1','characterName','Neris Updated',3); }); party.slots[0].character!.characterName = 'Neris Updated'; party.slots[0].character!.fieldVersions.characterName = 4;
  expect(await downloaded(page, 'Retry Party Data Backup')).toEqual(createPartyBackup(party));
});
test('authorized response arriving after DM signs out and Player signs in creates no download', async ({ page }, info) => {
  await seed(page, info, 'shared'); await enterAs(page, 'Dungeon Master'); let release!: () => void, fetched!: () => void; const held = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { fetched = resolve; });
  await page.route('**/__drowned_compass_test_backup?*', async route => { const response = await route.fetch(); fetched(); await held; await route.fulfill({ response }); });
  let downloads = 0; page.on('download', () => downloads++); await page.getByRole('button', { name: 'Download Party Data Backup', exact: true }).click(); await ready;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await enterAs(page, 'Player'); const completed = page.waitForResponse(response => response.url().includes('/__drowned_compass_test_backup?')); release(); await completed; await page.waitForTimeout(200);
  expect(downloads).toBe(0); await expect(page.getByRole('button', { name: 'Download Party Data Backup', exact: true })).toHaveCount(0);
});

for (const source of ['local', 'shared'] as const) test(`${source} role switch invalidates prior DM capability and unknown token fails closed`, async ({ page }, info) => {
  await seed(page, info, source); await enterAs(page, 'Dungeon Master');
  const result = await page.evaluate(async () => {
    const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData(), namespace = new URL(location.href).searchParams.get('partyTestId') ?? 'local', key = `drowned-compass-session-token:${namespace}`, old = localStorage.getItem(key)!;
    await data.signIn('player','player-password'); localStorage.setItem(key,old); localStorage.setItem('drowned-compass-session-role','dungeon-master');
    let revoked = false; try { await data.exportPartyBackup(); } catch { revoked = true; }
    localStorage.setItem(key,'unknown'); let unknown = false; try { await data.exportPartyBackup(); } catch { unknown = true; }
    return { revoked, unknown, session: await data.getSession() };
  }); expect(result).toEqual({ revoked: true, unknown: true, session: null });
});
test('local v1 committed Party upgrades intact; legacy role-only display cannot export before password sign-in', async ({ page }) => {
  await page.goto('./'); const party = backupFixture();
  const result = await page.evaluate(async party => {
    await new Promise<void>((resolve,reject) => { const open = indexedDB.open('drowned-compass-party',1); open.onupgradeneeded = () => open.result.createObjectStore('party'); open.onerror = () => reject(open.error); open.onsuccess = () => { const db = open.result, tx = db.transaction('party','readwrite'); tx.objectStore('party').put(party,'current'); tx.oncomplete = () => { db.close(); resolve(); }; }; });
    localStorage.setItem('drowned-compass-session-role','dungeon-master'); const path = '/the-drowned-compass/src/data/in-memory-party-data.ts'; const data = (await import(path)).createInMemoryPartyData(); let legacyDenied = false; try { await data.exportPartyBackup(); } catch { legacyDenied = true; }
    await data.signIn('dungeon-master','dm-password'); return { legacyDenied, backup: await data.exportPartyBackup() };
  },party); expect(result.legacyDenied).toBe(true); expect(result.backup).toEqual(createPartyBackup(party));
});
