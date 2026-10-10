# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: map-display-live.spec.ts >> genuine authority: opaque output, touch controls, persistence/conflict/failure, reopen, PDF switching and revocation
- Location: e2e/map-display-live.spec.ts:26:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "accepted"
Received: "pending"

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Party Display controls" [ref=e3]:
    - heading "Party Display" [level=2] [ref=e4]
    - button "Focus Party Display" [ref=e5]
    - status [ref=e6]: Presenting accepted uncovered Grid Map.
    - paragraph [ref=e7]: "Ordinary viewing: zoom and Fit to screen may resize content."
    - paragraph [ref=e8]: Move Party Display to your table projector first. Measure the test square on the table against your miniature base or ruler; display pixels are not physical inches. Recalibrate after moving the window, changing display scaling, projector distance or angle. Angled projection is not corrected automatically.
    - button "Calibrate physical projection" [ref=e9]
    - generic [ref=e10]:
      - text: Display zoom
      - slider "Display zoom" [ref=e11]: "1"
    - generic [ref=e12]:
      - button "Pan left" [ref=e13]
      - button "Pan right" [ref=e14]
      - button "Pan up" [ref=e15]
      - button "Pan down" [ref=e16]
      - button "Fit to screen" [ref=e17]
    - region "DM Reveal Mask controls" [ref=e18]:
      - heading "Uncover the Party Display" [level=3] [ref=e19]
      - paragraph [ref=e20]: Private control preview. Only saved uncovered areas appear on the table.
      - generic [ref=e21]:
        - text: Reveal brush
        - combobox "Reveal brush" [ref=e22]:
          - option "1 squares" [selected]
          - option "2 squares"
          - option "4 squares"
      - button "Uncover areas" [pressed] [ref=e23]
      - button "Hide areas" [ref=e24]
      - generic [ref=e25]:
        - checkbox "DM hidden-region overlay" [checked] [ref=e26]
        - text: DM hidden-region overlay
      - img "Private reveal brush canvas" [ref=e27]:
        - generic "Map Background artwork" [ref=e29]
      - button "Undo uncover / hide" [ref=e32]
      - button "Redo uncover / hide" [disabled] [ref=e33]
      - button "Hide whole map" [ref=e34]
      - button "Uncover whole map" [ref=e35]
    - button "Clear display" [ref=e36]
  - button "Use saved live map" [ref=e37]
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';
  2  | import {png,pdfFixture} from './handout-fixtures';
  3  | import {sql} from '../scripts/local-verification.mjs';
  4  | async function mount(page:Page,index:number,create=true){
  5  |  await page.goto('./');
  6  |  await page.evaluate(async({url,key,jwt,image,create})=>{
  7  |   const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
  8  |   const client=sdk.createClient(url,key,{accessToken:async()=>jwt});
  9  |   const content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);
  10 |   const session=async()=>{const r=await client.from('party_members').select('role');if(r.error)throw r.error;return r.data.some((x:any)=>x.role==='dungeon-master')?{role:'dungeon-master',userId:'owned-fixture'}:null;};
  11 |   const {createPartyDisplay}=await import('/the-drowned-compass/src/features/presentation/party-display.ts');
  12 |   const display=createPartyDisplay(content,session);
  13 |   const mapDocument={columns:4,rows:4,feetPerSquare:5,terrain:[{x:0,y:0,kind:'water'}],edges:[]};
  14 |   const versionId=crypto.randomUUID();const current=await content.readMapWorkspace();const result=create?await content.attachMapVersion({familyId:crypto.randomUUID(),expectedVersion:0,requestId:versionId,title:'Ticket10 private map secret',document:mapDocument,artwork:new File([new Uint8Array(image)],'source.png',{type:'image/png'}),instructions:'Never send secret prompt'}):{ok:true,version:current.presentation.version};
  15 |   if(!result.ok)throw Error('Owned fixture conflict');
  16 |   const React=await import('/the-drowned-compass/node_modules/.vite/deps/react.js');const renderer=await import('/the-drowned-compass/node_modules/.vite/deps/react-dom_client.js');
  17 |   const {DisplayControls}=await import('/the-drowned-compass/src/features/presentation/DisplayControls.tsx');
  18 |   window.document.body.innerHTML='';
  19 |   const root=window.document.createElement('div');window.document.body.append(root);
  20 |   (renderer.createRoot??renderer.default.createRoot)(root).render((React.createElement??React.default.createElement)(DisplayControls,{display}));
  21 |   const button=window.document.createElement('button');button.textContent='Use saved live map';button.onclick=()=>display.presentMap(result.version);window.document.body.append(button);
  22 |   Object.assign(window,{liveMap:{content,client,display,version:result.version,originalCommit:content.commitMapRevealMask}});
  23 |  },{url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,jwt:JSON.parse(process.env.MAP_DISPLAY_DM_JWTS!)[index],image:[...png],create});
  24 | }
  25 | async function pixel(popup:Page,x:number,y:number){return popup.locator('canvas').evaluate((c:HTMLCanvasElement,{x,y})=>[...c.getContext('2d')!.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data],{x,y});}
  26 | test('genuine authority: opaque output, touch controls, persistence/conflict/failure, reopen, PDF switching and revocation',async({page,isMobile},info)=>{
  27 |  test.skip(!process.env.MAP_LIVE_URL,'Requires owned local Supabase fixture');
  28 |  page.on('response',async r=>{if(r.status()>=400){let code='';try{code=(await r.json()).code??'';}catch{}console.log(JSON.stringify({event:'http-error',path:new URL(r.url()).pathname,status:r.status(),code}));}});
  29 |  const index=info.project.name==='phone'?1:0;await mount(page,index);
  30 |  const opening=page.waitForEvent('popup');await page.getByRole('button',{name:'Use saved live map'}).click();let popup=await opening;
  31 |  await expect(popup.locator('canvas')).toBeVisible();expect(await pixel(popup,.1,.1)).toEqual([0,0,0,255]);
  32 |  expect(await popup.locator('body').innerHTML()).not.toMatch(/href|<image|<img|prompt|secret|button|input|data:image/i);
  33 |  const svg=page.getByLabel('Private reveal brush canvas');await svg.scrollIntoViewIfNeeded();
  34 |  const point=await svg.evaluate((svg:SVGSVGElement)=>{const p=new DOMPoint(.5,.5).matrixTransform(svg.getScreenCTM()!);return{x:p.x,y:p.y};});
  35 |  if(isMobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
> 36 |  await expect.poll(()=>page.evaluate(()=>(window as any).liveMap.display.getState().reveal.status)).toBe('accepted');
     |                                                                                                     ^ Error: expect(received).toBe(expected) // Object.is equality
  37 |  await expect.poll(()=>pixel(popup,.1,.1)).not.toEqual([0,0,0,255]);expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
  38 |  const before=await page.evaluate(()=>(window as any).liveMap.content.readMapWorkspace());expect(before.presentation.mask.uncovered).toEqual([0]);
  39 |  // External competing controller accepted a stroke; dirty local work must retain
  40 |  // cells, report conflict, and retry against the new accepted revision.
  41 |  await page.evaluate(async()=>{const w=(window as any).liveMap;w.display.reveal({type:'begin',mode:'uncover',brush:1});w.display.reveal({type:'sample',point:{x:1,y:0}});w.display.reveal({type:'finish'});const domain=await import('/the-drowned-compass/src/domain/map-reveal-mask.ts');const draft=domain.createMapRevealMaskDraft((await w.content.readMapWorkspace()).presentation);draft.command({type:'begin',mode:'uncover',brush:1});draft.command({type:'sample',point:{x:3,y:3}});draft.command({type:'finish'});await w.content.commitMapRevealMask(draft.prepareCommit(crypto.randomUUID()));});
  42 |  await expect.poll(()=>page.evaluate(()=>(window as any).liveMap.display.getState().reveal.status)).toBe('conflict');
  43 |  await page.getByRole('button',{name:'Retry reveal save'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).liveMap.display.getState().reveal.status)).toBe('accepted');
  44 |  const accepted=await page.evaluate(()=>(window as any).liveMap.content.readMapWorkspace());expect(accepted.presentation.mask.uncovered).toContain(1);
  45 |  // A real owned transport failure preserves displayed accepted pixels and draft.
  46 |  await page.route('**/rest/v1/rpc/commit_map_reveal_mask',r=>r.fulfill({status:503,json:{code:'OWNED_FAILURE',message:'Unavailable'}}));
  47 |  await page.evaluate(async()=>{const w=(window as any).liveMap;w.display.reveal({type:'hide-all'});await w.display.saveReveal();});
  48 |  await expect(page.getByRole('button',{name:'Retry reveal save'})).toBeVisible();expect(await pixel(popup,.1,.1)).not.toEqual([0,0,0,255]);
  49 |  await page.unroute('**/rest/v1/rpc/commit_map_reveal_mask');await page.getByRole('button',{name:'Discard reveal draft'}).click();
  50 |  await popup.close();await expect(page.getByRole('button',{name:'Open Party Display',exact:true})).toBeVisible();
  51 |  const reopen=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Party Display',exact:true}).click();popup=await reopen;await expect(popup.locator('canvas')).toBeVisible();expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
  52 |  // A browser reload creates a fresh controller: Open restores the saved
  53 |  // accepted version/mask after authority without another Use selection.
  54 |  await popup.close();await page.reload();await mount(page,index,false);
  55 |  const fresh=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Party Display',exact:true}).click();popup=await fresh;
  56 |  await expect(popup.getByLabel('Uncovered Grid Map on Party Display')).toBeVisible();expect(await pixel(popup,.1,.1)).not.toEqual([0,0,0,255]);expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
  57 |  // Actual private-version requests deny Players, expired DM credentials, and anonymous clients.
  58 |  const denials=await page.evaluate(async({url,key,playerJwt,expiredJwt})=>{
  59 |   const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
  60 |   const contentFactory=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent;
  61 |   const results=[];
  62 |   for(const [label,jwt] of [['player',playerJwt],['expired DM',expiredJwt],['anonymous',null]]){
  63 |    const content=contentFactory(sdk.createClient(url,key,{accessToken:async()=>jwt}));
  64 |    try{await content.openMapVersion((window as any).liveMap.version.id);results.push({label,denied:false});}catch{results.push({label,denied:true});}
  65 |   }
  66 |   return results;
  67 |  },{url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,playerJwt:JSON.parse(process.env.MAP_DISPLAY_PLAYER_JWTS!)[index],expiredJwt:JSON.parse(process.env.MAP_DISPLAY_EXPIRED_DM_JWTS!)[index]});
  68 |  expect(denials).toEqual([{label:'player',denied:true},{label:'expired DM',denied:true},{label:'anonymous',denied:true}]);
  69 |  await page.evaluate(async({pdf})=>{const w=(window as any).liveMap;const item=await w.content.upload({requestId:crypto.randomUUID(),title:'Ticket10 PDF',file:new File([new Uint8Array(pdf)],'letter.pdf',{type:'application/pdf'})});await w.display.present(item);},{pdf:[...pdfFixture()]});
  70 |  await expect(popup.getByLabel('Party Display page 1')).toBeVisible();await page.getByRole('button',{name:'Display next page',exact:true}).click();await expect(popup.getByLabel('Party Display page 2')).toBeVisible();
  71 |  const revision=accepted.presentation.revision;await page.getByRole('button',{name:'Use saved live map'}).click();await expect(popup.getByLabel('Uncovered Grid Map on Party Display')).toBeVisible();expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
  72 |  expect((await page.evaluate(()=>(window as any).liveMap.content.readMapWorkspace())).presentation.revision).toBeGreaterThan(revision);
  73 |  await page.screenshot({path:info.outputPath('live-dm-controls.png'),fullPage:true});await popup.screenshot({path:info.outputPath('live-visible-display.png')});
  74 |  // Actual owned membership revocation is observed by the genuine authority read.
  75 |  const owned=JSON.parse(process.env.MAP_DISPLAY_OWNED!)[index];
  76 |  for(const id of [owned.party,owned.dm])expect(id).toMatch(/^[0-9a-f-]{36}$/);
  77 |  sql(`delete from public.party_members where party_id='${owned.party}' and user_id='${owned.dm}';`);
  78 |  await expect(popup.locator('canvas')).toHaveCount(0);
  79 |  await page.evaluate(()=>(window as any).liveMap.display.dispose());
  80 | });
  81 | 
```