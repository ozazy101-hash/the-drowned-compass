# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: map-integrated-workflows.spec.ts >> genuine Character edits and Handout PDF sharing continue during outstanding retained-artwork generation
- Location: e2e/map-integrated-workflows.spec.ts:5:1

# Error details

```
Error: route.fulfill: Route is already handled!
```

```
Error: locator.click: Test ended.
Call log:
  - waiting for getByRole('button', { name: 'Save completed artwork' })
    - locator resolved to <button disabled>Save completed artwork</button>

```

# Page snapshot

```yaml
- main [ref=e3]:
  - button "Back to Party" [ref=e4] [cursor=pointer]
  - button "Open Dungeon Master Library" [ref=e5] [cursor=pointer]
  - heading "Map creation workshop" [level=1] [ref=e6]
  - paragraph [ref=e7]: Private DM artwork. Creating, uploading and inspecting leave the Party Display unchanged.
  - button "Open drawing tools" [ref=e8] [cursor=pointer]
  - paragraph [ref=e9]: Drawing tools open the latest saved drawing in the chosen map family.
  - group [ref=e10]:
    - heading "Create a map" [level=2] [ref=e11]
    - generic [ref=e12]:
      - button "Invent a map" [disabled] [pressed] [ref=e13]
      - button "Use my sketch" [disabled] [ref=e14]
      - button "New map" [disabled] [ref=e15]
    - generic [ref=e16]:
      - text: Map title
      - textbox "Map title" [disabled] [ref=e17]: Untitled Grid Map
    - generic [ref=e18]:
      - generic [ref=e19]:
        - text: Columns
        - spinbutton "Columns" [disabled] [ref=e20]: "20"
      - generic [ref=e21]:
        - text: Rows
        - spinbutton "Rows" [disabled] [ref=e22]: "14"
      - generic [ref=e23]:
        - text: Game feet per square
        - spinbutton "Game feet per square" [disabled] [ref=e24]: "5"
    - generic [ref=e25]:
      - text: Map description
      - textbox "Map description" [disabled] [ref=e26]: "Retained-image fixture: private sea cave"
    - generic [ref=e27]:
      - text: Appearance instructions
      - textbox "Appearance instructions" [disabled] [ref=e28]
    - generic [ref=e29]:
      - button "Create map" [disabled] [ref=e30]
      - button "Try another version" [disabled] [ref=e31]
      - generic [ref=e32]:
        - text: Upload finished artwork
        - button "Upload finished artwork" [disabled] [ref=e33]
    - paragraph [ref=e34]: "Finished artwork: PNG, JPEG or WebP, up to 20 MiB and 16 million pixels. Fits proportionally; letterboxing may remain."
  - status [ref=e35]: Working…
  - region "Creation jobs" [ref=e36]:
    - heading "Creation jobs" [level=2] [ref=e37]
    - paragraph [ref=e38]: Cancellation prevents attachment of late artwork; provider billing may still apply. Refresh progress to reconcile uncertain work.
    - article [ref=e39]:
      - paragraph [ref=e40]: Deterministic provider fixture — no live call · awaiting-client-output
      - button "Refresh progress" [disabled] [ref=e41]
      - button "Cancel creation" [ref=e42] [cursor=pointer]
      - button "Save completed artwork" [disabled] [ref=e43]
  - region "Map artwork versions" [ref=e44]:
    - heading "Saved versions" [level=2] [ref=e45]
    - button "Refresh saved versions" [disabled] [ref=e46]
    - generic [ref=e47]:
      - text: Map family
      - combobox "Map family" [disabled] [ref=e48]:
        - option "New map"
        - option "Creation in progress" [selected]
    - paragraph [ref=e49]: No saved artwork yet. Create a map or upload finished artwork.
```

# Test source

