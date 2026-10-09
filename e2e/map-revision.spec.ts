import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sql } from '../scripts/local-verification.mjs';
import { deflateSync } from 'node:zlib';
import { crc, decode } from '../supabase/functions/map-generation/verifier/png.mjs';
test.beforeEach(async({page})=>{page.on('response',async response=>{if(response.status()>=400){let code='';try{const body=await response.json();code=body.code??body.message??'';}catch{}console.log(JSON.stringify({event:'http-error',path:new URL(response.url()).pathname,status:response.status(),code}));}});});
const candidate = readFileSync('.scratch/map-creation/provider-evidence/live-1791537498387/sea-cave-raw.png');
const config = (index: number) => ({ url: process.env.MAP_LIVE_URL!, key: process.env.MAP_LIVE_KEY!, jwt: JSON.parse((process.env.MAP_REVISION_DM_JWTS ?? process.env.MAP_LIVE_DM_JWTS)!)[index], server: process.env.MAP_FIXTURE_SERVER ?? 'http://127.0.0.1:49178' });
async function connect(page: Page, index: number) {
  await page.goto('tests/harness/map-workshop.html');
  await page.waitForFunction(() => typeof (window as any).configure === 'function');
  await page.evaluate(c => (window as any).configure(c), config(index));
  await expect(page.getByRole('heading', { name: 'Map creation workshop' })).toBeVisible();
}
const workspace = (page: Page) => page.evaluate(() => (window as any).content.readMapWorkspace());
function chunk(type: string, body: Uint8Array) { const bytes = Buffer.alloc(body.length + 12); bytes.writeUInt32BE(body.length); bytes.write(type, 4); bytes.set(body, 8); bytes.writeUInt32BE(crc(bytes.subarray(4, -4)), bytes.length - 4); return bytes; }
function artwork(channels: 3 | 4) {
  const raw = Buffer.alloc((1024 * channels + 1) * 1024), header = Buffer.alloc(13); header.writeUInt32BE(1024); header.writeUInt32BE(1024, 4); header[8] = 8; header[9] = channels === 4 ? 6 : 2;
  for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) { const i = y * (1024 * channels + 1) + 1 + x * channels; raw[i] = x & 255; raw[i + 1] = y & 255; raw[i + 2] = (x ^ y ^ 67) & 255; if(channels === 4) raw[i + 3] = (x+y)%3 === 0 ? 0 : (x+y)&255; }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
