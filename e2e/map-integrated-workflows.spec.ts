import { test } from './browser-fixtures';
import { expect } from '@playwright/test';
import { pdfFixture, png } from './handout-fixtures';

test('genuine Character edits and Handout PDF sharing continue during outstanding retained-artwork generation', async ({ page, context }, info) => {
  const index = info.project.name === 'phone' ? 1 : 0;
  const url = process.env.MAP_LIVE_URL!, key = process.env.MAP_LIVE_KEY!;
  const jwt = JSON.parse(process.env.MAP_CROSS_DM_JWTS!)[index];
  const playerJwt = JSON.parse(process.env.MAP_CROSS_PLAYER_JWTS!)[index];
  await page.goto('tests/harness/map-workshop.html');
  await page.waitForFunction(() => typeof (window as any).configure === 'function');
  await page.evaluate(c => (window as any).configure(c), { url, key, jwt, server: process.env.MAP_FIXTURE_SERVER! });
  await page.evaluate(async ({ url, key, jwt, playerJwt }) => {
    const sdk = await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
    const auth = sdk.createClient(url, key); await auth.auth.setSession({ access_token: jwt, refresh_token: 'fixture-refresh' });
    const factory = (await import('/the-drowned-compass/src/data/supabase-party-data.ts')).createSupabasePartyData;
    const a = factory(url, key), b = factory(url, key);
    const initial = await a.getParty();
    const player = (await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(sdk.createClient(url, key, { accessToken: async () => playerJwt, auth: { persistSession: false } }));
    Object.assign(window, { cross: { a, b, initial, player, url, key, jwt, playerJwt } });
  }, { url, key, jwt, playerJwt });
  // Only delivery is held: real Edge receipt/SQL/storage continue. No fake job success.
  let release!: () => void, received!: () => void;
  const hold = new Promise<void>(r => release = r), receipt = new Promise<void>(r => received = r);
  await page.route(process.env.MAP_FIXTURE_SERVER! + '/**', async route => {
    const body = route.request().headers()['content-type']?.includes('application/json') ? route.request().postDataJSON() : null;
    if (body?.kind !== 'submit') return route.continue();
    const response = await route.fetch(); received(); await hold; await route.fulfill({ response });
  });
  await page.getByLabel('Map description').fill('Retained-image fixture: private sea cave');
  await page.getByRole('button', { name: 'Create map', exact: true }).click();
  await receipt;
  await expect(page.getByRole('button', { name: 'Create map', exact: true })).toBeDisabled();
  const edits = await page.evaluate(async () => {
    const { a, b, initial } = (window as any).cross, slot = initial.slots[0], c = slot.character;
    const first = await a.updateCharacterOverviewField(slot.id, 'armorClass', 17, c.fieldVersions.armorClass ?? 0);
    const independent = await b.updateCharacterOverviewField(slot.id, 'speed', 40, c.fieldVersions.speed ?? 0);
    const stale = await b.updateCharacterOverviewField(slot.id, 'armorClass', 19, c.fieldVersions.armorClass ?? 0);
    const final = await b.getParty();
    return { first: first.ok, independent: independent.ok, stale: stale.ok, character: final.slots[0].character, unrelated: JSON.stringify(initial.slots.slice(1)) === JSON.stringify(final.slots.slice(1)) };
  });
  expect(edits).toMatchObject({ first: true, independent: true, stale: false, unrelated: true, character: { armorClass: 17, speed: 40 } });
  const popup = page.waitForEvent('popup');
  await page.evaluate(async bytes => {
    const c = (window as any).cross;
    c.handout = await c.a.content.upload({ requestId: crypto.randomUUID(), title: 'Ticket12 genuine private PDF', file: new File([new Uint8Array(bytes)], 'letter.pdf', { type: 'application/pdf' }) });
    c.display = (await import('/the-drowned-compass/src/features/presentation/party-display.ts')).createPartyDisplay(c.a.content, () => c.a.getSession());
    c.display.openWindow(); await c.display.present(c.handout);
  }, [...pdfFixture()]);
  const display = await popup;
  await expect(display.getByLabel('Party Display page 1')).toBeVisible();
  const sharing = await page.evaluate(async () => {
    const c = (window as any).cross, listed = await c.player.list(), item = listed.find((x: any) => x.id === c.handout.id), bytes = await c.player.open(c.handout.id);
    await c.display.page(2);
    return { revealed: item.visibility, type: bytes.type, size: bytes.size };
  });
  expect(sharing).toMatchObject({ revealed: 'revealed', type: 'application/pdf' }); expect(sharing.size).toBe(pdfFixture().length);
  await expect(display.getByLabel('Party Display page 2')).toBeVisible();
  const replacement = await page.evaluate(async bytes => {
    const c = (window as any).cross, current = (await c.a.content.list()).find((x: any) => x.id === c.handout.id);
    const result = await c.a.content.change({ id: current.id, expectedVersion: current.version, requestId: crypto.randomUUID(), command: { kind: 'replace', file: new File([new Uint8Array(bytes)], 'letter.png', { type: 'image/png' }) } });
    const player = await c.player.open(current.id); return { ok: result.ok, type: player.type, size: player.size };
  }, [...png]);
  expect(replacement).toEqual({ ok: true, type: 'image/png', size: png.length });
  // Existing Handout canvas aria-label can retain page2 after PNG replacement.
  // Assert accepted state and actual rendered replacement bytes, not that label.
  await expect.poll(() => page.evaluate(() => {const s=(window as any).cross.display.getState();return {page:s.page,pages:s.pages};})).toEqual({page:1,pages:1});
  const expectedPixel = await page.evaluate(async bytes => {const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);image.close();return [...ctx.getImageData(c.width/2,c.height/2,1,1).data];},[...png]);
  await expect(display.locator('canvas')).toBeVisible();
  await expect.poll(() => display.locator('canvas').evaluate((c:HTMLCanvasElement) => [...c.getContext('2d')!.getImageData(c.width/2,c.height/2,1,1).data])).toEqual(expectedPixel);
  release(); await page.unroute(process.env.MAP_FIXTURE_SERVER! + '/**');
  await expect(page.getByRole('button', { name: 'Save completed artwork' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Save completed artwork' }).click();
  await expect(page.getByRole('status').first()).toContainText('Saved privately', { timeout: 30000 });
  const final = await page.evaluate(async () => {
    const c = (window as any).cross, w = await (window as any).content.readMapWorkspace();
    let mapDenied = false; try { await c.player.openMapVersion(w.versions[0].id); } catch { mapDenied = true; }
    const sdk = await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
    const dm = sdk.createClient(c.url,c.key,{accessToken:async()=>c.jwt,auth:{persistSession:false}});
    const row = (await dm.from('party_map_artwork_versions').select('party_id,background').eq('id',w.versions[0].id).single()).data;
    const path=c.url+'/storage/v1/object/authenticated/party-handouts/'+row.party_id+'/'+row.background.object_id;
    const dmRead=await fetch(path,{headers:{apikey:c.key,Authorization:'Bearer '+c.jwt}});
    const playerRead=await fetch(path,{headers:{apikey:c.key,Authorization:'Bearer '+c.playerJwt}});
    const anonRead=await fetch(path,{headers:{apikey:c.key,Authorization:'Bearer '+c.key}});
    let oldCommands=0;for(const kind of ['reveal','withdraw']){const r=await dm.rpc('change_party_grid_map',{p_id:w.versions[0].familyId,p_expected_version:w.families[0].version,p_request_id:crypto.randomUUID(),p_kind:kind,p_copy_id:null,p_title:null,p_client_signature:kind});if(r.error)oldCommands++;}
    const current = (await c.a.content.list()).find((x: any) => x.id === c.handout.id);
    const withdrawn = await c.a.content.change({ id: current.id, expectedVersion: current.version, requestId: crypto.randomUUID(), command: { kind: 'withdraw' } });
    let denied = false; try { await c.player.open(current.id); } catch { denied = true; }
    return { versions: w.versions.length, mapDenied, knownPath:{dm:dmRead.ok,player:playerRead.ok,anonymous:anonRead.ok},oldCommands, withdrawn: withdrawn.ok, denied, character: (await c.b.getParty()).slots[0].character };
  });
  expect(final).toMatchObject({ versions: 1, mapDenied: true,knownPath:{dm:true,player:false,anonymous:false},oldCommands:2, withdrawn: true, denied: true, character: { armorClass: 17, speed: 40 } });
  await expect(display.locator('canvas')).toHaveCount(0);
  await display.close();
  await page.screenshot({ path: info.outputPath('integrated-workshop.png'), fullPage: true });
  expect(context.pages()).toHaveLength(1);
});
