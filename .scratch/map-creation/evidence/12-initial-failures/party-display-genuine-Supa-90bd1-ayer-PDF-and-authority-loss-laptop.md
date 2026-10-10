# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: party-display.spec.ts >> genuine Supabase display preserves interrupted frame, reconciles withdrawal, independent Player PDF and authority loss
- Location: e2e/party-display.spec.ts:95:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Display page 1 of 1')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Display page 1 of 1') with timeout 5000ms
  - waiting for getByText('Display page 1 of 1')

```

```yaml
- banner:
  - link "The Drowned Compass home":
    - /url: ./
    - text: The Drowned Compass
  - text: Dungeon Master
  - button "Grid Map editor"
  - button "Map creation workshop"
  - button "Dungeon Master Library"
  - button "Sign out"
- main:
  - button "Back to Party"
  - heading "Dungeon Master Library" [level=1]
  - paragraph: Uploads are private until you reveal them.
  - region "Party Display controls":
    - heading "Party Display" [level=2]
    - button "Focus Party Display"
    - status: Presenting on Party Display.
    - paragraph: "Ordinary viewing: zoom and Fit to screen may resize content."
    - paragraph: Move Party Display to your table projector first. Measure the test square on the table against your miniature base or ruler; display pixels are not physical inches. Recalibrate after moving the window, changing display scaling, projector distance or angle. Angled projection is not corrected automatically.
    - button "Calibrate physical projection"
    - button "Present on Party Display"
    - button "Display previous page" [disabled]
    - text: Display page 1 of 2
    - button "Display next page"
    - text: Display zoom
    - slider "Display zoom": "1"
    - button "Pan left"
    - button "Pan right"
    - button "Pan up"
    - button "Pan down"
    - button "Fit to screen"
    - button "Clear display"
  - region "Open Handout":
    - button "Back to Library"
    - heading "map-integration-12-50064640 display laptop" [level=2]
    - paragraph: Revealed
    - text: Handout title
    - textbox "Handout title": map-integration-12-50064640 display laptop
    - button "Save title" [disabled]
    - button "Withdraw from Party" [disabled]
    - text: Replacement file
    - button "Replacement file" [disabled]
    - button "Replace for everyone" [disabled]
    - link "Download Handout":
      - /url: blob:http://127.0.0.1:4182/13dd2109-4553-486e-88e0-d0e2ce684f22
    - button "Previous page" [disabled]
    - text: Page 1 of 2
    - button "Next page"
- region "Party Data Backup":
  - heading "Party Data Backup" [level=2]
  - paragraph: Download saved Character Records, Character Spells, Session Trackers and Party Companion settings as portable JSON. Character backstories and notes are included. Unsaved editor drafts are excluded.
  - paragraph: This is not a backup of campaign story, world, sessions or Dungeon Master preparation. Uploaded Handout files and Grid Maps are excluded; retain your original files. This app does not import or restore backup files.
  - button "Download Party Data Backup"
  - status
