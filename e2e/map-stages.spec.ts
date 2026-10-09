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
 test(`${adapter}: private copy/retry/conflict and obsolete sharing denial`,async({page})=>{
  test.skip(adapter==='supabase'&&!live.url,'Needs disposable local backend fixture.');await mount(page,adapter);
  const result=await page.evaluate(async({image,prefix,adapter})=>{
   const content=(window as any).stageContent;
   const editor=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor({columns:8,rows:6});editor.draw('water',[{x:1.5,y:1.5}]);
   const source=(await content.saveMap({id:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:prefix+' source '+adapter,document:editor.snapshot().document,background:new File([new Uint8Array(image)],'map.png',{type:'image/png'})})).item;
   const input={id:source.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'copy',id:crypto.randomUUID(),title:prefix+' copy '+adapter}};
   const copy=(await content.changeMap(input)).item;
   let obsolete=0;for(const kind of ['reveal','withdraw'])try{await content.changeMap({...input,requestId:crypto.randomUUID(),command:{kind}});}catch{obsolete++;}
   editor.draw('floor',[{x:2.5,y:2.5}]);await content.saveMap({id:source.id,expectedVersion:1,requestId:crypto.randomUUID(),title:source.title,document:editor.snapshot().document,background:null});
   const retry=(await content.changeMap(input)).item;
   const stale=await content.changeMap({...input,requestId:crypto.randomUUID(),command:{...input.command,id:crypto.randomUUID()}});
   let reused=false;try{await content.changeMap({...input,command:{...input.command,title:'Changed'}});}catch{reused=true;}
   const retained=await content.loadMap(copy.id);return {obsolete,reused,stale:stale.ok,private:retained.visibility,retry:retry.id===copy.id&&retry.version===1,independent:JSON.stringify(retained.document)===JSON.stringify(source.document),bytes:(await content.openMapBackground(copy.id,1)).size,registration:retained.background.registration===source.background.registration};
  },{image:Array.from(png),prefix,adapter});
  expect(result).toEqual({obsolete:2,reused:true,stale:false,private:'private',retry:true,independent:true,bytes:png.length,registration:true});
 });
 test(`${adapter}: private stages retain calibration, refresh accepted saves and stay absent from Player Library`,async({page,context},info)=>{
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
  await source.getByRole('button',{name:'Present saved Grid Map'}).click();await expect(popup.locator('svg')).toHaveAttribute('data-square-pixels','72');await page.getByRole('button',{name:'Pan right',exact:true}).click();await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 0)');
  const player=await context.newPage();await mount(player,adapter,'player');await player.getByRole('button',{name:'Party Library',exact:true}).click();await expect(player.getByText(sourceTitle,{exact:true})).toHaveCount(0);await expect(player.getByText(copyTitle,{exact:true})).toHaveCount(0);
  await copy.getByRole('button',{name:'Present saved Grid Map'}).click();await expect(popup.locator('[data-terrain=difficult]')).toHaveCount(1);await expect(popup.locator('svg')).toHaveAttribute('data-square-pixels','72');await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 0)');await expect(player.getByText(copyTitle,{exact:true})).toHaveCount(0);
  await source.getByRole('button',{name:'Present saved Grid Map'}).click();await expect(popup.locator('[data-terrain=difficult]')).toHaveCount(0);await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 50, 0)');
  await page.evaluate(async(title)=>{const c=(window as any).stageContent;const m=(await c.listMaps()).find((v:any)=>v.title===title);const d=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor(m.document);d.draw('floor',[{x:5.5,y:5.5}]);await c.saveMap({id:m.id,expectedVersion:m.version,requestId:crypto.randomUUID(),title:m.title,document:d.snapshot().document});},sourceTitle);
  await expect(popup.locator('[data-terrain=floor]')).toHaveCount(1);
  await page.evaluate(async(title)=>{const c=(window as any).stageContent;const m=(await c.listMaps()).find((v:any)=>v.title===title);const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;canvas.getContext('2d')!.fillRect(0,0,8,8);const b=await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!)));await c.saveMap({id:m.id,expectedVersion:m.version,requestId:crypto.randomUUID(),title:m.title,document:m.document,background:new File([b],'different.png',{type:'image/png'})});},copyTitle);
  await expect(copy).toContainText('version 3');await copy.getByRole('button',{name:'Present saved Grid Map'}).click();await expect(page.getByRole('alert')).toContainText('Map registration changed');await expect(popup.locator('svg')).toHaveAttribute('data-square-pixels','72');await expect(popup.locator('svg')).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');await page.getByRole('button',{name:'Confirm measured square'}).click();await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(player.getByRole('region',{name:'Saved Grid Maps'})).toHaveCount(0);await expect(page.getByRole('button',{name:/Reveal Grid Map|Withdraw Grid Map/})).toHaveCount(0);
  await page.bringToFront();await page.screenshot({path:info.outputPath(`ticket08-${adapter}.png`),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await popup.close();await player.close();
 });
}

test('session loss during pending stage read blanks the retained frame and rejects late work',async({page})=>{
 await mount(page,'local');
 const ids=await page.evaluate(async()=>{
  const c=(window as any).stageContent,d=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor().snapshot().document;
  const first=(await c.saveMap({id:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Retained stage',document:d})).item;
  const second=(await c.changeMap({id:first.id,expectedVersion:1,requestId:crypto.randomUUID(),command:{kind:'copy',id:crypto.randomUUID(),title:'Unread stage'}})).item;
  let session:any={role:'dungeon-master'};const display=(await import('/the-drowned-compass/src/features/presentation/party-display.ts')).createPartyDisplay(c,async()=>session);
  Object.assign(window,{privateDisplay:display,endDisplaySession:()=>{session=null;}});return {first:first.id,second:second.id};
 });
 const promised=page.waitForEvent('popup');await page.evaluate(()=>(window as any).privateDisplay.openWindow());const popup=await promised;await page.bringToFront();
 await page.evaluate(id=>(window as any).privateDisplay.presentMap(id),ids.first);await expect(popup.locator('svg')).toBeVisible();
 await page.evaluate(id=>{const c=(window as any).stageContent,load=c.loadMap;c.loadMap=async(value:string)=>{if(value===id)await new Promise<void>(resolve=>Object.assign(window,{releaseStageRead:resolve}));return load(value);};void(window as any).privateDisplay.presentMap(id);},ids.second);
 await expect.poll(()=>page.evaluate(()=>Boolean((window as any).releaseStageRead))).toBe(true);await page.evaluate(()=>(window as any).endDisplaySession());await expect(popup.locator('svg')).toHaveCount(0);await page.evaluate(()=>(window as any).releaseStageRead());await expect(popup.locator('svg')).toHaveCount(0);await page.evaluate(()=>(window as any).privateDisplay.dispose());await popup.close();
});