async function upload(page: Page, bytes: Buffer) {
  await page.getByLabel('Upload finished artwork').setInputFiles({ name: 'source.png', mimeType: 'image/png', buffer: bytes });
  await expect(page.getByRole('status').first()).toContainText('Artwork saved privately', { timeout: 30000 });
}
async function chooseArea(page: Page) {
  const svg = page.getByRole('img', { name: 'Area selection surface' });
  await svg.evaluate(svg => { const container=svg.parentElement!; container.scrollIntoView({block:'center'}); container.scrollTop=0; container.scrollLeft=64; });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const points = await svg.evaluate((svg: SVGSVGElement) => { const matrix = svg.getScreenCTM()!; return [{x:4,y:3},{x:6,y:5}].map(p=>{const s=new DOMPoint(p.x,p.y).matrixTransform(matrix);return{x:s.x,y:s.y};}); });
  if((page.viewportSize()?.width ?? 1440) < 600) {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[1],id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
  } else { await page.mouse.move(points[0].x, points[0].y); await page.mouse.down(); await page.mouse.move(points[1].x, points[1].y, {steps:5}); await page.mouse.up(); }
  await expect(page.getByRole('button', { name: 'Clear selected area' })).toBeEnabled();
}
async function request(page: Page) {
  await page.getByLabel('Selected-area instructions').fill('Add a chamber inside this rectangle');
  await page.getByRole('button', { name: 'Create selected-area revision' }).click();
  await expect(page.getByRole('button', { name: 'Save completed artwork' }).last()).toBeVisible({timeout:30000});
  const job = (await workspace(page)).jobs.find((j:any)=>j.state==='awaiting-client-output');
  return await page.evaluate(async id => (await(window as any).content.changeMapGeneration({kind:'read',requestId:id})).job,job.id);
}
async function save(page: Page) { await page.getByRole('button', { name: 'Save completed artwork' }).last().click(); await expect(page.getByRole('status').first()).toContainText('Saved privately', {timeout:30000}); }
for(const [name,width,height,index,channels] of [['laptop',1440,900,0,3],['phone',390,844,2,4]] as const) test(`${name}: aligned selected-area output has exact outside/inside pixels, parent comparison and older branching`, async({page})=>{
  await page.setViewportSize({width,height}); await connect(page,index); await upload(page,artwork(channels));
  await page.getByLabel('Artwork scale',{exact:true}).fill('0.5'); await page.getByLabel('Artwork horizontal position').fill('2');
  await page.getByRole('button',{name:'Save alignment as version'}).click(); await expect(page.getByRole('status').first()).toContainText('Artwork saved privately');
  const before=await workspace(page), parent=before.versions.at(-1);
  await page.getByLabel('Artwork horizontal position').fill('7'); // draft differs; selection uses savedx2.
  await page.getByLabel('Selection zoom').fill('1.5');
  await chooseArea(page);
  await page.getByRole('button',{name:'Clear selected area'}).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('button',{name:'Clear selected area'})).toBeDisabled(); await chooseArea(page);
  const job=await request(page); expect(job.originalIntent.parentVersionId).toBe(parent.id); expect(job.originalIntent.kind).toBe('revise');
  // Full-frame drift/wrong mask cannot bypass authoritative proof.
  const rejected=await page.evaluate(async id=>{const input=await(window as any).content.openMapGenerationInput(id);return(window as any).content.changeMapGeneration({kind:'output',requestId:id,file:input.candidate});},job.id);
  expect(rejected.ok).toBe(false); expect(rejected.code).toBe('output-pixels-mismatch'); await save(page);
  const after=await workspace(page), revised=after.versions.at(-1);
  expect(after.versions).toHaveLength(3); expect(revised.parentVersionId).toBe(parent.id); expect(revised.origin).toBe('revised'); expect(revised.background.registration).toBe(parent.background.registration); expect(revised.background.pixelWidth).toBe(1024); expect(revised.background.x).toBe(parent.background.x); expect(after.presentation).toEqual(before.presentation);
  await expect(page.getByRole('combobox',{name:'Compare versions',exact:true})).toHaveValue(parent.id);
  const output=await page.evaluate(async id=>[...new Uint8Array(await(await(window as any).content.openMapVersion(id)).arrayBuffer())],revised.id);
  const original=await decode(new Uint8Array(artwork(channels))), replacement=await decode(new Uint8Array(candidate)), accepted=await decode(Uint8Array.from(output)),r=job.originalIntent.region;
  let outside=0,inside=0,mismatch=0;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){const selected=x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;if(selected)inside++;else outside++;const expected=selected?replacement:original,offset=(y*1024+x)*4;for(let c=0;c<4;c++)if(accepted[offset+c]!==expected[offset+c])mismatch++;}
  expect(mismatch).toBe(0); console.log(JSON.stringify({name,outside,inside,mismatch,region:r,registrationPreserved:true,sourceId:parent.id,acceptedId:revised.id}));
  await page.getByRole('button',{name:/Inspect version 2/}).click(); await chooseArea(page); const branch=await request(page); expect(branch.originalIntent.parentVersionId).toBe(parent.id); await save(page); const branched=await workspace(page); expect(branched.versions).toHaveLength(4);
  await connect(page,index); await page.getByLabel('Map family').selectOption(branched.families[0].id); await page.getByRole('button',{name:/Inspect version 4/}).click();
  await expect(page.getByRole('button',{name:'Try another version'})).toBeEnabled(); await page.getByRole('button',{name:'Try another version'}).click();
  await expect(page.getByRole('button',{name:'Save completed artwork'})).toBeVisible({timeout:30000});
  const pending=(await workspace(page)).jobs.find((j:any)=>j.state==='awaiting-client-output'); const reloaded=await page.evaluate(async id=>(await(window as any).content.changeMapGeneration({kind:'read',requestId:id})).job,pending.id);
  expect(reloaded.originalIntent.region).toEqual(branch.originalIntent.region); expect(reloaded.originalIntent.parentVersionId).toBe(parent.id); await save(page); expect((await workspace(page)).versions).toHaveLength(5);
});