```ts
  1  | import { test } from './browser-fixtures';
  2  | import { expect } from '@playwright/test';
  3  | import { pdfFixture, png } from './handout-fixtures';
  4  | 
  5  | test('genuine Character edits and Handout PDF sharing continue during outstanding retained-artwork generation', async ({ page, context }, info) => {
  6  |   const index = info.project.name === 'phone' ? 1 : 0;
  7  |   const url = process.env.MAP_LIVE_URL!, key = process.env.MAP_LIVE_KEY!;
  8  |   const jwt = JSON.parse(process.env.MAP_CROSS_DM_JWTS!)[index];
  9  |   const playerJwt = JSON.parse(process.env.MAP_CROSS_PLAYER_JWTS!)[index];
  10 |   await page.goto('tests/harness/map-workshop.html');
  11 |   await page.waitForFunction(() => typeof (window as any).configure === 'function');
  12 |   await page.evaluate(c => (window as any).configure(c), { url, key, jwt, server: process.env.MAP_FIXTURE_SERVER! });
  13 |   await page.evaluate(async ({ url, key, jwt, playerJwt }) => {
  14 |     const sdk = await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
  15 |     const auth = sdk.createClient(url, key); await auth.auth.setSession({ access_token: jwt, refresh_token: 'fixture-refresh' });
  16 |     const factory = (await import('/the-drowned-compass/src/data/supabase-party-data.ts')).createSupabasePartyData;
  17 |     const a = factory(url, key), b = factory(url, key);
  18 |     const initial = await a.getParty();
  19 |     const player = (await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(sdk.createClient(url, key, { accessToken: async () => playerJwt, auth: { persistSession: false } }));
  20 |     Object.assign(window, { cross: { a, b, initial, player, url, key, jwt, playerJwt } });
  21 |   }, { url, key, jwt, playerJwt });
  22 |   // Only delivery is held: real Edge receipt/SQL/storage continue. No fake job success.
  23 |   let release!: () => void, received!: () => void;
  24 |   const hold = new Promise<void>(r => release = r), receipt = new Promise<void>(r => received = r);
  25 |   await page.route(process.env.MAP_FIXTURE_SERVER! + '/**', async route => {
  26 |     const body = route.request().headers()['content-type']?.includes('application/json') ? route.request().postDataJSON() : null;
  27 |     if (body?.kind !== 'submit') return route.continue();
  28 |     const response = await route.fetch(); received(); await hold; await route.fulfill({ response });
  29 |   });
  30 |   await page.getByLabel('Map description').fill('Retained-image fixture: private sea cave');
  31 |   await page.getByRole('button', { name: 'Create map', exact: true }).click();
  32 |   await receipt;
  33 |   await expect(page.getByRole('button', { name: 'Create map', exact: true })).toBeDisabled();
  34 |   const edits = await page.evaluate(async () => {
  35 |     const { a, b, initial } = (window as any).cross, slot = initial.slots[0], c = slot.character;
  36 |     const first = await a.updateCharacterOverviewField(slot.id, 'armorClass', 17, c.fieldVersions.armorClass ?? 0);
  37 |     const independent = await b.updateCharacterOverviewField(slot.id, 'speed', 40, c.fieldVersions.speed ?? 0);
  38 |     const stale = await b.updateCharacterOverviewField(slot.id, 'armorClass', 19, c.fieldVersions.armorClass ?? 0);
  39 |     const final = await b.getParty();
  40 |     return { first: first.ok, independent: independent.ok, stale: stale.ok, character: final.slots[0].character, unrelated: JSON.stringify(initial.slots.slice(1)) === JSON.stringify(final.slots.slice(1)) };
  41 |   });
  42 |   expect(edits).toMatchObject({ first: true, independent: true, stale: false, unrelated: true, character: { armorClass: 17, speed: 40 } });
  43 |   const popup = page.waitForEvent('popup');
  44 |   await page.evaluate(async bytes => {
  45 |     const c = (window as any).cross;
  46 |     c.handout = await c.a.content.upload({ requestId: crypto.randomUUID(), title: 'Ticket12 genuine private PDF', file: new File([new Uint8Array(bytes)], 'letter.pdf', { type: 'application/pdf' }) });
  47 |     c.display = (await import('/the-drowned-compass/src/features/presentation/party-display.ts')).createPartyDisplay(c.a.content, () => c.a.getSession());
  48 |     c.display.openWindow(); await c.display.present(c.handout);
  49 |   }, [...pdfFixture()]);
  50 |   const display = await popup;
  51 |   await expect(display.getByLabel('Party Display page 1')).toBeVisible();
  52 |   const sharing = await page.evaluate(async () => {
  53 |     const c = (window as any).cross, listed = await c.player.list(), item = listed.find((x: any) => x.id === c.handout.id), bytes = await c.player.open(c.handout.id);
  54 |     await c.display.page(2);
  55 |     return { revealed: item.visibility, type: bytes.type, size: bytes.size };
  56 |   });
  57 |   expect(sharing).toMatchObject({ revealed: 'revealed', type: 'application/pdf' }); expect(sharing.size).toBe(pdfFixture().length);
  58 |   await expect(display.getByLabel('Party Display page 2')).toBeVisible();
  59 |   const replacement = await page.evaluate(async bytes => {
  60 |     const c = (window as any).cross, current = (await c.a.content.list()).find((x: any) => x.id === c.handout.id);
  61 |     const result = await c.a.content.change({ id: current.id, expectedVersion: current.version, requestId: crypto.randomUUID(), command: { kind: 'replace', file: new File([new Uint8Array(bytes)], 'letter.png', { type: 'image/png' }) } });
  62 |     const player = await c.player.open(current.id); return { ok: result.ok, type: player.type, size: player.size };
  63 |   }, [...png]);
  64 |   expect(replacement).toEqual({ ok: true, type: 'image/png', size: png.length });
  65 |   // Existing Handout canvas aria-label can retain page2 after PNG replacement.
  66 |   // Assert accepted state and actual rendered replacement bytes, not that label.
  67 |   await expect.poll(() => page.evaluate(() => {const s=(window as any).cross.display.getState();return {page:s.page,pages:s.pages};})).toEqual({page:1,pages:1});
  68 |   const expectedPixel = await page.evaluate(async bytes => {const image=await createImageBitmap(new Blob([new Uint8Array(bytes)],{type:'image/png'}));const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);image.close();return [...ctx.getImageData(c.width/2,c.height/2,1,1).data];},[...png]);
  69 |   await expect(display.locator('canvas')).toBeVisible();
  70 |   await expect.poll(() => display.locator('canvas').evaluate((c:HTMLCanvasElement) => [...c.getContext('2d')!.getImageData(c.width/2,c.height/2,1,1).data])).toEqual(expectedPixel);
  71 |   release(); await page.unroute(process.env.MAP_FIXTURE_SERVER! + '/**');
  72 |   await expect(page.getByRole('button', { name: 'Save completed artwork' })).toBeVisible({ timeout: 30000 });
> 73 |   await page.getByRole('button', { name: 'Save completed artwork' }).click();
     |                                                                      ^ Error: locator.click: Test ended.
  74 |   await expect(page.getByRole('status').first()).toContainText('Saved privately', { timeout: 30000 });
  75 |   const final = await page.evaluate(async () => {
  76 |     const c = (window as any).cross, w = await (window as any).content.readMapWorkspace();
  77 |     let mapDenied = false; try { await c.player.openMapVersion(w.versions[0].id); } catch { mapDenied = true; }
  78 |     const sdk = await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
  79 |     const dm = sdk.createClient(c.url,c.key,{accessToken:async()=>c.jwt,auth:{persistSession:false}});
  80 |     const row = (await dm.from('party_map_artwork_versions').select('party_id,background').eq('id',w.versions[0].id).single()).data;
  81 |     const path=c.url+'/storage/v1/object/authenticated/party-handouts/'+row.party_id+'/'+row.background.object_id;
  82 |     const dmRead=await fetch(path,{headers:{apikey:c.key,Authorization:'Bearer '+c.jwt}});
  83 |     const playerRead=await fetch(path,{headers:{apikey:c.key,Authorization:'Bearer '+c.playerJwt}});
  84 |     const anonRead=await fetch(path,{headers:{apikey:c.key,Authorization:'Bearer '+c.key}});
  85 |     let oldCommands=0;for(const kind of ['reveal','withdraw']){const r=await dm.rpc('change_party_grid_map',{p_id:w.versions[0].familyId,p_expected_version:w.families[0].version,p_request_id:crypto.randomUUID(),p_kind:kind,p_copy_id:null,p_title:null,p_client_signature:kind});if(r.error)oldCommands++;}
  86 |     const current = (await c.a.content.list()).find((x: any) => x.id === c.handout.id);
  87 |     const withdrawn = await c.a.content.change({ id: current.id, expectedVersion: current.version, requestId: crypto.randomUUID(), command: { kind: 'withdraw' } });
  88 |     let denied = false; try { await c.player.open(current.id); } catch { denied = true; }
  89 |     return { versions: w.versions.length, mapDenied, knownPath:{dm:dmRead.ok,player:playerRead.ok,anonymous:anonRead.ok},oldCommands, withdrawn: withdrawn.ok, denied, character: (await c.b.getParty()).slots[0].character };
  90 |   });
  91 |   expect(final).toMatchObject({ versions: 1, mapDenied: true,knownPath:{dm:true,player:false,anonymous:false},oldCommands:2, withdrawn: true, denied: true, character: { armorClass: 17, speed: 40 } });
  92 |   await expect(display.locator('canvas')).toHaveCount(0);
  93 |   await display.close();
  94 |   await page.screenshot({ path: info.outputPath('integrated-workshop.png'), fullPage: true });
  95 |   expect(context.pages()).toHaveLength(1);
  96 | });
  97 | 
```