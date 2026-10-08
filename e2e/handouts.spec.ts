import { test, expect } from '@playwright/test';
import { png, pdfFixture } from './handout-fixtures';
async function enter(page: import('@playwright/test').Page, role='Dungeon Master') {
  await page.goto('./'); await page.getByRole('button',{name:new RegExp(`^${role} `)}).click(); await page.getByLabel('Shared password').fill(role==='Dungeon Master'?'dm-password':'player-password'); await page.getByRole('button',{name:'Enter the Party'}).click();
}
test('DM upload, private thumbnail, search/filter, title edit and reload preserve character dashboard', async ({page}) => {
  await enter(page); await expect(page.getByRole('heading',{name:'The Party',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Secret letter'); await page.getByLabel('File',{exact:true}).setInputFiles({name:'letter.png',mimeType:'image/png',buffer:png}); await page.getByRole('button',{name:'Save private Handout'}).click();
  await expect(page.getByRole('main').getByRole('status').filter({hasText:'Saved privately'})).toContainText('Saved privately'); await expect(page.getByRole('img',{name:'Handout preview'})).toBeVisible();
  await page.getByLabel('Visibility').selectOption('revealed'); await expect(page.getByText('No Handouts match this view.')).toBeVisible(); await page.getByLabel('Visibility').selectOption('private');
  await page.getByLabel('Search Handouts').fill('absent'); await expect(page.getByText('No Handouts match this view.')).toBeVisible(); await page.getByLabel('Search Handouts').fill('secret');
  await page.getByRole('button',{name:/Secret letter Private/}).click(); await expect(page.getByRole('img',{name:'Handout content'})).toBeVisible();
  await page.getByLabel('Handout title').fill('Captain letter'); await page.getByRole('button',{name:'Save title'}).click(); await expect(page.getByRole('heading',{name:'Captain letter'})).toBeVisible();
  await page.reload(); await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click(); await page.getByRole('button',{name:/Captain letter Private/}).click(); await expect(page.getByRole('img',{name:'Handout content'})).toBeVisible();
  await page.getByRole('button',{name:'Back to Library',exact:true}).click(); await expect(page.getByLabel('File',{exact:true})).toHaveValue(''); await page.getByLabel('Title',{exact:true}).fill('Same source again'); await page.getByLabel('File',{exact:true}).setInputFiles({name:'letter.png',mimeType:'image/png',buffer:png}); await page.getByRole('button',{name:'Save private Handout'}).click(); await expect(page.getByRole('main').getByRole('status').filter({hasText:'Saved privately'})).toContainText('Saved privately: Same source again');
  await page.getByRole('button',{name:'Back to Party',exact:true}).click(); await expect(page.getByRole('heading',{name:'The Party',exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('complete PDF has private first page thumbnail, reopens after reload and pages render independently', async ({page},info) => {
  await enter(page); await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click();
  await page.getByLabel('Title',{exact:true}).fill('Two-page letter'); await page.getByLabel('File',{exact:true}).setInputFiles({name:'letter.pdf',mimeType:'application/pdf',buffer:pdfFixture()}); await page.getByRole('button',{name:'Save private Handout'}).click(); await expect(page.getByRole('main').getByRole('status').filter({hasText:'Saved privately'})).toContainText('Saved privately');
  await expect(page.getByLabel('PDF first page preview')).toBeVisible(); await page.reload(); await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click(); await page.getByRole('button',{name:/Two-page letter Private/}).click(); await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button',{name:'Next page'}).click(); await expect(page.getByLabel('PDF page 2')).toBeVisible(); await expect.poll(() => page.getByLabel('PDF page 2').evaluate(element => { const canvas=element as HTMLCanvasElement; return Array.from(canvas.getContext('2d')!.getImageData(40,300,1,1).data).slice(0,3); })).toEqual([255,0,0]); await page.screenshot({path: info.outputPath('handouts.spec.png'),fullPage:true}); await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await page.getByRole('button',{name:'Previous page'}).click(); await expect(page.getByLabel('PDF page 1')).toBeVisible();
});
test('module validates corrupt/type/size/title, duplicate retries, local failure rollback and Player/anonymous authority', async ({page}) => {
  await page.goto('./');
  const result = await page.evaluate(async ({image,pdf}) => {
    const path='/the-drowned-compass/src/data/in-memory-party-data.ts'; const data=(await import(path)).createInMemoryPartyData(); await data.signIn('dungeon-master','dm-password');
    const input={requestId:crypto.randomUUID(),title:'Private',file:new File([new Uint8Array(image)],'letter.png',{type:'image/png'})};
    const first=await data.content.upload(input); const retry=await data.content.upload(input); const errors=[];
    for (const file of [new File(['bad'],'bad.png',{type:'image/png'}),new File(['%PDF-1.7\ncorrupt\n%%EOF'],'bad.pdf',{type:'application/pdf'}),new File(['x'],'bad.svg',{type:'image/svg+xml'}),new File([new Uint8Array(20*1024*1024+1)],'big.png',{type:'image/png'}),new File([],'empty.png',{type:'image/png'})]) { try { await data.content.upload({...input,requestId:crypto.randomUUID(),file}); } catch (error) { errors.push((error as Error).message); } }
    try { await data.content.upload({...input,requestId:crypto.randomUUID(),title:' '.repeat(3)}); } catch(error) { errors.push((error as Error).message); }
    const original=IDBObjectStore.prototype.add; IDBObjectStore.prototype.add=function(...args: Parameters<IDBObjectStore['add']>){ if(this.name==='content')throw new DOMException('Quota exceeded','QuotaExceededError');return original.apply(this,args); };
    const failed={...input,requestId:crypto.randomUUID(),title:'Retry'}; try { await data.content.upload(failed); } catch { errors.push('write-failed'); } finally { IDBObjectStore.prototype.add=original; }
    const afterFailure=(await data.content.list()).length; await data.content.upload(failed);
    const complete=await data.content.upload({...input,requestId:crypto.randomUUID(),title:'PDF',file:new File([new Uint8Array(pdf)],'letter.pdf',{type:'application/pdf'})}); const reopened=await data.content.open(complete.id);
    await data.signIn('player','player-password');localStorage.setItem('drowned-compass-session-role','dungeon-master'); const denied=[];
    const privateList=await data.content.list();denied.push(privateList.length===0);const writeDenials:string[]=[];
    for (const action of [()=>data.content.open(first.id),()=>data.content.change({id:first.id,expectedVersion:first.version,requestId:crypto.randomUUID(),command:{kind:'rename',title:'Leak'}}),()=>data.content.upload({...input,requestId:crypto.randomUUID()})])try{await action();}catch(error){denied.push(true);writeDenials.push((error as Error).message);}
    await data.signOut();try{await data.content.open(first.id);}catch{denied.push(true);}
    return {same:first.id===retry.id,errors,afterFailure,pdfSize:reopened.size,denied,writeDenials};
  },{image:Array.from(png),pdf:Array.from(pdfFixture())});
  expect(result.same).toBe(true);expect(result.errors).toHaveLength(7);expect(result.afterFailure).toBe(1);expect(result.pdfSize).toBe(pdfFixture().length);expect(result.denied).toEqual([true,true,true,true,true]);expect(result.writeDenials.slice(1)).toEqual(['Dungeon Master access is required. Sign in again to open your Library.','Dungeon Master access is required. Sign in again to open your Library.']);
});
test('Player has only Party Library navigation', async ({page}) => {await enter(page,'Player');await expect(page.getByRole('heading',{name:'The Party',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Dungeon Master Library',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Party Library',exact:true})).toBeVisible();});
test('real Supabase content adapter commits usable files, handles failed upload and ambiguous retry without duplicates', async ({page}) => {
  test.skip(!process.env.HANDOUT_LIVE_URL,'Run scripts/verify-handout-storage.mjs for disposable local Supabase credentials.');
  await page.goto('./');
  const result=await page.evaluate(async ({url,key,jwt,image,pdf}) => {
    const path='/the-drowned-compass/src/data/supabase-party-content.ts';const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>jwt});
    const content=(await import(path)).supabasePartyContent(client);const input={requestId:crypto.randomUUID(),title:'Adapter verify',file:new File([new Uint8Array(image)],'letter.png',{type:'image/png'})};
    const original=window.fetch;let failUpload=true;window.fetch=async(...args)=>{const resource=String(args[0] instanceof Request?args[0].url:args[0]);if(failUpload&&resource.includes('/storage/v1/object/party-handouts/')&&args[1]?.method==='POST'){failUpload=false;throw new TypeError('Connection lost');}return original(...args);};
    let failure=false;try{await content.upload(input);}catch{failure=true;}finally{window.fetch=original;}const absent=!(await content.list()).some((item: {id:string})=>item.id===input.requestId);
    // Lose the insert response after the server accepts metadata; adapter reconciles.
    let loseResponse=true;window.fetch=async(...args)=>{const response=await original(...args);const resource=String(args[0] instanceof Request?args[0].url:args[0]);if(loseResponse&&resource.includes('/rest/v1/party_handouts')&&args[1]?.method==='POST'){loseResponse=false;throw new TypeError('Response lost');}return response;};
    let first;try{first=await content.upload(input);}finally{window.fetch=original;}const retry=await content.upload(input);const blob=await content.open(first.id);const renamed=await content.change({id:first.id,expectedVersion:first.version,requestId:crypto.randomUUID(),command:{kind:'rename',title:'Renamed adapter verify'}});const rows=(await content.list()).filter((item:{id:string})=>item.id===first.id);
    const copied={...input,requestId:crypto.randomUUID(),title:'Adapter verify'};const concurrent=await Promise.all([content.upload(copied),content.upload(copied)]);
    const document=await content.upload({...input,requestId:crypto.randomUUID(),title:'Adapter verify',file:new File([new Uint8Array(pdf)],'map.pdf',{type:'application/pdf'})});const documentBlob=await content.open(document.id);let invalid=0;for(const file of [new File(['bad'],'bad.png',{type:'image/png'}),new File(['%PDF-1.7\ncorrupt\n%%EOF'],'bad.pdf',{type:'application/pdf'})])try{await content.upload({...input,requestId:crypto.randomUUID(),file});}catch{invalid++;}
    return {failure,absent,same:first.id===retry.id,size:blob.size,renamed:renamed.item.title,count:rows.length,concurrent:concurrent[0].id===concurrent[1].id,pdfSize:documentBlob.size,invalid};
  },{url:process.env.HANDOUT_LIVE_URL!,key:process.env.HANDOUT_LIVE_KEY!,jwt:process.env.HANDOUT_LIVE_DM_JWT!,image:Array.from(png),pdf:Array.from(pdfFixture())});
  expect(result).toEqual({failure:true,absent:true,same:true,size:png.length,renamed:'Renamed adapter verify',count:1,concurrent:true,pdfSize:pdfFixture().length,invalid:2});
});

test('invalid upload reports readable error, preserves draft, and allows corrected file retry',async({page})=>{
 await enter(page);await page.getByRole('button',{name:'Dungeon Master Library',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Retry letter');await page.getByLabel('File',{exact:true}).setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('corrupt')});await page.getByRole('button',{name:'Save private Handout'}).click();await expect(page.getByRole('alert')).toContainText('image contents');await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Retry letter');await expect(page.getByText('No Handouts match this view.')).toBeVisible();await page.getByLabel('File',{exact:true}).setInputFiles({name:'good.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Save private Handout'}).click();await expect(page.getByRole('main').getByRole('status').filter({hasText:'Saved privately'})).toContainText('Saved privately');await expect(page.getByRole('button',{name:/Retry letter Private/})).toHaveCount(1);
});
