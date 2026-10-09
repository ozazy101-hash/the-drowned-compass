import {test,expect} from '@playwright/test';
test('masked frame, private DOM, accepted strokes, failure draft, clear and reopen authority',async({page})=>{
 await page.goto('./');await page.evaluate(async()=>{
  const path='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(path)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  const grid={columns:4,rows:4,feetPerSquare:5,terrain:[{x:0,y:0,kind:'water'}],edges:[]};
  const result=await data.content.saveMap({id:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Private secret map',document:grid});
  const workspace=await data.content.readMapWorkspace();const version=workspace.versions.find((v:any)=>v.familyId===result.item.id);
  const module='/the-drowned-compass/src/features/presentation/party-display.ts';const controller=(await import(module)).createPartyDisplay(data.content,()=>data.getSession());
  Object.assign(window,{md:controller,data,version});const button=document.createElement('button');button.textContent='Use fixture';button.onclick=()=>controller.presentMap(version);document.body.append(button);
 });
 const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Use fixture'}).click();const popup=await created;
 await expect(popup.locator('canvas')).toBeVisible();
 const pixels=()=>popup.locator('canvas').evaluate((node:any)=>{const c=node.getContext('2d'),a=c.getImageData(0,0,node.width,node.height).data;return {allBlack:a.every((v:number,i:number)=>i%4===3?v===255:v===0),hidden:[...c.getImageData(node.width/2,node.height/2,1,1).data],visible:[...c.getImageData(10,10,1,1).data]};});
 expect((await pixels()).allBlack).toBe(true);expect(await popup.locator('body').innerHTML()).not.toMatch(/<image|href=|secret|prompt|<input|<button|<svg/i);
 await page.evaluate(async()=>{const w=window as any;w.md.reveal({type:'begin',mode:'uncover',brush:1});w.md.reveal({type:'sample',point:{x:0,y:0}});w.md.reveal({type:'finish'});await w.md.saveReveal();});
 await expect.poll(async()=> (await pixels()).allBlack).toBe(false);expect((await pixels()).hidden).toEqual([0,0,0,255]);
 await page.evaluate(async()=>{const w=window as any;w.data.content.commitMapRevealMask=async()=>{throw Error('offline');};w.md.reveal({type:'hide-all'});await w.md.saveReveal();});
 expect((await pixels()).allBlack).toBe(false);expect(await page.evaluate(()=>(window as any).md.getState().reveal.status)).toBe('error');
 await popup.close();await page.waitForTimeout(1100);const opened=page.waitForEvent('popup');await page.evaluate(()=>{const w=window as any;const b=document.createElement('button');b.textContent='Reopen fixture';b.onclick=w.md.openWindow;document.body.append(b);});await page.getByRole('button',{name:'Reopen fixture'}).click();const reopened=await opened;await expect(reopened.locator('canvas')).toBeVisible();
 await page.evaluate(()=>(window as any).md.clear());await expect(reopened.locator('canvas')).toHaveCount(0);
 await page.evaluate(async()=>{const w=window as any;await w.data.signOut();w.md.dispose();});await expect(reopened.locator('canvas')).toHaveCount(0);
});

test('actual workshop Use intent and rapid pointer stroke controls remain private',async({page})=>{
 await page.goto('./');
 await page.evaluate(async()=>{const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');await data.content.attachMapVersion({familyId:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Workshop Use test',document:{columns:4,rows:4,feetPerSquare:5,terrain:[],edges:[]}});});
 await page.reload();
 await page.getByRole('button',{name:'Map creation workshop',exact:true}).click();
 await page.getByLabel('Map family').selectOption({label:'Workshop Use test'});await page.getByRole('button',{name:/Inspect version 1/}).click();
 const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Use this map',exact:true}).click();const popup=await created;
 await expect(popup.locator('canvas')).toBeVisible();await expect(page.getByRole('region',{name:'DM Reveal Mask controls'})).toBeVisible();
 const canvas=page.getByLabel('Private reveal brush canvas');await canvas.click({position:{x:20,y:20}});
 await expect.poll(()=>popup.locator('canvas').getAttribute('data-presentation-revision')).toBe('2');
 expect(await popup.locator('body').innerHTML()).not.toMatch(/<svg|<image|href=|<button|<input|Workshop/i);
});