function ownedJob(id:string) { expect(id).toMatch(/^[a-f0-9-]{36}$/); return id; }
async function holdWorker(page:Page) {
  await page.evaluate(()=>{
    const Native=window.Worker;
    (window as any).nativeWorker=Native;
    (window as any).workerTerminated=0;
    (window as any).Worker=class extends Native {
      postMessage(){(window as any).workerStarted=true;}
      terminate(){(window as any).workerTerminated++;super.terminate();}
    };
  });
}
test('selected-area cancel terminates assembly; retry reconciles the original area with a new request',async({page})=>{
  await connect(page,1); await upload(page,artwork(4)); await chooseArea(page); const job=await request(page),before=await workspace(page);
  await holdWorker(page); await page.getByRole('button',{name:'Save completed artwork'}).click(); await page.waitForFunction(()=>(window as any).workerStarted);
  await page.locator(`[data-job-id="${job.id}"]`).getByRole('button',{name:'Cancel creation'}).click();
  await page.waitForFunction(()=>(window as any).workerTerminated===1);
  await expect(page.locator(`[data-job-id="${job.id}"]`)).toContainText('cancelled'); expect((await workspace(page)).versions).toEqual(before.versions); expect((await workspace(page)).presentation).toEqual(before.presentation);
  // The accepted timely receipt permits immediate retry under the original unmodified deadline.
  await page.evaluate(()=>{window.Worker=(window as any).nativeWorker;});
  await page.getByRole('button',{name:'Retry creation'}).click(); await expect(page.getByRole('button',{name:'Save completed artwork'})).toBeVisible({timeout:30000});
  const next=(await workspace(page)).jobs.find((j:any)=>j.state==='awaiting-client-output'); expect(next.id).not.toBe(job.id);
  const retry=await page.evaluate(async id=>(await(window as any).content.changeMapGeneration({kind:'read',requestId:id})).job,next.id);
  expect(retry.originalIntent.region).toEqual(job.originalIntent.region); expect(retry.originalIntent.parentVersionId).toBe(job.originalIntent.parentVersionId); await save(page); expect((await workspace(page)).versions).toHaveLength(2);
});
test('expired selected-area proof and stale parent never attach or replace presentation',async({page})=>{
  await connect(page,3); await upload(page,artwork(3)); await chooseArea(page); const job=await request(page),before=await workspace(page);
  sql(`update public.party_map_generation_jobs set proof=jsonb_set(proof,'{expiresAt}','0'::jsonb) where id='${ownedJob(job.id)}';`);
  await page.getByRole('button',{name:'Save completed artwork'}).click(); await expect(page.getByRole('alert')).toContainText('retained'); expect((await workspace(page)).versions).toEqual(before.versions); expect((await workspace(page)).presentation).toEqual(before.presentation);
  await page.locator(`[data-job-id="${job.id}"]`).getByRole('button',{name:'Cancel creation'}).click();
  await page.getByRole('button',{name:'Retry creation'}).click(); await expect(page.getByRole('button',{name:'Save completed artwork'})).toBeVisible({timeout:30000});
  await upload(page,artwork(4)); const fresh=await workspace(page);
  await page.getByRole('button',{name:'Save completed artwork'}).click(); await expect(page.getByRole('alert')).toContainText('retained'); expect((await workspace(page)).versions).toEqual(fresh.versions); expect((await workspace(page)).presentation).toEqual(before.presentation);
});
test('assembly timeout and controller replacement terminate workers without output or a new version',async({page})=>{
  await connect(page,5); await upload(page,artwork(4)); await chooseArea(page); await request(page); const before=await workspace(page);
  await holdWorker(page); await page.clock.install(); await page.getByRole('button',{name:'Save completed artwork'}).click(); await page.waitForFunction(()=>(window as any).workerStarted);
  await page.clock.fastForward(30001); await expect(page.getByRole('alert')).toContainText('timed out'); await page.waitForFunction(()=>(window as any).workerTerminated===1); expect((await workspace(page)).versions).toEqual(before.versions);
  await page.evaluate(()=>{(window as any).workerStarted=false;}); await page.getByRole('button',{name:'Save completed artwork'}).click(); await page.waitForFunction(()=>(window as any).workerStarted);
  await page.evaluate(c=>(window as any).configure(c),config(6)); await page.waitForFunction(()=>(window as any).workerTerminated===2); expect((await workspace(page)).versions).toHaveLength(0);
});

