import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const config=(jwt:string)=>({url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,jwt,server:'http://127.0.0.1:49176',familyId:randomUUID(),requestId:randomUUID()});
async function connect(page:any,c:any){await page.goto('tests/harness/map-generation.html');await page.waitForFunction(()=>typeof (window as any).configure==='function');await page.evaluate(c=>(window as any).configure(c),c);}
for(const viewport of [{name:'laptop',width:1440,height:900},{name:'phone',width:390,height:844}]){
 test(`${viewport.name}: real DM fixture progress, output and reload/recovery through PartyContent`,async({page})=>{
  await page.setViewportSize(viewport);const c=config(JSON.parse(process.env.MAP_LIVE_DM_JWTS!)[viewport.name==='laptop'?0:2]);await connect(page,c);
  await page.getByRole('button',{name:'Create fixture'}).click();await expect(page.locator('#status')).toContainText('awaiting-client-output');await expect(page.locator('#status')).toContainText('fixture');
  await page.reload();await page.waitForFunction(()=>typeof (window as any).configure==='function');await page.evaluate(c=>(window as any).configure(c),c);
  await page.getByRole('button',{name:'Reconcile',exact:true}).click();await expect(page.locator('#status')).toContainText('awaiting-client-output');
  await page.getByRole('button',{name:'Save fixture output'}).click();await expect(page.locator('#status')).toContainText('completed');
  await page.getByRole('button',{name:'Reconcile',exact:true}).click();await expect(page.locator('#status')).toContainText('completed');
  const workspace=await page.evaluate(()=>(window as any).content.readMapWorkspace());expect(workspace.versions).toHaveLength(1);expect(workspace.presentation.version).toBeNull();expect(workspace.jobs.some((j:any)=>j.id===c.requestId&&j.state==='completed')).toBe(true);
  await page.getByRole('button',{name:'Create fixture'}).focus();await page.keyboard.press('Enter');await expect(page.locator('#status')).toContainText('completed');
 });
 test(`${viewport.name}: real DM cancellation retains existing saved versions`,async({page})=>{
  await page.setViewportSize(viewport);const c=config(JSON.parse(process.env.MAP_LIVE_DM_JWTS!)[viewport.name==='laptop'?1:3]);await connect(page,c);await page.getByRole('button',{name:'Create fixture'}).click();await expect(page.locator('#status')).toContainText('awaiting-client-output');
  const before=await page.evaluate(()=>(window as any).content.readMapWorkspace());await page.getByRole('button',{name:'Cancel job'}).click();await expect(page.locator('#status')).toContainText('cancelled');
  await page.getByRole('button',{name:'Reconcile',exact:true}).click();await expect(page.locator('#status')).toContainText('cancelled');const after=await page.evaluate(()=>(window as any).content.readMapWorkspace());expect(after.versions.length).toBe(before.versions.length);expect(after.presentation).toEqual(before.presentation);
 });
}
test('real Player and anonymous receive bounded denial and no private objects/jobs',async({page})=>{
 for(const jwt of [process.env.MAP_LIVE_PLAYER_JWT!,process.env.MAP_LIVE_KEY!]){const c=config(jwt);await connect(page,c);await page.getByRole('button',{name:'Create fixture'}).click();await expect(page.locator('#status')).toContainText('access-denied');}
});

test('private fresh-stage ingress rejects client proof and forged nonce even with DM JWT',async({request})=>{
 const jwt=JSON.parse(process.env.MAP_LIVE_DM_JWTS!)[0];
 const result=await request.post('http://127.0.0.1:49176/internal-verifier',{headers:{Authorization:'Bearer '+jwt,'X-Verifier-Token':'forged','X-Internal-Stage':'finalize','X-Internal-Proof':'{}'},data:new Uint8Array([1,2,3])});expect(result.status()).toBe(403);expect(await result.text()).toBe('Denied');
 const publicResult=await request.post('http://127.0.0.1:49176/',{headers:{Authorization:'Bearer '+jwt,'X-Map-Passed':'true'},data:{kind:'read',requestId:randomUUID()}});expect(publicResult.status()).toBe(422);expect(await publicResult.json()).toEqual({ok:false,code:'invalid-command'});
});

test('late receipt: timed-out reconciliation cannot save retained valid PNG or switch display',async({page})=>{
 const c=config(process.env.MAP_LIVE_LATE_JWT!);await connect(page,c);await page.getByRole('button',{name:'Create fixture'}).click();await expect(page.locator('#status')).toContainText('uncertain');
 const job=JSON.parse(await page.locator('#status').innerText()).job;
 // This owned fixture has a1second server receipt window. Wait for its real
 // deadline without invoking reconciliation early enough to accept the receipt.
 await expect.poll(()=>Date.now(),{intervals:[100],timeout:5000}).toBeGreaterThan(Date.parse(job.createdAt)+1100);
 await page.getByRole('button',{name:'Reconcile',exact:true}).click();await expect(page.locator('#status')).toContainText('provider-timeout');await expect(page.locator('#status')).toContainText('failed');
 await page.getByRole('button',{name:'Save fixture output'}).click();await expect(page.locator('#status')).toContainText('unavailable');
 const workspace=await page.evaluate(()=>(window as any).content.readMapWorkspace());expect(workspace.versions).toHaveLength(0);expect(workspace.presentation.version).toBeNull();expect(workspace.jobs.find((j:any)=>j.id===c.requestId).state).toBe('failed');
});

test('laptop: saved artwork reference checks owned claim after fresh source inspection',async({page})=>{
 const c=config(JSON.parse(process.env.MAP_LIVE_DM_JWTS!)[0]);await connect(page,c);await page.getByRole('button',{name:'Create fixture'}).click();await expect(page.locator('#status')).toContainText('awaiting-client-output');await page.getByRole('button',{name:'Save fixture output'}).click();await expect(page.locator('#status')).toContainText('completed');
 const before=await page.evaluate(()=>(window as any).content.readMapWorkspace());const requestId=randomUUID();const reference={...c,requestId,intent:{requestId,familyId:c.familyId,parentVersionId:c.requestId,expectedVersion:1,kind:'reference',source:'artwork',title:'Saved reference fixture',instructions:'Sea cave'}};
 await connect(page,reference);await page.getByRole('button',{name:'Create fixture'}).click();await expect(page.locator('#status')).toContainText('awaiting-client-output');await page.getByRole('button',{name:'Save fixture output'}).click();await expect(page.locator('#status')).toContainText('completed');
 await page.reload();await page.waitForFunction(()=>typeof (window as any).configure==='function');await page.evaluate(c=>(window as any).configure(c),reference);await page.getByRole('button',{name:'Reconcile',exact:true}).click();await expect(page.locator('#status')).toContainText('completed');
 const after=await page.evaluate(()=>(window as any).content.readMapWorkspace());expect(after.versions).toHaveLength(2);expect(after.versions.some((v:any)=>v.id===c.requestId)).toBe(true);expect(after.presentation).toEqual(before.presentation);
});
