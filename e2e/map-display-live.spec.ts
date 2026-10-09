import {test,expect,type Page} from '@playwright/test';
import {png,pdfFixture} from './handout-fixtures';
import {sql} from '../scripts/local-verification.mjs';
async function mount(page:Page,index:number){
 await page.goto('./');
 await page.evaluate(async({url,key,jwt,image})=>{
  const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');
  const client=sdk.createClient(url,key,{accessToken:async()=>jwt});
  const content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);
  const session=async()=>{const r=await client.from('party_members').select('role');if(r.error)throw r.error;return r.data.some((x:any)=>x.role==='dungeon-master')?{role:'dungeon-master',userId:'owned-fixture'}:null;};
  const {createPartyDisplay}=await import('/the-drowned-compass/src/features/presentation/party-display.ts');
  const display=createPartyDisplay(content,session);
  const mapDocument={columns:4,rows:4,feetPerSquare:5,terrain:[{x:0,y:0,kind:'water'}],edges:[]};
  const versionId=crypto.randomUUID();const result=await content.attachMapVersion({familyId:crypto.randomUUID(),expectedVersion:0,requestId:versionId,title:'Ticket10 private map secret',document:mapDocument,artwork:new File([new Uint8Array(image)],'source.png',{type:'image/png'}),instructions:'Never send secret prompt'});
  if(!result.ok)throw Error('Owned fixture conflict');
  const React=await import('/the-drowned-compass/node_modules/.vite/deps/react.js');const renderer=await import('/the-drowned-compass/node_modules/.vite/deps/react-dom_client.js');
  const {DisplayControls}=await import('/the-drowned-compass/src/features/presentation/DisplayControls.tsx');
  window.document.body.innerHTML='';
  const root=window.document.createElement('div');window.document.body.append(root);
  (renderer.createRoot??renderer.default.createRoot)(root).render((React.createElement??React.default.createElement)(DisplayControls,{display}));
  const button=window.document.createElement('button');button.textContent='Use saved live map';button.onclick=()=>display.presentMap(result.version);window.document.body.append(button);
  Object.assign(window,{liveMap:{content,client,display,version:result.version,originalCommit:content.commitMapRevealMask}});
 },{url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,jwt:JSON.parse(process.env.MAP_DISPLAY_DM_JWTS!)[index],image:[...png]});
}
async function pixel(popup:Page,x:number,y:number){return popup.locator('canvas').evaluate((c:HTMLCanvasElement,{x,y})=>[...c.getContext('2d')!.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data],{x,y});}
test('genuine authority: opaque output, touch controls, persistence/conflict/failure, reopen, PDF switching and revocation',async({page,isMobile},info)=>{
 test.skip(!process.env.MAP_LIVE_URL,'Requires owned local Supabase fixture');
 page.on('response',async r=>{if(r.status()>=400){let code='';try{code=(await r.json()).code??'';}catch{}console.log(JSON.stringify({event:'http-error',path:new URL(r.url()).pathname,status:r.status(),code}));}});
 const index=info.project.name==='phone'?1:0;await mount(page,index);
 const opening=page.waitForEvent('popup');await page.getByRole('button',{name:'Use saved live map'}).click();let popup=await opening;
 await expect(popup.locator('canvas')).toBeVisible();expect(await pixel(popup,.1,.1)).toEqual([0,0,0,255]);
 expect(await popup.locator('body').innerHTML()).not.toMatch(/href|<image|<img|prompt|secret|button|input|data:image/i);
 const svg=page.getByLabel('Private reveal brush canvas');await svg.scrollIntoViewIfNeeded();
 const point=await svg.evaluate((svg:SVGSVGElement)=>{const p=new DOMPoint(.5,.5).matrixTransform(svg.getScreenCTM()!);return{x:p.x,y:p.y};});
 if(isMobile)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
 await expect.poll(()=>page.evaluate(()=>(window as any).liveMap.display.getState().reveal.status)).toBe('accepted');
 await expect.poll(()=>pixel(popup,.1,.1)).not.toEqual([0,0,0,255]);expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
 const before=await page.evaluate(()=>(window as any).liveMap.content.readMapWorkspace());expect(before.presentation.mask.uncovered).toEqual([0]);
 // External competing controller accepted a stroke; dirty local work must retain
 // cells, report conflict, and retry against the new accepted revision.
 await page.evaluate(async()=>{const w=(window as any).liveMap;w.display.reveal({type:'begin',mode:'uncover',brush:1});w.display.reveal({type:'sample',point:{x:1,y:0}});w.display.reveal({type:'finish'});const domain=await import('/the-drowned-compass/src/domain/map-reveal-mask.ts');const draft=domain.createMapRevealMaskDraft((await w.content.readMapWorkspace()).presentation);draft.command({type:'begin',mode:'uncover',brush:1});draft.command({type:'sample',point:{x:3,y:3}});draft.command({type:'finish'});await w.content.commitMapRevealMask(draft.prepareCommit(crypto.randomUUID()));});
 await expect.poll(()=>page.evaluate(()=>(window as any).liveMap.display.getState().reveal.status)).toBe('conflict');
 await page.getByRole('button',{name:'Retry reveal save'}).click();await expect.poll(()=>page.evaluate(()=>(window as any).liveMap.display.getState().reveal.status)).toBe('accepted');
 const accepted=await page.evaluate(()=>(window as any).liveMap.content.readMapWorkspace());expect(accepted.presentation.mask.uncovered).toContain(1);
 // A real owned transport failure preserves displayed accepted pixels and draft.
 await page.route('**/rest/v1/rpc/commit_map_reveal_mask',r=>r.fulfill({status:503,json:{code:'OWNED_FAILURE',message:'Unavailable'}}));
 await page.evaluate(async()=>{const w=(window as any).liveMap;w.display.reveal({type:'hide-all'});await w.display.saveReveal();});
 await expect(page.getByRole('button',{name:'Retry reveal save'})).toBeVisible();expect(await pixel(popup,.1,.1)).not.toEqual([0,0,0,255]);
 await page.unroute('**/rest/v1/rpc/commit_map_reveal_mask');await page.getByRole('button',{name:'Discard reveal draft'}).click();
 await popup.close();await expect(page.getByRole('button',{name:'Open Party Display',exact:true})).toBeVisible();
 const reopen=page.waitForEvent('popup');await page.getByRole('button',{name:'Open Party Display',exact:true}).click();popup=await reopen;await expect(popup.locator('canvas')).toBeVisible();expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
 // Genuine private-map known-version reads remain denied to the Player.
 const denied=await page.evaluate(async({url,key,jwt})=>{const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(sdk.createClient(url,key,{accessToken:async()=>jwt}));try{await content.openMapVersion((window as any).liveMap.version.id);return false;}catch{return true;}},{url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,jwt:JSON.parse(process.env.MAP_DISPLAY_PLAYER_JWTS!)[index]});expect(denied).toBe(true);
 await page.evaluate(async({pdf})=>{const w=(window as any).liveMap;const item=await w.content.upload({requestId:crypto.randomUUID(),title:'Ticket10 PDF',file:new File([new Uint8Array(pdf)],'letter.pdf',{type:'application/pdf'})});await w.display.present(item);},{pdf:[...pdfFixture()]});
 await expect(popup.getByLabel('Party Display page 1')).toBeVisible();await page.getByRole('button',{name:'Display next page',exact:true}).click();await expect(popup.getByLabel('Party Display page 2')).toBeVisible();
 const revision=accepted.presentation.revision;await page.getByRole('button',{name:'Use saved live map'}).click();await expect(popup.getByLabel('Uncovered Grid Map on Party Display')).toBeVisible();expect(await pixel(popup,.5,.5)).toEqual([0,0,0,255]);
 expect((await page.evaluate(()=>(window as any).liveMap.content.readMapWorkspace())).presentation.revision).toBeGreaterThan(revision);
 await page.screenshot({path:info.outputPath('live-dm-controls.png'),fullPage:true});await popup.screenshot({path:info.outputPath('live-visible-display.png')});
 // Actual owned membership revocation is observed by the genuine authority read.
 const owned=JSON.parse(process.env.MAP_DISPLAY_OWNED!)[index];
 for(const id of [owned.party,owned.dm])expect(id).toMatch(/^[0-9a-f-]{36}$/);
 sql(`delete from public.party_members where party_id='${owned.party}' and user_id='${owned.dm}';`);
 await expect(popup.locator('canvas')).toHaveCount(0);
 await page.evaluate(()=>(window as any).liveMap.display.dispose());
});