test('phone multi-touch cannot replace primary rectangle and cancelled gestures clear the draft',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await connect(page,7); await upload(page,artwork(4));
  const svg=page.getByRole('img',{name:'Area selection surface'}); await svg.evaluate(svg=>svg.parentElement!.scrollIntoView({block:'center'}));
  const points=await svg.evaluate((svg:SVGSVGElement)=>[{x:4,y:3},{x:6,y:5},{x:5,y:4}].map(p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM()!);return{x:q.x,y:q.y};}));
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1},{...points[2],id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[1],id:1},{...points[2],id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{...points[2],id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.getByRole('button',{name:'Clear selected area'})).toBeEnabled();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...points[0],id:1}]}); await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[1],id:1}]}); await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await expect(page.getByRole('button',{name:'Clear selected area'})).toBeDisabled(); await cdp.detach(); expect((await workspace(page)).versions).toHaveLength(1);
});

test('whole-map original intent restores after inspection and recoverable read failure without changing its source',async({page})=>{
  await connect(page,8); await page.getByLabel('Map description').fill('An overhead cave'); await page.getByRole('button',{name:'Create map',exact:true}).click(); await expect(page.getByRole('button',{name:'Save completed artwork'})).toBeVisible({timeout:30000}); await save(page);
  const before=await workspace(page), first=before.versions[0];
  await upload(page,artwork(3));
  // Labelled one-shot transport failure, while subsequent commands use real local authority.
  await page.evaluate(id=>{const content=(window as any).content, original=content.changeMapGeneration.bind(content); let failed=false; content.changeMapGeneration=(command:any)=>{if(!failed && command.kind==='read' && command.requestId===id){failed=true;return Promise.resolve({ok:false,code:'fixture-read-unavailable'});}return original(command);};},first.requestId);
  await page.getByRole('button',{name:/Inspect version 1/}).click(); await expect(page.getByRole('alert')).toContainText('Refresh progress');
  await page.locator(`[data-job-id="${first.requestId}"]`).getByRole('button',{name:'Refresh progress'}).click(); await expect(page.getByRole('button',{name:'Try another version'})).toBeEnabled();
  await page.getByRole('button',{name:'Try another version'}).click(); await expect(page.getByRole('button',{name:'Save completed artwork'})).toBeVisible({timeout:30000});
  const pending=(await workspace(page)).jobs.find((j:any)=>j.state==='awaiting-client-output'); const restored=await page.evaluate(async id=>(await(window as any).content.changeMapGeneration({kind:'read',requestId:id})).job,pending.id);
  expect(restored.originalIntent.kind).toBe('generate'); expect(restored.originalIntent.parentVersionId).toBeUndefined(); expect(restored.originalIntent.instructions).toBe(first.instructions); await save(page); expect((await workspace(page)).versions).toHaveLength(3); expect((await workspace(page)).presentation).toEqual(before.presentation);
});
