import {test,expect,type Page} from '@playwright/test';
import {png} from './handout-fixtures';
const prefix=process.env.MAP_FIXTURE_PREFIX??'Ticket08 local';
const live={url:process.env.MAP_LIVE_URL??'',key:process.env.MAP_LIVE_KEY??'',dmJwt:process.env.MAP_LIVE_DM_JWT??'',playerJwt:process.env.MAP_LIVE_PLAYER_JWT??''};
if(live.url&&live.url!=='http://127.0.0.1:54321')throw new Error('Only disposable local Supabase is allowed.');
async function mount(page:Page,adapter:'local'|'supabase',role:'dungeon-master'|'player'='dungeon-master') {
 await page.goto('./');
 await page.evaluate(async({adapter,role,url,key,dmJwt,playerJwt})=>{
  let data;
  if(adapter==='local'){
   data=(await import('/the-drowned-compass/src/data/in-memory-party-data.ts')).createInMemoryPartyData();
   if(role==='dungeon-master')await data.signIn(role,'dm-password');
   else {const token=crypto.randomUUID();await(await import('/the-drowned-compass/src/data/local-party-store.ts')).writeLocalSession(token,role);data={...data,content:(await import('/the-drowned-compass/src/data/local-party-content.ts')).localPartyContent(()=>token),getSession:async()=>({role})};}
  } else {
   const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>role==='player'?playerJwt:dmJwt,auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
   const base=(await import('/the-drowned-compass/src/data/in-memory-party-data.ts')).createInMemoryPartyData();
   data={...base,content:(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client),getSession:async()=>({role})};
  }
  Object.assign(window,{stageContent:data.content});
  const React=await import('/the-drowned-compass/node_modules/.vite/deps/react.js');const renderer=await import('/the-drowned-compass/node_modules/.vite/deps/react-dom_client.js');const App=(await import('/the-drowned-compass/src/App.tsx')).App;
  document.getElementById('root')!.remove();const root=document.createElement('div');document.body.append(root);(renderer.createRoot??renderer.default.createRoot)(root).render((React.createElement??React.default.createElement)(App,{partyData:data}));
 },{adapter,role,...live});
 await expect(page.getByRole('button',{name:role==='player'?'Party Library':'Dungeon Master Library',exact:true})).toBeVisible();
}
for(const adapter of ['local','supabase'] as const){
 test(`${adapter}: atomic stage copy/retry/conflict and protected artwork lifecycle`,async({page})=>{
  test.skip(adapter==='supabase'&&!live.url,'Disposable local backend required');await page.goto('./');
  const result=await page.evaluate(async({adapter,image,prefix,url,key,dmJwt,playerJwt})=>{
   let content,player,client;
   if(adapter==='local'){
    const data=(await import('/the-drowned-compass/src/data/in-memory-party-data.ts')).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');content=data.content;
    const token=crypto.randomUUID();await(await import('/the-drowned-compass/src/data/local-party-store.ts')).writeLocalSession(token,'player');player=(await import('/the-drowned-compass/src/data/local-party-content.ts')).localPartyContent(()=>token);
   }else{
    const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');client=sdk.createClient(url,key,{accessToken:async()=>dmJwt,auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);player=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(sdk.createClient(url,key,{accessToken:async()=>playerJwt,auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}}));
   }
   const domain=await import('/the-drowned-compass/src/domain/grid-map.ts');const editor=domain.createGridMapEditor({columns:8,rows:6});editor.draw('wall',[{x:1.5,y:1}]);editor.draw('water',[{x:2.5,y:2.5}]);
   const source=(await content.saveMap({id:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:prefix+' contract source '+adapter,document:editor.snapshot().document,background:new File([new Uint8Array(image)],'art.png',{type:'image/png'})})).item;
   const copyInput={id:source.id,expectedVersion:source.version,requestId:crypto.randomUUID(),command:{kind:'copy',id:crypto.randomUUID(),title:prefix+' contract copy '+adapter}};
   const copy=(await content.changeMap(copyInput)).item;
   let crossCommandDenied=0;for(const id of [source.id,crypto.randomUUID()])try{await content.saveMap({id,expectedVersion:id===source.id?1:0,requestId:copyInput.requestId,title:prefix+' reused command',document:source.document});}catch{crossCommandDenied++;}
   try{await content.changeMap({...copyInput,id:copy.id,command:{kind:'reveal'}});}catch{crossCommandDenied++;}
   let privateDenied=0;for(const fn of [()=>player.loadMap(source.id),()=>player.loadMap(copy.id),()=>player.openMapBackground(copy.id,copy.version),()=>player.changeMap(copyInput)])try{await fn();}catch{privateDenied++;}
   let payloadDenied=false;try{await content.changeMap({...copyInput,command:{...copyInput.command,title:'altered'}});}catch{payloadDenied=true;}
   const revealInput={id:source.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'reveal'}};
   const revealed=await content.changeMap(revealInput);const revealRetry=await content.changeMap(revealInput);
   const staleCopy=await content.changeMap({...copyInput,requestId:crypto.randomUUID(),command:{...copyInput.command,id:crypto.randomUUID()}});
   const staleWithdraw=await content.changeMap({id:source.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'withdraw'}});
   const staleReveal=await content.changeMap({...revealInput,requestId:crypto.randomUUID()});
   let identityDenied=false;try{await content.changeMap({...copyInput,expectedVersion:2,requestId:crypto.randomUUID()});}catch{identityDenied=true;}
   const copyRetry=(await content.changeMap(copyInput)).item;
   const raw=client?(await client.from('party_grid_maps').select('party_id,background').eq('id',copy.id).single()).data:null;
   editor.draw('difficult',[{x:4.5,y:4.5}]);
   const changed=(await content.saveMap({id:source.id,expectedVersion:revealed.item.version,requestId:crypto.randomUUID(),title:source.title,document:editor.snapshot().document,background:new File([new Uint8Array(image)],'new.png',{type:'image/png'})})).item;
   const independent=await content.loadMap(copy.id),survivingBytes=(await content.openMapBackground(copy.id,copy.version)).size;
   await content.changeMap({id:source.id,expectedVersion:changed.version,requestId:crypto.randomUUID(),command:{kind:'withdraw'}});
   const copyRevealed=(await content.changeMap({id:copy.id,expectedVersion:copy.version,requestId:crypto.randomUUID(),command:{kind:'reveal'}})).item;
   const playerCopy=await player.loadMap(copy.id),playerBytes=(await player.openMapBackground(copy.id,copyRevealed.version)).size;
   let rawAlive=true,rawDenied=true,anonymousDenied=true;
   if(client){const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const p=sdk.createClient(url,key,{accessToken:async()=>playerJwt,auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});rawAlive=!!(await p.storage.from('party-handouts').download(`${raw.party_id}/${raw.background.object_id}`)).data;const anonymous=sdk.createClient(url,key,{auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});anonymousDenied=!!(await anonymous.storage.from('party-handouts').download(`${raw.party_id}/${raw.background.object_id}`)).error;}
   const withdrawn=(await content.changeMap({id:copy.id,expectedVersion:copyRevealed.version,requestId:crypto.randomUUID(),command:{kind:'withdraw'}})).item;
   let withdrawnDenied=false;try{await player.openMapBackground(copy.id,withdrawn.version);}catch{withdrawnDenied=true;}
   if(client){const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const p=sdk.createClient(url,key,{accessToken:async()=>playerJwt,auth:{persistSession:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});rawDenied=!!(await p.storage.from('party-handouts').download(`${raw.party_id}/${raw.background.object_id}`)).error&&!!(await p.storage.from('party-handouts').createSignedUrl(`${raw.party_id}/${raw.background.object_id}`,60)).error;}
   const current=await content.loadMap(source.id);const races=await Promise.all([content.changeMap({id:source.id,expectedVersion:current.version,requestId:crypto.randomUUID(),command:{kind:'reveal'}}),content.saveMap({id:source.id,expectedVersion:current.version,requestId:crypto.randomUUID(),title:source.title,document:current.document})]);
   return {crossCommandDenied,raceWinners:races.filter(value=>value.ok).length,staleReveal:staleReveal.ok,identityDenied,privateDenied,payloadDenied,copyPrivate:copy.visibility,identity:copy.id!==source.id,copyVersion:copy.version,registration:copy.background.registration===source.background.registration,retryVersion:copyRetry.version,revealVersion:revealed.item.version,revealRetryVersion:revealRetry.item.version,staleCopy:staleCopy.ok,staleWithdraw:staleWithdraw.ok,independent:JSON.stringify(independent.document)===JSON.stringify(source.document),placement:JSON.stringify(independent.background)===JSON.stringify(source.background),survivingBytes,playerCopy:playerCopy.id===copy.id,playerBytes,rawAlive,rawDenied,anonymousDenied,withdrawnDenied};
  },{adapter,image:Array.from(png),prefix,...live});
  expect(result).toEqual({crossCommandDenied:3,raceWinners:1,staleReveal:false,identityDenied:true,privateDenied:4,payloadDenied:true,copyPrivate:'private',identity:true,copyVersion:1,registration:true,retryVersion:1,revealVersion:2,revealRetryVersion:2,staleCopy:false,staleWithdraw:false,independent:true,placement:true,survivingBytes:png.length,playerCopy:true,playerBytes:png.length,rawAlive:true,rawDenied:true,anonymousDenied:true,withdrawnDenied:true});
 });
 test(`${adapter}: two-window stages retain calibration, refresh accepted saves and reopen in Player Library`,async({page,context},info)=>{
  test.setTimeout(90_000);test.skip(adapter==='supabase'&&!live.url,'Disposable local backend required');await mount(page,adapter);
  const sourceTitle=prefix+' UI stage1 '+adapter+' '+info.project.name;
  await page.getByRole('button',{name:'Grid Map editor',exact:true}).click();await page.getByLabel('Map title').fill(sourceTitle);
  await page.getByLabel('Map Background',{exact:true}).setInputFiles({name:'art.png',mimeType:'image/png',buffer:png});
  const grid=page.getByRole('application',{name:'Grid Map drawing surface'});await page.getByRole('button',{name:'Water',exact:true}).click();await grid.press('Enter');await page.getByRole('button',{name:'Save private Grid Map'}).click();await expect(page.getByRole('status').filter({hasText:'Saved privately'})).toBeVisible();
  await grid.press('ArrowRight');await grid.press('Enter');await expect(page.locator('[data-terrain=water]')).toHaveCount(2);
  await page.evaluate(()=>{const c=(window as any).stageContent,original=c.changeMap;let lose=true;c.changeMap=async(input:any)=>{const outcome=await original(input);if(lose&&input.command.kind==='copy'){lose=false;throw new Error('Simulated lost copy response');}return outcome;};});
  await expect(page.getByText(/Unsaved title, drawing and background changes are excluded/)).toBeVisible();await page.getByRole('button',{name:'Save as copy (saved version only)'}).click();await expect(page.getByRole('alert')).toContainText('Retry Save as copy');await page.getByRole('button',{name:'Save as copy (saved version only)'}).click();await expect(page.getByRole('status').filter({hasText:'Saved private copy'})).toBeVisible();await expect(page.locator('[data-terrain=water]')).toHaveCount(2);
  await page.getByRole('button',{name:'Open private copy (discard current draft)'}).click();await expect(page.locator('[data-terrain=water]')).toHaveCount(1);
  const copyTitle=sourceTitle.slice(0,155)+' copy';await page.getByRole('button',{name:'Difficult terrain',exact:true}).click();await grid.press('ArrowRight');await grid.press('Enter');await page.getByRole('button',{name:'Save private Grid Map'}).click();await expect(page.getByRole('status').filter({hasText:'Saved privately'})).toBeVisible();
  await page.getByRole('button',{name:'Open Dungeon Master Library'}).click();
  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Party Display',exact:true}).click();const popup=await popupPromise;
  await page.getByRole('button',{name:'Calibrate physical projection'}).click();await page.getByLabel('Test square display pixels').fill('72');await page.getByRole('button',{name:'Confirm measured square'}).click();
  const source=page.locator('article').filter({has:page.getByText(sourceTitle,{exact:true})});const copy=page.locator('article').filter({has:page.getByText(copyTitle,{exact:true})});
  await source.getByRole('button',{name:'Reveal and present Grid Map'}).click();await expect(popup.locator('svg')).toHaveAttribute('data-square-pixels','72');await page.getByRole('button',{name:'Pan right',exact:true}).click();await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 0)');
  const player=await context.newPage();await mount(player,adapter,'player');await player.getByRole('button',{name:'Party Library',exact:true}).click();await expect(player.getByText(sourceTitle,{exact:true})).toBeVisible();await expect(player.getByText(copyTitle,{exact:true})).toHaveCount(0);
  await copy.getByRole('button',{name:'Reveal and present Grid Map'}).click();await expect(popup.locator('[data-terrain=difficult]')).toHaveCount(1);await expect(popup.locator('svg')).toHaveAttribute('data-square-pixels','72');await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 0)');await expect(player.getByText(copyTitle,{exact:true})).toBeVisible();
  await player.getByRole('button').filter({has:player.getByText(copyTitle,{exact:true})}).click();await expect(player.getByLabel('Revealed Grid Map')).toBeVisible();await expect(player.locator('[data-terrain=difficult]')).toHaveCount(1);
  await source.getByRole('button',{name:'Present saved Grid Map'}).click();await expect(popup.locator('[data-terrain=difficult]')).toHaveCount(0);await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 0)');
  await page.evaluate(async(title)=>{const c=(window as any).stageContent;const m=(await c.listMaps()).find((v:any)=>v.title===title);const d=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor(m.document);d.draw('floor',[{x:5.5,y:5.5}]);await c.saveMap({id:m.id,expectedVersion:m.version,requestId:crypto.randomUUID(),title:m.title,document:d.snapshot().document});},sourceTitle);
  await expect(popup.locator('[data-terrain=floor]')).toHaveCount(1);
  await page.evaluate(async(title)=>{const c=(window as any).stageContent;const m=(await c.listMaps()).find((v:any)=>v.title===title);const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;canvas.getContext('2d')!.fillRect(0,0,8,8);const b=await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!)));await c.saveMap({id:m.id,expectedVersion:m.version,requestId:crypto.randomUUID(),title:m.title,document:m.document,background:new File([b],'different.png',{type:'image/png'})});},copyTitle);
  await expect(copy).toContainText('version 4');await copy.getByRole('button',{name:'Present saved Grid Map'}).click();await expect(page.getByRole('alert')).toContainText('Map registration changed');await expect(popup.locator('svg')).toHaveAttribute('data-square-pixels','72');await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');await page.getByRole('button',{name:'Confirm measured square'}).click();await expect(page.getByRole('alert')).toHaveCount(0);
  await copy.getByRole('button',{name:'Withdraw Grid Map from Party'}).click();await expect(popup.locator('svg')).toHaveCount(0);await expect(player.getByText(copyTitle,{exact:true})).toHaveCount(0);await expect(player.getByText(sourceTitle,{exact:true})).toBeVisible();
  await page.bringToFront();await page.screenshot({path:info.outputPath(`ticket08-${adapter}.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await popup.close();await player.close();
 });
}

test('pending stage read cannot delay withdrawal of the retained frame',async({page})=>{
 test.setTimeout(60_000);await mount(page,'local');
 const ids=await page.evaluate(async()=>{
  const c=(window as any).stageContent,d=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor().snapshot().document;
  const first=(await c.saveMap({id:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Retained stage',document:d})).item;
  const second=(await c.changeMap({id:first.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'copy',id:crypto.randomUUID(),title:'Unread stage'}})).item;
  return {first:first.id,second:second.id};
 });
 await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click();const promised=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Party Display',exact:true}).click();const popup=await promised;
 const first=page.locator('article').filter({has:page.getByText('Retained stage',{exact:true})}),second=page.locator('article').filter({has:page.getByText('Unread stage',{exact:true})});
 await first.getByRole('button',{name:'Reveal and present Grid Map'}).click();await expect(popup.locator('svg')).toBeVisible();
 await page.evaluate(id=>{const c=(window as any).stageContent,load=c.loadMap;c.loadMap=async(value:string)=>{if(value===id)await new Promise<void>(resolve=>Object.assign(window,{releaseStageRead:resolve}));return load(value);};},ids.second);
 await second.getByRole('button',{name:'Reveal and present Grid Map'}).click();await expect.poll(()=>page.evaluate(()=>Boolean((window as any).releaseStageRead))).toBe(true);await expect(popup.locator('svg')).toBeVisible();
 await first.getByRole('button',{name:'Withdraw Grid Map from Party'}).click();await expect(popup.locator('svg')).toHaveCount(0);await page.evaluate(()=>(window as any).releaseStageRead());await expect(popup.locator('svg')).toHaveCount(0);await popup.close();
});

test('pure saved-map transitions validate copy intent, isolate geometry and report stale versions',async({page})=>{
 await page.route('**/domain-harness.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('./domain-harness.html');const result=await page.evaluate(async()=>{
  const {prepareGridMapChange,transitionGridMap}=await import('/the-drowned-compass/src/domain/party-content.ts');
  const {createGridMapEditor}=await import('/the-drowned-compass/src/domain/grid-map.ts');
  const map={id:crypto.randomUUID(),title:'Stage1',visibility:'revealed' as const,createdAt:'before',version:3,document:createGridMapEditor().snapshot().document,background:null};
  const input={id:map.id,expectedVersion:3,requestId:crypto.randomUUID(),command:{kind:'copy' as const,id:crypto.randomUUID(),title:' Stage2 '}};
  const copy=transitionGridMap(map,input,prepareGridMapChange(input),'after');
  const stale=['reveal','withdraw','copy'].map(kind=>{const i={...input,expectedVersion:2,command:kind==='copy'?input.command:{kind} as {kind:'reveal'|'withdraw'}};return transitionGridMap(map,i,prepareGridMapChange(i),'after').ok;});
  const visibility=['reveal','withdraw'].map(kind=>{const i={...input,command:{kind} as {kind:'reveal'|'withdraw'}};return transitionGridMap(map,i,prepareGridMapChange(i),'after').item;});
  let invalid=0;for(const i of [{...input,expectedVersion:0},{...input,requestId:'bad'},{...input,command:{...input.command,id:map.id}},{...input,command:{...input.command,title:' '}}])try{prepareGridMapChange(i);}catch{invalid++;}
  return {copy:copy.item.id!==map.id&&copy.item.title==='Stage2'&&copy.item.version===1&&copy.item.visibility==='private'&&copy.item.createdAt==='after'&&JSON.stringify(copy.item.document)===JSON.stringify(map.document)&&copy.item.document!==map.document,stale,visibility:visibility.map(i=>[i.visibility,i.version]),invalid};
 });expect(result).toEqual({copy:true,stale:[false,false,false],visibility:[['revealed',4],['private',4]],invalid:4});
});

test('Library preserves stale-command feedback across accepted map refresh',async({page})=>{
 await mount(page,'local');await page.evaluate(async()=>{
  const c=(window as any).stageContent,document=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor().snapshot().document;
  await c.saveMap({id:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Conflict feedback map',document});
  const change=c.changeMap;let first=true;c.changeMap=async(input:any)=>{if(first){first=false;const m=await c.loadMap(input.id);await c.saveMap({id:m.id,expectedVersion:m.version,requestId:crypto.randomUUID(),title:m.title,document:m.document});}return change(input);};
 });
 await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click();const card=page.locator('article').filter({has:page.getByText('Conflict feedback map',{exact:true})});
 await card.getByRole('button',{name:'Reveal Grid Map to Party'}).click();await expect(card).toContainText('version 2');await expect(page.getByRole('alert')).toContainText('changed elsewhere');
 await page.getByRole('button',{name:'Refresh saved maps'}).click();await expect(card).toContainText('Private Grid Map');await expect(page.getByRole('alert')).toContainText('changed elsewhere');
 expect(await page.evaluate(async()=>(await(window as any).stageContent.listMaps()).find((m:any)=>m.title==='Conflict feedback map').visibility)).toBe('private');
});
