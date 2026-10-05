import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { backupFixture } from '../tests/fixtures/party-backup';
import { createPartyBackup } from '../src/domain/party-backup';
test('production Supabase adapter uses one authoritative snapshot RPC and nested allowlist projection', async ({ page }) => {
  const party = backupFixture(); Object.assign(party, { access_token: 'DO-NOT-EXPORT' }); Object.assign(party.slots[0].character!.magic!.spells[0], { auth: 'DO-NOT-EXPORT' }); let calls = 0;
  await page.route('https://backup-contract.invalid/**', async route => { expect(new URL(route.request().url()).pathname).toBe('/rest/v1/rpc/export_party_data_snapshot'); expect(route.request().method()).toBe('POST'); expect(route.request().postDataJSON()).toEqual({}); calls++; await route.fulfill({ contentType: 'application/json', json: party }); });
  await page.goto('./'); const backup = await page.evaluate(async () => { const path = '/the-drowned-compass/src/data/supabase-party-data.ts'; return await (await import(path)).createSupabasePartyData('https://backup-contract.invalid','test-key').exportPartyBackup(); });
  expect(backup).toEqual(createPartyBackup(party)); expect(JSON.stringify(backup)).not.toContain('DO-NOT-EXPORT'); expect(calls).toBe(1);
});
test('production adapter cannot bypass server denial with client DM claims and retry captures a fresh snapshot', async ({ page }) => {
  let calls = 0; const party = backupFixture();
  await page.route('https://backup-failure.invalid/**', async route => { calls++; if (calls === 1) return route.fulfill({ status: 403, contentType: 'application/json', json: { code: '42501', message: 'DO-NOT-EXPORT' } }); if (calls === 2) return route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'DO-NOT-EXPORT' } }); party.slots[0].character!.characterName = 'Fresh saved record'; return route.fulfill({ contentType: 'application/json', json: party }); });
  await page.goto('./'); const result = await page.evaluate(async () => { localStorage.setItem('drowned-compass-session-role','dungeon-master'); const path = '/the-drowned-compass/src/data/supabase-party-data.ts'; const data = (await import(path)).createSupabasePartyData('https://backup-failure.invalid','test-key'); const errors = []; for (let i = 0; i < 2; i++) try { await data.exportPartyBackup(); } catch (error) { errors.push((error as Error).message); } return { errors, backup: await data.exportPartyBackup() }; });
  expect(result.errors).toEqual(['Dungeon Master access is required. Sign in again to download a Party Data Backup.','The Party Data Backup could not be prepared. Please retry.']); expect(result.backup.slots[0].character!.characterName).toBe('Fresh saved record'); expect(calls).toBe(3);
});