test('blocked popup and stale protected choice/render cannot restore cleared or revoked output',async({page})=>{
 await page.goto('./');await page.evaluate(async()=>{
  const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d')!;ctx.fillStyle='red';ctx.fillRect(0,0,16,16);const blob=await new Promise<Blob>(resolve=>c.toBlob(b=>resolve(b!)));
  const created=await data.content.attachMapVersion({familyId:crypto.randomUUID(),requestId:crypto.randomUUID(),expectedVersion:0,title:'Race map',document:{columns:4,rows:4,feetPerSquare:5,terrain:[],edges:[]},artwork:new File([blob],'map.png',{type:'image/png'})});
  const w=window as any;w.choices=0;w.delayRead=false;w.delayImage=false;w.role='dungeon-master';
  const content={...data.content,readMapWorkspace:async()=>{if(w.delayRead){w.readStarted=true;await new Promise(resolve=>w.releaseRead=resolve);w.delayRead=false;}return data.content.readMapWorkspace();},chooseMapPresentation:async(intent:any)=>{w.choices++;return data.content.chooseMapPresentation(intent);},openMapVersion:async(...args:any[])=>{if(w.delayImage){w.imageStarted=true;await new Promise(resolve=>w.releaseImage=resolve);w.delayImage=false;}return data.content.openMapVersion(...args);}};
  const displayModule='/the-drowned-compass/src/features/presentation/party-display.ts';w.md=(await import(displayModule)).createPartyDisplay(content,async()=>w.role?{role:w.role}:null);w.raceVersion=created.version;
  const button=document.createElement('button');button.textContent='Open race display';button.onclick=w.md.openWindow;document.body.append(button);
  const saved=window.open;window.open=()=>null;await w.md.presentMap(created.version);window.open=saved;
 });
 expect(await page.evaluate(()=>(window as any).md.getState().window)).toBe('blocked');expect(await page.evaluate(()=>(window as any).choices)).toBe(0);
 const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Open race display'}).click();const popup=await created;
 await page.evaluate(()=>{const w=window as any;w.delayRead=true;w.pending=w.md.presentMap(w.raceVersion);});await expect.poll(()=>page.evaluate(()=>(window as any).readStarted)).toBe(true);
 await page.evaluate(async()=>{const w=window as any;w.md.clear();w.releaseRead();await w.pending;});expect(await page.evaluate(()=>(window as any).choices)).toBe(0);await expect(popup.locator('canvas')).toHaveCount(0);
 await page.evaluate(()=>{const w=window as any;w.delayImage=true;w.pending=w.md.presentMap(w.raceVersion);});await expect.poll(()=>page.evaluate(()=>(window as any).imageStarted)).toBe(true);
 await page.evaluate(async()=>{const w=window as any;w.md.clear();w.releaseImage();await w.pending;});await expect(popup.locator('canvas')).toHaveCount(0);
 await page.evaluate(async()=>{const w=window as any;await w.md.presentMap(w.raceVersion);w.md.calibration({kind:'start',squarePixels:61});w.md.reveal({type:'uncover-all',confirmed:true});await w.md.saveReveal();});await expect(popup.getByLabel('Physical calibration test square')).toBeVisible();
 await page.evaluate(()=>{const w=window as any;w.role=null;});await expect(popup.locator('canvas,svg')).toHaveCount(0);await page.evaluate(()=>(window as any).md.dispose());
});