- group: About / Legal
- contentinfo: One party Six shared character records
```

# Test source

```ts
  18  |   await display.close();await expect(page.getByRole('status').filter({hasText:'Party Display closed'})).toBeVisible();display=await open(page);await expect(display.locator('canvas')).toBeVisible();
  19  |   await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);
  20  | });
  21  | test('DM deterministic PDF page, viewport, Fit, Clear and withdraw',async({page},info)=>{
  22  |   await enter(page);await upload(page,true);const display=await open(page);await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.getByLabel('Party Display page 1')).toBeVisible();await expect(page.getByText('Display page 1 of 2')).toBeVisible();
  23  |   await page.getByRole('button',{name:'Display next page',exact:true}).click();await expect(display.getByLabel('Party Display page 2')).toBeVisible();
  24  |   await expect.poll(()=>display.locator('canvas').evaluate(element=>{const c=element as HTMLCanvasElement;const pixel=c.getContext('2d')!.getImageData(c.width*.08,c.height*.8,1,1).data;return [...pixel].slice(0,3);})).toEqual([255,0,0]);
  25  |   await page.getByLabel('Display zoom').fill('2');await page.getByRole('button',{name:'Pan right',exact:true}).click();await expect(display.locator('canvas')).toHaveCSS('transform','matrix(2, 0, 0, 2, 50, 0)');await page.getByRole('button',{name:'Fit to screen',exact:true}).click();await expect(display.locator('canvas')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  26  |   await page.getByRole('button',{name:'Display previous page',exact:true}).click();await expect(display.getByLabel('Party Display page 1')).toBeVisible();
  27  |   await page.screenshot({path:info.outputPath(`handout-controls.png`),fullPage:true});await display.screenshot({path:info.outputPath(`handout-display.png`)});
  28  |   await page.getByRole('button',{name:'Clear display',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);
  29  |   await page.getByRole('button',{name:'Present on Party Display',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'Withdraw from Party',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);
  30  | });
  31  | test('replacement refreshes active bytes, interruption retains frame, reconnect withdraw and opaque session loss clear',async({page,context})=>{
  32  |   await enter(page);await upload(page);const display=await open(page);await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();
  33  |   await page.getByLabel('Replacement file').setInputFiles({name:'letter.pdf',mimeType:'application/pdf',buffer:pdfFixture()});await page.getByRole('button',{name:'Replace for everyone',exact:true}).click();await expect(page.getByText('Display page 1 of 2')).toBeVisible();
  34  |   await context.setOffline(true);await expect(display.locator('canvas')).toBeVisible();
  35  |   // Persistent authority changes happen in another actual local content capability.
  36  |   await page.evaluate(async()=>{const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');const [item]=await data.content.list();await data.content.change({id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command:{kind:'withdraw'}});});
  37  |   await context.setOffline(false);await expect(display.locator('canvas')).toHaveCount(0);
  38  |   await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();
  39  |   await context.setOffline(true);await page.evaluate(async()=>{const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signOut();});await expect(display.locator('canvas')).toHaveCount(0);
  40  | });
  41  | 
  42  | test('presentation interface retains ambiguous reveal identity, rejects failed private reveal and cancels stale reads',async({page})=>{
  43  |   await page.goto('./');
  44  |   await page.evaluate(async({image})=>{
  45  |     const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  46  |     const item=await data.content.upload({requestId:crypto.randomUUID(),title:'Never send private title',file:new File([new Uint8Array(image)],'image.png',{type:'image/png'})});
  47  |     const modulePath='/the-drowned-compass/src/features/presentation/party-display.ts';const {createPartyDisplay}=await import(modulePath);
  48  |     const commands:unknown[]=[];let attempts=0;const content={...data.content,open:(...args:Parameters<typeof data.content.open>)=>data.content.open(...args),change:async(input:unknown)=>{commands.push(input);attempts++;if(attempts===1)throw new Error('reveal transport failed');return data.content.change(input);}};
  49  |     const controller=createPartyDisplay(content,()=>data.getSession());
  50  |     Object.assign(window,{ticketDisplay:controller,ticketItem:item,ticketData:data,ticketCommands:commands});const button=document.createElement('button');button.textContent='Gesture display';button.onclick=()=>controller.openWindow();document.body.append(button);
  51  |   },{image:Array.from(png)});
  52  |   const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Gesture display'}).click();const display=await popup;
  53  |   await page.evaluate(async()=>{const w=window as any;await w.ticketDisplay.present(w.ticketItem);});await expect(display.locator('canvas')).toHaveCount(0);await expect(display.locator('body')).toHaveText('');
  54  |   // Advance metadata between attempts; failed reveal must never silently rebase.
  55  |   await page.evaluate(async()=>{const w=window as any;await w.ticketData.content.change({id:w.ticketItem.id,expectedVersion:w.ticketItem.version,requestId:crypto.randomUUID(),command:{kind:'rename',title:'Metadata advanced'}});await w.ticketDisplay.present({...w.ticketItem,version:2});});
  56  |   await expect(display.locator('canvas')).toHaveCount(0);
  57  |   const identity=await page.evaluate(()=>{const w=window as any;return {commands:w.ticketCommands,state:w.ticketDisplay.getState()};});expect(identity.commands[0]).toEqual(identity.commands[1]);expect(identity.state.message).toContain('changed elsewhere');
  58  |   await page.evaluate(async()=>{const w=window as any;const [current]=await w.ticketData.content.list();await w.ticketDisplay.present(current);});await expect(display.locator('canvas')).toBeVisible();
  59  |   // An in-flight protected read cannot repopulate a cleared display.
  60  |   await page.evaluate(async()=>{const w=window as any;const original=w.ticketData.content.open;w.ticketData.content.open=async(...args:any[])=>{w.ticketReadStarted=true;await new Promise(resolve=>{w.ticketRelease=resolve;});return original(...args);};const [current]=await w.ticketData.content.list();w.ticketPending=w.ticketDisplay.present(current);});
  61  |   await expect.poll(()=>page.evaluate(()=>(window as any).ticketReadStarted)).toBe(true);
  62  |   await page.evaluate(async()=>{const w=window as any;w.ticketDisplay.clear();w.ticketRelease();await w.ticketPending;});await expect(display.locator('canvas')).toHaveCount(0);
  63  |   await page.evaluate(()=>{(window as any).ticketDisplay.dispose();});
  64  | });
  65  | 
  66  | test('pending replacement survives Fit, page and popup resize while stale reads cannot overwrite selection',async({page})=>{
  67  |  await page.goto('./');await page.evaluate(async({image,pdf})=>{
  68  |   const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  69  |   const first=await data.content.upload({requestId:crypto.randomUUID(),title:'First',file:new File([new Uint8Array(pdf)],'letter.pdf',{type:'application/pdf'})});const reveal=await data.content.change({id:first.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'reveal'}});
  70  |   let delayed=false;const original=data.content.open;const content={...data.content,list:(...args:Parameters<typeof data.content.list>)=>data.content.list(...args),open:async(...args:Parameters<typeof original>)=>{if(delayed){Object.assign(window,{replacementReadStarted:true});await new Promise(resolve=>Object.assign(window,{releaseReplacement:resolve}));delayed=false;}return original(...args);}};
  71  |   const modulePath='/the-drowned-compass/src/features/presentation/party-display.ts';const display=(await import(modulePath)).createPartyDisplay(content,()=>data.getSession());Object.assign(window,{replacementDisplay:display,replacementData:data,replacementItem:reveal.item,startDelay:()=>{delayed=true;}});
  72  |   const button=document.createElement('button');button.textContent='Open regression display';button.onclick=()=>display.openWindow();document.body.append(button);
  73  |  },{image:Array.from(png),pdf:Array.from(pdfFixture())});
  74  |  const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Open regression display'}).click();const display=await created;
  75  |  await page.evaluate(async()=>{const w=window as any;await w.replacementDisplay.present(w.replacementItem);});await expect(display.locator('canvas')).toBeVisible();
  76  |  await page.evaluate(async({image})=>{const w=window as any;w.startDelay();const item=w.replacementItem;await w.replacementData.content.change({id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command:{kind:'replace',file:new File([new Uint8Array(image)],'map.png',{type:'image/png'})}});},{image:Array.from(png)});
  77  |  await expect.poll(()=>page.evaluate(()=>(window as any).replacementReadStarted)).toBe(true);
  78  |  await page.evaluate(()=>{const w=window as any;w.replacementDisplay.fit();w.replacementDisplay.page(2);});await display.evaluate(()=>window.dispatchEvent(new Event('resize')));
  79  |  await page.evaluate(()=>{(window as any).releaseReplacement();});await expect.poll(()=>page.evaluate(()=>(window as any).replacementDisplay.getState().pages)).toBe(1);
  80  |  await expect(display.locator('canvas')).toBeVisible();
  81  |  // A reopened popup must remain blank during the current visibility read, even if resized.
  82  |  await page.evaluate(async()=>{const w=window as any;const [item]=await w.replacementData.content.list();w.reopenItem=item;w.originalList=w.replacementData.content.list;w.listReleases=[];w.replacementData.content.list=async(...args:any[])=>{await new Promise(resolve=>w.listReleases.push(resolve));return w.originalList(...args);};});
  83  |  await display.close();const reopened=page.waitForEvent('popup');await page.getByRole('button',{name:'Open regression display'}).click();const newDisplay=await reopened;await newDisplay.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.evaluate(()=>(window as any).replacementDisplay.fit());await expect(newDisplay.locator('canvas')).toHaveCount(0);
  84  |  await page.evaluate(async()=>{const w=window as any;await w.replacementData.content.change({id:w.reopenItem.id,expectedVersion:w.reopenItem.version,requestId:crypto.randomUUID(),command:{kind:'withdraw'}});w.replacementData.content.list=w.originalList;w.listReleases.forEach((release:()=>void)=>release());});await expect.poll(()=>page.evaluate(()=>(window as any).replacementDisplay.getState().selected)).toBeUndefined();await expect(newDisplay.locator('canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).replacementDisplay.dispose());
  85  | });
  86  | 
  87  | async function mountLive(page:Page,role:'dm'|'player') {
  88  |  await page.goto('./');await page.evaluate(async({url,key,jwt})=>{
  89  |   const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const auth=sdk.createClient(url,key);const session=await auth.auth.setSession({access_token:jwt,refresh_token:'local-verification-refresh'});if(session.error)throw session.error;
  90  |   const data=(await import('/the-drowned-compass/src/data/supabase-party-data.ts')).createSupabasePartyData(url,key);const React=await import('/the-drowned-compass/node_modules/.vite/deps/react.js');const renderer=await import('/the-drowned-compass/node_modules/.vite/deps/react-dom_client.js');const App=(await import('/the-drowned-compass/src/App.tsx')).App;
  91  |   document.getElementById('root')!.remove();const root=document.createElement('div');document.body.append(root);(renderer.createRoot??renderer.default.createRoot)(root).render((React.createElement??React.default.createElement)(App,{partyData:data}));
  92  |  },{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!,jwt:role==='dm'?process.env.HANDOUT_LIVE_DM_JWT!:process.env.HANDOUT_LIVE_PLAYER_JWT!});
  93  |  await page.getByRole('button',{name:role==='dm'?'Dungeon Master Library':'Party Library',exact:true}).click();
  94  | }
  95  | test('genuine Supabase display preserves interrupted frame, reconciles withdrawal, independent Player PDF and authority loss',async({page,browser},info)=>{
  96  |  test.setTimeout(90_000);test.skip(!process.env.HANDOUT_LIVE_URL,'Requires disposable local Supabase verifier.');
  97  |  const playerContext=await browser.newContext({viewport:info.project.name.includes('phone')?{width:393,height:851}:{width:1280,height:720}});const player=await playerContext.newPage();
  98  |  try {
  99  |   await mountLive(page,'dm');await mountLive(player,'player');const title=`${process.env.HANDOUT_FIXTURE_PREFIX??'Lifecycle'} display ${info.project.name}`;
  100 |   await page.getByLabel('Title',{exact:true}).fill(title);await page.getByLabel('File',{exact:true}).setInputFiles({name:'letter.pdf',mimeType:'application/pdf',buffer:pdfFixture()});await page.getByRole('button',{name:'Save private Handout'}).click();await page.getByRole('button',{name:new RegExp(`${title} Private`)}).click();let display=await open(page);
  101 |   // Backend denies reveal: private item never reaches the display or Player Library.
  102 |   await page.route('**/rest/v1/rpc/change_party_handout',route=>route.fulfill({status:403,json:{code:'42501',message:'Denied'}}));await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'failed'})).toBeVisible();await expect(display.locator('canvas')).toHaveCount(0);await expect(player.getByRole('button',{name:new RegExp(`${title} Revealed`)})).toHaveCount(0);await page.unroute('**/rest/v1/rpc/change_party_handout');
  103 |   await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();await player.getByRole('button',{name:new RegExp(`${title} Revealed`)}).click();await expect(player.getByText('Page 1 of 2',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Display next page',exact:true}).click();await expect(display.getByLabel('Party Display page 2')).toBeVisible();await expect(player.getByText('Page 1 of 2',{exact:true})).toBeVisible();
  104 |   await player.getByRole('button',{name:'Next page',exact:true}).click();await page.getByRole('button',{name:'Display previous page',exact:true}).click();await expect(player.getByText('Page 2 of 2',{exact:true})).toBeVisible();
  105 |   // Actual adapters see 503 and429 failures. Neither is confirmed session loss.
  106 |   for(const status of [503,429]) {
  107 |    await page.route('**/rest/v1/**',route=>route.fulfill({status,json:{code:'VERIFY_TRANSIENT',message:'Unavailable'}}));
  108 |    await expect(page.getByRole('status').filter({hasText:'Connection interrupted'})).toBeVisible({timeout:15_000});await page.waitForTimeout(1200);await expect(display.locator('canvas')).toBeVisible();
  109 |    if(status===503){await display.close();await expect(page.getByRole('button',{name:'Open Party Display',exact:true})).toBeVisible();display=await open(page);await display.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.getByRole('button',{name:'Fit to screen',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);}
  110 |    await page.unroute('**/rest/v1/**');await expect(display.locator('canvas')).toBeVisible({timeout:15_000});
  111 |   }
  112 |   // Partition only DM requests; the live server still accepts withdrawal elsewhere.
  113 |   await page.context().setOffline(true);await expect(display.locator('canvas')).toBeVisible();
  114 |   await player.evaluate(async({url,key,jwt,title})=>{const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>jwt});const result=await client.from('party_handouts').select('id,version').eq('title',title).single();if(result.error)throw result.error;const changed=await client.rpc('change_party_handout',{p_id:result.data.id,p_expected_version:result.data.version,p_request_id:crypto.randomUUID(),p_kind:'withdraw'});if(changed.error)throw changed.error;},{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!,jwt:process.env.HANDOUT_LIVE_DM_JWT!,title});
  115 |   await expect(display.locator('canvas')).toBeVisible();await page.context().setOffline(false);await expect(display.locator('canvas')).toHaveCount(0);await expect(player.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
  116 |   await page.getByRole('button',{name:new RegExp(`${title} Private`)}).click();
  117 |   await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible({timeout:15_000});await player.getByRole('button',{name:new RegExp(`${title} Revealed`)}).click();await expect(player.getByText('Page 1 of 2',{exact:true})).toBeVisible();
> 118 |   await page.getByLabel('Replacement file').setInputFiles({name:'map.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Replace for everyone',exact:true}).click();await expect(page.getByText('Display page 1 of 1')).toBeVisible();await expect(player.getByRole('img',{name:'Handout content',exact:true})).toBeVisible();
      |                                                                                                                                                                                                                                                 ^ Error: expect(locator).toBeVisible() failed
  119 |   await page.screenshot({path:info.outputPath('live-handout.png'),fullPage:true});
  120 |   // Confirmed expired/invalid auth response clears, even with a previously rendered frame.
  121 |   await page.route('**/rest/v1/party_members?**',route=>route.fulfill({status:401,json:{code:'PGRST301',message:'Invalid JWT'}}));await expect(display.locator('canvas')).toHaveCount(0);
  122 |   await page.unroute('**/rest/v1/party_members?**');await page.getByRole('button',{name:'Present on Party Display',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();
  123 |   await page.evaluate(async({url,key})=>{const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key);await client.auth.signOut({scope:'local'});},{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!});await expect(display.locator('canvas')).toHaveCount(0);
  124 |  } finally {await playerContext.close();}
  125 | });
  126 | 
```