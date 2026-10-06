import { test, expect, type Page } from '@playwright/test';
import { png, pdfFixture } from './handout-fixtures';
async function enter(page:Page,role='Dungeon Master') {
  await page.goto('./');await page.getByRole('button',{name:new RegExp(`^${role} `)}).click();await page.getByLabel('Shared password').fill(role==='Dungeon Master'?'dm-password':'player-password');await page.getByRole('button',{name:'Enter the Party'}).click();
  await page.getByRole('button',{name:role==='Dungeon Master'?'Dungeon Master Library':'Party Library',exact:true}).click();
}
async function upload(page:Page,pdf=false) {
  await page.getByLabel('Title',{exact:true}).fill('Private captain plans');await page.getByLabel('File',{exact:true}).setInputFiles({name:pdf?'letter.pdf':'map.png',mimeType:pdf?'application/pdf':'image/png',buffer:pdf?pdfFixture():png});await page.getByRole('button',{name:'Save private Handout'}).click();await page.getByRole('button',{name:/Private captain plans Private/}).click();
}
async function open(page:Page) {const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Party Display',exact:true}).click();return created;}
test('extended display gesture, blocked popup, closed/reopen, navigation lifetime and safe sign-out',async({page})=>{
  await enter(page);await upload(page);
  await page.evaluate(()=>{(window as Window & {savedOpen?:typeof window.open}).savedOpen=window.open;window.open=()=>null;});
  await page.getByRole('button',{name:'Open Party Display',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Popup blocked'})).toBeVisible();
  await page.evaluate(()=>{window.open=(window as Window & {savedOpen:typeof window.open}).savedOpen;});
  let display=await open(page);await expect(display.locator('body')).toHaveText('');await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.getByLabel('Party Display page 1')).toBeVisible();await expect(display.locator('body')).toHaveText('');await expect(display.locator('button,input,a')).toHaveCount(0);
  await page.getByRole('button',{name:'Back to Party',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click();
  await display.close();await expect(page.getByRole('status').filter({hasText:'Party Display closed'})).toBeVisible();display=await open(page);await expect(display.locator('canvas')).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);
});
test('DM deterministic PDF page, viewport, Fit, Clear and withdraw',async({page},info)=>{
  await enter(page);await upload(page,true);const display=await open(page);await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.getByLabel('Party Display page 1')).toBeVisible();await expect(page.getByText('Display page 1 of 2')).toBeVisible();
  await page.getByRole('button',{name:'Display next page',exact:true}).click();await expect(display.getByLabel('Party Display page 2')).toBeVisible();
  await expect.poll(()=>display.locator('canvas').evaluate(element=>{const c=element as HTMLCanvasElement;const pixel=c.getContext('2d')!.getImageData(c.width*.08,c.height*.8,1,1).data;return [...pixel].slice(0,3);})).toEqual([255,0,0]);
  await page.getByLabel('Display zoom').fill('2');await page.getByRole('button',{name:'Pan right',exact:true}).click();await expect(display.locator('canvas')).toHaveCSS('transform','matrix(2, 0, 0, 2, 50, 0)');await page.getByRole('button',{name:'Fit to screen',exact:true}).click();await expect(display.locator('canvas')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button',{name:'Display previous page',exact:true}).click();await expect(display.getByLabel('Party Display page 1')).toBeVisible();
  await page.screenshot({path:`.scratch/party-presentation/verification/ticket04/${info.project.name}-controls.png`,fullPage:true});await display.screenshot({path:`.scratch/party-presentation/verification/ticket04/${info.project.name}-display.png`});
  await page.getByRole('button',{name:'Clear display',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);
  await page.getByRole('button',{name:'Present on Party Display',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'Withdraw from Party',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);
});
test('replacement refreshes active bytes, interruption retains frame, reconnect withdraw and opaque session loss clear',async({page,context})=>{
  await enter(page);await upload(page);const display=await open(page);await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();
  await page.getByLabel('Replacement file').setInputFiles({name:'letter.pdf',mimeType:'application/pdf',buffer:pdfFixture()});await page.getByRole('button',{name:'Replace for everyone',exact:true}).click();await expect(page.getByText('Display page 1 of 2')).toBeVisible();
  await context.setOffline(true);await expect(display.locator('canvas')).toBeVisible();
  // Persistent authority changes happen in another actual local content capability.
  await page.evaluate(async()=>{const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');const [item]=await data.content.list();await data.content.change({id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command:{kind:'withdraw'}});});
  await context.setOffline(false);await expect(display.locator('canvas')).toHaveCount(0);
  await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();
  await context.setOffline(true);await page.evaluate(async()=>{const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signOut();});await expect(display.locator('canvas')).toHaveCount(0);
});

test('presentation interface retains ambiguous reveal identity, rejects failed private reveal and cancels stale reads',async({page})=>{
  await page.goto('./');
  await page.evaluate(async({image})=>{
    const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
    const item=await data.content.upload({requestId:crypto.randomUUID(),title:'Never send private title',file:new File([new Uint8Array(image)],'image.png',{type:'image/png'})});
    const modulePath='/the-drowned-compass/src/features/presentation/party-display.ts';const {createPartyDisplay}=await import(modulePath);
    const commands:unknown[]=[];let attempts=0;const content={...data.content,open:(...args:Parameters<typeof data.content.open>)=>data.content.open(...args),change:async(input:unknown)=>{commands.push(input);attempts++;if(attempts===1)throw new Error('reveal transport failed');return data.content.change(input);}};
    const controller=createPartyDisplay(content,()=>data.getSession());
    Object.assign(window,{ticketDisplay:controller,ticketItem:item,ticketData:data,ticketCommands:commands});const button=document.createElement('button');button.textContent='Gesture display';button.onclick=()=>controller.openWindow();document.body.append(button);
  },{image:Array.from(png)});
  const popup=page.waitForEvent('popup');await page.getByRole('button',{name:'Gesture display'}).click();const display=await popup;
  await page.evaluate(async()=>{const w=window as any;await w.ticketDisplay.present(w.ticketItem);});await expect(display.locator('canvas')).toHaveCount(0);await expect(display.locator('body')).toHaveText('');
  // Advance metadata between attempts; failed reveal must never silently rebase.
  await page.evaluate(async()=>{const w=window as any;await w.ticketData.content.change({id:w.ticketItem.id,expectedVersion:w.ticketItem.version,requestId:crypto.randomUUID(),command:{kind:'rename',title:'Metadata advanced'}});await w.ticketDisplay.present({...w.ticketItem,version:2});});
  await expect(display.locator('canvas')).toHaveCount(0);
  const identity=await page.evaluate(()=>{const w=window as any;return {commands:w.ticketCommands,state:w.ticketDisplay.getState()};});expect(identity.commands[0]).toEqual(identity.commands[1]);expect(identity.state.message).toContain('changed elsewhere');
  await page.evaluate(async()=>{const w=window as any;const [current]=await w.ticketData.content.list();await w.ticketDisplay.present(current);});await expect(display.locator('canvas')).toBeVisible();
  // An in-flight protected read cannot repopulate a cleared display.
  await page.evaluate(async()=>{const w=window as any;const original=w.ticketData.content.open;w.ticketData.content.open=async(...args:any[])=>{w.ticketReadStarted=true;await new Promise(resolve=>{w.ticketRelease=resolve;});return original(...args);};const [current]=await w.ticketData.content.list();w.ticketPending=w.ticketDisplay.present(current);});
  await expect.poll(()=>page.evaluate(()=>(window as any).ticketReadStarted)).toBe(true);
  await page.evaluate(async()=>{const w=window as any;w.ticketDisplay.clear();w.ticketRelease();await w.ticketPending;});await expect(display.locator('canvas')).toHaveCount(0);
  await page.evaluate(()=>{(window as any).ticketDisplay.dispose();});
});

test('pending replacement survives Fit, page and popup resize while stale reads cannot overwrite selection',async({page})=>{
 await page.goto('./');await page.evaluate(async({image,pdf})=>{
  const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  const first=await data.content.upload({requestId:crypto.randomUUID(),title:'First',file:new File([new Uint8Array(pdf)],'letter.pdf',{type:'application/pdf'})});const reveal=await data.content.change({id:first.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'reveal'}});
  let delayed=false;const original=data.content.open;const content={...data.content,list:(...args:Parameters<typeof data.content.list>)=>data.content.list(...args),open:async(...args:Parameters<typeof original>)=>{if(delayed){Object.assign(window,{replacementReadStarted:true});await new Promise(resolve=>Object.assign(window,{releaseReplacement:resolve}));delayed=false;}return original(...args);}};
  const modulePath='/the-drowned-compass/src/features/presentation/party-display.ts';const display=(await import(modulePath)).createPartyDisplay(content,()=>data.getSession());Object.assign(window,{replacementDisplay:display,replacementData:data,replacementItem:reveal.item,startDelay:()=>{delayed=true;}});
  const button=document.createElement('button');button.textContent='Open regression display';button.onclick=()=>display.openWindow();document.body.append(button);
 },{image:Array.from(png),pdf:Array.from(pdfFixture())});
 const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Open regression display'}).click();const display=await created;
 await page.evaluate(async()=>{const w=window as any;await w.replacementDisplay.present(w.replacementItem);});await expect(display.locator('canvas')).toBeVisible();
 await page.evaluate(async({image})=>{const w=window as any;w.startDelay();const item=w.replacementItem;await w.replacementData.content.change({id:item.id,expectedVersion:item.version,requestId:crypto.randomUUID(),command:{kind:'replace',file:new File([new Uint8Array(image)],'map.png',{type:'image/png'})}});},{image:Array.from(png)});
 await expect.poll(()=>page.evaluate(()=>(window as any).replacementReadStarted)).toBe(true);
 await page.evaluate(()=>{const w=window as any;w.replacementDisplay.fit();w.replacementDisplay.page(2);});await display.evaluate(()=>window.dispatchEvent(new Event('resize')));
 await page.evaluate(()=>{(window as any).releaseReplacement();});await expect.poll(()=>page.evaluate(()=>(window as any).replacementDisplay.getState().pages)).toBe(1);
 await expect(display.locator('canvas')).toBeVisible();
 // A reopened popup must remain blank during the current visibility read, even if resized.
 await page.evaluate(async()=>{const w=window as any;const [item]=await w.replacementData.content.list();w.reopenItem=item;w.originalList=w.replacementData.content.list;w.listReleases=[];w.replacementData.content.list=async(...args:any[])=>{await new Promise(resolve=>w.listReleases.push(resolve));return w.originalList(...args);};});
 await display.close();const reopened=page.waitForEvent('popup');await page.getByRole('button',{name:'Open regression display'}).click();const newDisplay=await reopened;await newDisplay.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.evaluate(()=>(window as any).replacementDisplay.fit());await expect(newDisplay.locator('canvas')).toHaveCount(0);
 await page.evaluate(async()=>{const w=window as any;await w.replacementData.content.change({id:w.reopenItem.id,expectedVersion:w.reopenItem.version,requestId:crypto.randomUUID(),command:{kind:'withdraw'}});w.replacementData.content.list=w.originalList;w.listReleases.forEach((release:()=>void)=>release());});await expect.poll(()=>page.evaluate(()=>(window as any).replacementDisplay.getState().selected)).toBeUndefined();await expect(newDisplay.locator('canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).replacementDisplay.dispose());
});

async function mountLive(page:Page,role:'dm'|'player') {
 await page.goto('./');await page.evaluate(async({url,key,jwt})=>{
  const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const auth=sdk.createClient(url,key);const session=await auth.auth.setSession({access_token:jwt,refresh_token:'local-verification-refresh'});if(session.error)throw session.error;
  const data=(await import('/the-drowned-compass/src/data/supabase-party-data.ts')).createSupabasePartyData(url,key);const React=await import('/the-drowned-compass/node_modules/.vite/deps/react.js');const renderer=await import('/the-drowned-compass/node_modules/.vite/deps/react-dom_client.js');const App=(await import('/the-drowned-compass/src/App.tsx')).App;
  document.getElementById('root')!.remove();const root=document.createElement('div');document.body.append(root);(renderer.createRoot??renderer.default.createRoot)(root).render((React.createElement??React.default.createElement)(App,{partyData:data}));
 },{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!,jwt:role==='dm'?process.env.HANDOUT_LIVE_DM_JWT!:process.env.HANDOUT_LIVE_PLAYER_JWT!});
 await page.getByRole('button',{name:role==='dm'?'Dungeon Master Library':'Party Library',exact:true}).click();
}
test('genuine Supabase display preserves interrupted frame, reconciles withdrawal, independent Player PDF and authority loss',async({page,browser},info)=>{
 test.setTimeout(90_000);test.skip(!process.env.HANDOUT_LIVE_URL,'Requires disposable local Supabase verifier.');
 const playerContext=await browser.newContext({viewport:info.project.name.includes('phone')?{width:393,height:851}:{width:1280,height:720}});const player=await playerContext.newPage();
 try {
  await mountLive(page,'dm');await mountLive(player,'player');const title=`Lifecycle display ${info.project.name}`;
  await page.getByLabel('Title',{exact:true}).fill(title);await page.getByLabel('File',{exact:true}).setInputFiles({name:'letter.pdf',mimeType:'application/pdf',buffer:pdfFixture()});await page.getByRole('button',{name:'Save private Handout'}).click();await page.getByRole('button',{name:new RegExp(`${title} Private`)}).click();let display=await open(page);
  // Backend denies reveal: private item never reaches the display or Player Library.
  await page.route('**/rest/v1/rpc/change_party_handout',route=>route.fulfill({status:403,json:{code:'42501',message:'Denied'}}));await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'failed'})).toBeVisible();await expect(display.locator('canvas')).toHaveCount(0);await expect(player.getByRole('button',{name:new RegExp(`${title} Revealed`)})).toHaveCount(0);await page.unroute('**/rest/v1/rpc/change_party_handout');
  await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();await player.getByRole('button',{name:new RegExp(`${title} Revealed`)}).click();await expect(player.getByText('Page 1 of 2',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Display next page',exact:true}).click();await expect(display.getByLabel('Party Display page 2')).toBeVisible();await expect(player.getByText('Page 1 of 2',{exact:true})).toBeVisible();
  await player.getByRole('button',{name:'Next page',exact:true}).click();await page.getByRole('button',{name:'Display previous page',exact:true}).click();await expect(player.getByText('Page 2 of 2',{exact:true})).toBeVisible();
  // Actual adapters see 503 and429 failures. Neither is confirmed session loss.
  for(const status of [503,429]) {
   await page.route('**/rest/v1/**',route=>route.fulfill({status,json:{code:'VERIFY_TRANSIENT',message:'Unavailable'}}));
   await expect(page.getByRole('status').filter({hasText:'Connection interrupted'})).toBeVisible({timeout:15_000});await page.waitForTimeout(1200);await expect(display.locator('canvas')).toBeVisible();
   if(status===503){await display.close();await expect(page.getByRole('button',{name:'Open Party Display',exact:true})).toBeVisible();display=await open(page);await display.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.getByRole('button',{name:'Fit to screen',exact:true}).click();await expect(display.locator('canvas')).toHaveCount(0);}
   await page.unroute('**/rest/v1/**');await expect(display.locator('canvas')).toBeVisible({timeout:15_000});
  }
  // Partition only DM requests; the live server still accepts withdrawal elsewhere.
  await page.context().setOffline(true);await expect(display.locator('canvas')).toBeVisible();
  await player.evaluate(async({url,key,jwt,title})=>{const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>jwt});const result=await client.from('party_handouts').select('id,version').eq('title',title).single();if(result.error)throw result.error;const changed=await client.rpc('change_party_handout',{p_id:result.data.id,p_expected_version:result.data.version,p_request_id:crypto.randomUUID(),p_kind:'withdraw'});if(changed.error)throw changed.error;},{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!,jwt:process.env.HANDOUT_LIVE_DM_JWT!,title});
  await expect(display.locator('canvas')).toBeVisible();await page.context().setOffline(false);await expect(display.locator('canvas')).toHaveCount(0);await expect(player.getByRole('heading',{name:title,exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:new RegExp(`${title} Private`)}).click();
  await page.getByRole('button',{name:'Reveal and present',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();await player.getByRole('button',{name:new RegExp(`${title} Revealed`)}).click();await expect(player.getByText('Page 1 of 2',{exact:true})).toBeVisible();
  await page.getByLabel('Replacement file').setInputFiles({name:'map.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Replace for everyone',exact:true}).click();await expect(page.getByText('Display page 1 of 1')).toBeVisible();await expect(player.getByRole('img',{name:'Handout content',exact:true})).toBeVisible();
  await page.screenshot({path:`.scratch/party-presentation/verification/ticket04/${info.project.name}-live.png`,fullPage:true});
  // Confirmed expired/invalid auth response clears, even with a previously rendered frame.
  await page.route('**/rest/v1/party_members?**',route=>route.fulfill({status:401,json:{code:'PGRST301',message:'Invalid JWT'}}));await expect(display.locator('canvas')).toHaveCount(0);
  await page.unroute('**/rest/v1/party_members?**');await page.getByRole('button',{name:'Present on Party Display',exact:true}).click();await expect(display.locator('canvas')).toBeVisible();
  await page.evaluate(async({url,key})=>{const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key);await client.auth.signOut({scope:'local'});},{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!});await expect(display.locator('canvas')).toHaveCount(0);
 } finally {await playerContext.close();}
});