test('largest supported artwork and grid render bounded opaque frames without per-sample persistence',async({page},info)=>{
 await page.goto('./');await page.evaluate(async()=>{
  const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  const source=document.createElement('canvas');source.width=source.height=4000;const ctx=source.getContext('2d')!;ctx.fillStyle='#b03020';ctx.fillRect(0,0,4000,4000);const bytes=await new Promise<Blob>(resolve=>source.toBlob(b=>resolve(b!)));source.width=source.height=0;
  const created=await data.content.attachMapVersion({familyId:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Large private map',document:{columns:80,rows:80,feetPerSquare:5,terrain:[],edges:[]},artwork:new File([bytes],'large.png',{type:'image/png'})});
  const w=window as any;w.maskCommits=0;w.generationCalls=0;const content={...data.content,commitMapRevealMask:async(intent:any)=>{w.maskCommits++;return data.content.commitMapRevealMask(intent);},changeMapGeneration:async()=>{w.generationCalls++;throw Error('Unexpected generation');}};
  const displayModule='/the-drowned-compass/src/features/presentation/party-display.ts';w.md=(await import(displayModule)).createPartyDisplay(content,()=>data.getSession());w.largeVersion=created.version;
  const button=document.createElement('button');button.textContent='Use large map';button.onclick=()=>{w.started=performance.now();w.pending=w.md.presentMap(created.version);};document.body.append(button);
 });
 const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Use large map'}).click();const popup=await created;await expect(popup.locator('canvas')).toBeVisible();
 await page.evaluate(async()=>{const w=window as any;await w.pending;w.duration=performance.now()-w.started;w.md.reveal({type:'begin',mode:'uncover',brush:1});for(let i=0;i<20;i++)w.md.reveal({type:'sample',point:{x:i/100,y:i/100}});w.md.reveal({type:'finish'});});
 expect(await page.evaluate(()=>(window as any).maskCommits)).toBe(0);await page.evaluate(async()=>{await (window as any).md.saveReveal();});
 expect(await page.evaluate(()=>(window as any).maskCommits)).toBe(1);expect(await page.evaluate(()=>(window as any).generationCalls)).toBe(0);
 const dimensions=await popup.locator('canvas').evaluate((c:HTMLCanvasElement)=>({width:c.width,height:c.height,edge:[...c.getContext('2d')!.getImageData(51,0,1,1).data],far:[...c.getContext('2d')!.getImageData(2000,2000,1,1).data]}));expect(dimensions.width).toBe(4080);expect(dimensions.height).toBe(4080);expect(dimensions.edge).toEqual([0,0,0,255]);expect(dimensions.far).toEqual([0,0,0,255]);
 console.log(`Ticket10 ${info.project.name} observed16Mpixel/80x80 initial frame milliseconds: ${await page.evaluate(()=>(window as any).duration)}`);
 await page.evaluate(()=>{const w=window as any;w.md.viewport({zoom:1.25,x:37,y:-19});});await expect(popup.locator('canvas')).toHaveCSS('image-rendering','pixelated');
 await page.evaluate(()=>(window as any).md.dispose());
});

test('fresh controller after reload restores accepted progress black-first while Clear suppresses restore',async({page})=>{
 await page.goto('./');await page.evaluate(async()=>{
  const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  const result=await data.content.attachMapVersion({familyId:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Reload map',document:{columns:4,rows:4,feetPerSquare:5,terrain:[],edges:[]}});
  const chosen=await data.content.chooseMapPresentation({versionId:result.version.id,expectedRevision:0,requestId:crypto.randomUUID()});
  const moduleMask='/the-drowned-compass/src/domain/map-reveal-mask.ts';const draft=(await import(moduleMask)).createMapRevealMaskDraft(chosen.presentation);draft.command({type:'uncover-all',confirmed:true});await data.content.commitMapRevealMask(draft.prepareCommit(crypto.randomUUID()));
 });
 await page.reload();await page.evaluate(async()=>{
  const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();const displayModule='/the-drowned-compass/src/features/presentation/party-display.ts';const w=window as any;w.delayAuth=true;
  w.md=(await import(displayModule)).createPartyDisplay(data.content,async()=>{if(w.delayAuth){w.authStarted=true;await new Promise(resolve=>w.releaseAuth=resolve);w.delayAuth=false;}return data.getSession();});
  const button=document.createElement('button');button.textContent='Restore accepted map';button.onclick=w.md.openWindow;document.body.append(button);
 });
 const created=page.waitForEvent('popup');await page.getByRole('button',{name:'Restore accepted map'}).click();let popup=await created;await expect.poll(()=>page.evaluate(()=>(window as any).authStarted)).toBe(true);await expect(popup.locator('canvas')).toHaveCount(0);expect(await popup.locator('body').evaluate(node=>getComputedStyle(node).backgroundColor)).toBe('rgb(0, 0, 0)');
 await page.evaluate(()=>(window as any).releaseAuth());await expect(popup.locator('canvas')).toBeVisible();expect(await popup.locator('canvas').getAttribute('data-presentation-revision')).toBe('2');
 await page.evaluate(()=>(window as any).md.clear());await popup.close();const reopened=page.waitForEvent('popup');await page.getByRole('button',{name:'Restore accepted map'}).click();popup=await reopened;await page.waitForTimeout(1100);await expect(popup.locator('canvas')).toHaveCount(0);
 await page.evaluate(()=>(window as any).md.dispose());await popup.close();
 await page.evaluate(async()=>{
  const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();const displayModule='/the-drowned-compass/src/features/presentation/party-display.ts';const w=window as any;
  const content={...data.content,readMapWorkspace:async()=>{w.restoreReadStarted=true;await new Promise(resolve=>w.releaseRestoreRead=resolve);return data.content.readMapWorkspace();}};
  w.md=(await import(displayModule)).createPartyDisplay(content,()=>data.getSession());const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Restore accepted map')!;button.textContent='Restore held map';button.onclick=w.md.openWindow;
 });
 const held=page.waitForEvent('popup');await page.getByRole('button',{name:'Restore held map'}).click();popup=await held;await expect.poll(()=>page.evaluate(()=>(window as any).restoreReadStarted)).toBe(true);await expect(popup.locator('canvas')).toHaveCount(0);
 await page.evaluate(()=>{const w=window as any;w.md.clear();w.releaseRestoreRead();});await page.waitForTimeout(200);await expect(popup.locator('canvas')).toHaveCount(0);await page.evaluate(()=>(window as any).md.dispose());
});

for(const success of [true,false])test(`pending reveal ${success?'success':'failure'} settles after popup close and safely reopens`,async({page})=>{
 await page.goto('./');await page.evaluate(async({success})=>{
  const module='/the-drowned-compass/src/data/in-memory-party-data.ts';const data=(await import(module)).createInMemoryPartyData();await data.signIn('dungeon-master','dm-password');
  const created=await data.content.attachMapVersion({familyId:crypto.randomUUID(),expectedVersion:0,requestId:crypto.randomUUID(),title:'Pending close map',document:{columns:4,rows:4,feetPerSquare:5,terrain:[],edges:[]}});
  const w=window as any;w.saves=0;const content={...data.content,commitMapRevealMask:async(intent:any)=>{w.saves++;w.saveStarted=true;await new Promise(resolve=>w.releaseSave=resolve);if(!success)throw Error('Owned failure');return data.content.commitMapRevealMask(intent);}};
  const displayModule='/the-drowned-compass/src/features/presentation/party-display.ts';w.md=(await import(displayModule)).createPartyDisplay(content,()=>data.getSession());w.pendingVersion=created.version;
  const button=document.createElement('button');button.textContent='Open pending map';button.onclick=w.md.openWindow;document.body.append(button);
 },{success});
 const opening=page.waitForEvent('popup');await page.getByRole('button',{name:'Open pending map'}).click();let popup=await opening;
 await page.evaluate(async()=>{const w=window as any;await w.md.presentMap(w.pendingVersion);w.md.reveal({type:'uncover-all',confirmed:true});w.pending=w.md.saveReveal();});await expect.poll(()=>page.evaluate(()=>(window as any).saveStarted)).toBe(true);
 await popup.close();await expect.poll(()=>page.evaluate(()=>(window as any).md.getState().window)).toBe('closed');
 await page.evaluate(async()=>{const w=window as any;w.releaseSave();await w.pending;});expect(await page.evaluate(()=>(window as any).md.getState().reveal.status)).toBe(success?'accepted':'error');expect(await page.evaluate(()=>(window as any).saves)).toBe(1);
 const reopened=page.waitForEvent('popup');await page.getByRole('button',{name:'Open pending map'}).click();popup=await reopened;await expect(popup.locator('canvas')).toBeVisible();expect(await page.evaluate(()=>(window as any).md.getState().reveal.status)).toBe(success?'accepted':'error');
 if(success){await page.evaluate(()=>{const w=window as any;w.md.reveal({type:'hide-all'});});expect(await page.evaluate(()=>(window as any).md.getState().reveal.status)).toBe('draft');}
 if(!success){await page.evaluate(()=>(window as any).md.reveal({type:'discard'}));expect(await page.evaluate(()=>(window as any).md.getState().reveal.status)).toBe('accepted');}
 await page.evaluate(()=>(window as any).md.dispose());
});
