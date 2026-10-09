import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generationApplication} from './application.mjs';
import {decode,prepareExpected,finalizeExpected,digest} from './verifier/png.mjs';
import {encodeMask} from './verifier/mask.mjs';
import {encodePng,decodePng} from '../../../.scratch/map-creation/provider-probe/png.mjs';
const inputBytes=new Uint8Array(readFileSync(new URL('../../../.scratch/map-creation/provider-evidence/live-1791537498387/sea-cave-input.png',import.meta.url)));
const candidate=new Uint8Array(readFileSync(new URL('../../../.scratch/map-creation/provider-evidence/live-1791537498387/added-chamber-raw.png',import.meta.url)));
const doc={columns:8,rows:6,feetPerSquare:5,terrain:[],edges:[]};
const intent=()=>({requestId:crypto.randomUUID(),familyId:crypto.randomUUID(),expectedVersion:0,kind:'generate',title:'Fixture only',instructions:'Sea cave',document:doc});
const bytesKey=r=>r.bucket+'/'+r.partyId+'/'+r.objectId;
async function fixture({response,providerOverride,verifierOverride,mode='fixture',clock=Date.now,deadlineMs=120000}={}){
 const jobs=new Map(),objects=new Map();let calls=0,completions=0,stale=false;
 const copy=v=>structuredClone(v);
 const store={async reserve(user,input){if(user!=='dm')throw Error('Dungeon Master access required');if(jobs.has(input.requestId)){const j=jobs.get(input.requestId);if(JSON.stringify(j.intent)!==JSON.stringify(input))throw Error('Request identity already used');return copy(j);}const j={id:input.requestId,party_id:'party',user_id:user,mode,state:'queued',revision:1,deadline:new Date(Date.now()+deadlineMs).toISOString(),created_at:new Date().toISOString(),intent:copy(input),binding:{document:doc,parent:input.parentVersionId??null,source:input.kind!=='generate'?{object_id:'saved-source',digest:await digest(inputBytes),size:inputBytes.length,mime:'image/png',x:1,y:0,width:6,height:6,pixelWidth:1024,pixelHeight:1024,registration:'source-registration'}:null,region:input.region??null}};jobs.set(j.id,j);return copy(j);},async read(user,id){if(user!=='dm')throw Error('Dungeon Master access required');return copy(jobs.get(id));},async transition(id,rev,state,patch){const j=jobs.get(id);if(j.revision!==rev||['completed','failed','cancelled'].includes(j.state))return copy(j);Object.assign(j,{state,provider_finished_at:state==='awaiting-client-output'&&!j.provider_finished_at?new Date().toISOString():j.provider_finished_at,revision:rev+1,...patch,submission_token:patch.submissionToken??j.submission_token});return copy(j);},async readObject(ref){const b=objects.get(bytesKey(ref));if(!b)throw Error('missing-object');return b.slice();},async writeObject(ref,bytes){if(!objects.has(bytesKey(ref)))objects.set(bytesKey(ref),bytes.slice());},async currentBinding(j){return stale?null:copy(j.binding);},async complete(j,proof,verified,background){const current=jobs.get(j.id);if(current.state==='cancelled'||current.revision!==j.revision||stale||!current.provider_finished_at||Date.parse(current.provider_finished_at)>Date.parse(current.deadline))throw Error('cancelled-or-stale');if(current.state!=='completed'){current.state='completed';current.revision++;current.result={background};completions++;}return copy(current);}};
 objects.set('party-handouts/party/saved-source',inputBytes);
 const verifier=verifierOverride??{inspect:decode,prepare:prepareExpected,finalize:finalizeExpected};
 const provider=providerOverride??{async generate(){calls++;return response??{kind:'image',bytes:candidate};},async reconcile(){return {kind:'uncertain'};}};
 const app=generationApplication({store,provider,verifier,mode,now:clock});return {app,jobs,objects,store,get calls(){return calls;},get completions(){return completions;},set stale(v){stale=v;}};
}
test('DM submission/reload/output/recovery preserves a single version and re-reads stored output',async()=>{
 const f=await fixture(),i=intent(),a=await f.app.execute('dm',{kind:'submit',intent:i});assert.equal(a.job.state,'awaiting-client-output');assert.equal(a.job.mode,'fixture');assert.equal(f.calls,1);
 const reload=await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(reload.job.state,'awaiting-client-output');
 const result=await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate});assert.equal(result.job.state,'completed');assert.equal(f.completions,1);
 const recovered=await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(recovered.job.state,'completed');assert.equal(f.completions,1);
 f.objects.set('party-handouts/party/'+i.requestId,inputBytes);assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:i.requestId}),{ok:false,code:'immutable-object-mismatch'});
});
test('player and anonymous cannot submit/read/open/cancel/output',async()=>{
 const f=await fixture(),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});
 for(const user of ['player','anon'])for(const command of [{kind:'submit',intent:intent()},{kind:'read',requestId:i.requestId},{kind:'open-candidate',requestId:i.requestId},{kind:'cancel',requestId:i.requestId},{kind:'output',requestId:i.requestId,bytes:candidate}])assert.equal((await f.app.execute(user,command)).code,'access-denied');assert.equal(f.calls,1);
});
test('simultaneous duplicate submit has exactly one provider submission',async()=>{
 const f=await fixture(),i=intent();const outcomes=await Promise.all([f.app.execute('dm',{kind:'submit',intent:i}),f.app.execute('dm',{kind:'submit',intent:i})]);assert.equal(f.calls,1);assert.ok(outcomes.every(r=>r.ok));
 assert.equal((await f.app.execute('dm',{kind:'submit',intent:{...i,instructions:'different'}})).code,'request-conflict');
});
test('uncertain submission is reconciled without paid resubmission',async()=>{
 const f=await fixture({response:{kind:'uncertain'}}),i=intent();assert.equal((await f.app.execute('dm',{kind:'submit',intent:i})).job.state,'uncertain');
 for(let n=0;n<3;n++)assert.equal((await f.app.execute('dm',{kind:'submit',intent:i})).job.state,'uncertain');assert.equal(f.calls,1);
});
test('cancel while provider running rejects late candidate and any output',async()=>{
 let release,submitted;const started=new Promise(r=>submitted=r),pending=new Promise(r=>release=r);
 const f=await fixture({providerOverride:{async generate(){submitted();return pending;},async reconcile(){return {kind:'uncertain'};}}}),i=intent();
 const submission=f.app.execute('dm',{kind:'submit',intent:i});await started;assert.equal((await f.app.execute('dm',{kind:'cancel',requestId:i.requestId})).job.state,'cancelled');release({kind:'image',bytes:candidate});assert.equal((await submission).job.state,'cancelled');assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).job.state,'cancelled');assert.equal(f.completions,0);
});
test('cancel between pixel verification and atomic attach rejects attachment',async()=>{
 let f;const verifier={inspect:decode,prepare:prepareExpected,async finalize(...args){const verified=await finalizeExpected(...args);const j=f.jobs.get(args[1]);j.state='cancelled';j.revision++;return verified;}};f=await fixture({verifierOverride:verifier});const i=intent();await f.app.execute('dm',{kind:'submit',intent:i});assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).ok,false);assert.equal(f.completions,0);
});
test('region branch accepts exact source/candidate pixels, retains registration, rejects tamper',async()=>{
 const f=await fixture(),i={...intent(),kind:'revise',parentVersionId:crypto.randomUUID(),expectedVersion:1,source:'artwork',region:{x:10,y:20,width:200,height:160}};delete i.document;
 const a=await f.app.execute('dm',{kind:'submit',intent:i});assert.equal(a.job.assembly.requiresSource,true);
 const src=await f.app.execute('dm',{kind:'open-source',requestId:i.requestId});assert.deepEqual(src.bytes,inputBytes);
 const source=decodePng(inputBytes),raw=decodePng(candidate),r=i.region;for(let y=r.y;y<r.y+r.height;y++){const at=(y*1024+r.x)*4;raw.rgba.copy(source.rgba,at,at,at+r.width*4);}const png=new Uint8Array(encodePng(source));
 const outcome=await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:png});assert.equal(outcome.job.state,'completed');assert.equal(f.jobs.get(i.requestId).result.background.registration,'source-registration');
 const b=await fixture(),j={...i,requestId:crypto.randomUUID()};await b.app.execute('dm',{kind:'submit',intent:j});source.rgba[0]^=1;assert.equal((await b.app.execute('dm',{kind:'output',requestId:j.requestId,bytes:new Uint8Array(encodePng(source))})).code,'output-pixels-mismatch');assert.equal(b.completions,0);
});
test('parent revision conflict, proof expiry, bad PNG and failed write preserve saved work',async()=>{
 const f=await fixture(),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});f.stale=true;assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).code,'stale-parent');assert.equal(f.completions,0);
 f.stale=false;f.jobs.get(i.requestId).proof.expiresAt=0;assert.equal((await f.app.execute('dm',{kind:'read',requestId:i.requestId})).code,'expired-output');
 const bad=await fixture({response:{kind:'image',bytes:new Uint8Array([1,2,3])}});const result=await bad.app.execute('dm',{kind:'submit',intent:intent()});assert.equal(result.job.state,'failed');assert.equal(bad.completions,0);
 const writes=await fixture();writes.store.writeObject=async()=>{throw Error('storage-unavailable');};const failed=await writes.app.execute('dm',{kind:'submit',intent:intent()});assert.equal(failed.job.state,'failed');assert.equal(writes.completions,0);
});
test('provider region mask is transparent inside and opaque outside',async()=>{const png=await encodeMask({x:10,y:20,width:200,height:160}),rgba=await decode(png);assert.equal(rgba[3],255);assert.equal(rgba[(20*1024+10)*4+3],0);assert.equal(rgba[(179*1024+209)*4+3],0);assert.equal(rgba[(180*1024+209)*4+3],255);});

test('server provider deadline permanently rejects late outcome, never automatic second submission',async()=>{
 let calls=0;const f=await fixture({deadlineMs:5,providerOverride:{async generate(){calls++;return new Promise(()=>{});},async reconcile(){return {kind:'uncertain'};}}});const i=intent();const result=await f.app.execute('dm',{kind:'submit',intent:i});assert.equal(result.job.state,'failed');assert.equal(result.job.code,'provider-timeout');await f.app.execute('dm',{kind:'submit',intent:i});assert.equal(calls,1);
});

test('invalid client assembly can retry same candidate/request without another provider call',async()=>{
 const f=await fixture(),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:inputBytes})).code,'output-pixels-mismatch');assert.equal(f.objects.has('party-handouts/party/'+i.requestId),false);assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).job.state,'completed');assert.equal(f.calls,1);assert.equal(f.completions,1);
});

test('unknown receipt arriving after deadline cannot produce proof, output or version',async()=>{
 let submissions=0,reconciliations=0;const f=await fixture({providerOverride:{async generate(){submissions++;return {kind:'uncertain'};},async reconcile(){reconciliations++;return {kind:'image',bytes:candidate};}}});const i=intent();assert.equal((await f.app.execute('dm',{kind:'submit',intent:i})).job.state,'uncertain');f.jobs.get(i.requestId).deadline=new Date(Date.now()-1000).toISOString();const late=await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(late.job.state,'failed');assert.equal(late.job.code,'provider-timeout');assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).job.state,'failed');assert.equal(f.jobs.get(i.requestId).proof,undefined);assert.equal(f.completions,0);assert.equal(submissions,1);assert.equal(reconciliations,0);
});
test('timely provider receipt permits24hour assembly/reload after provider deadline',async()=>{
 let advanced=0;const f=await fixture({clock:()=>Date.now()+advanced}),i=intent();assert.equal((await f.app.execute('dm',{kind:'submit',intent:i})).job.state,'awaiting-client-output');advanced=120001;assert.equal((await f.app.execute('dm',{kind:'read',requestId:i.requestId})).job.state,'awaiting-client-output');assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).job.state,'completed');assert.equal(f.completions,1);assert.equal(f.calls,1);
});

for(const boundary of ['deadline','cancel','membership'])test(`source inspection ${boundary} prevents provider submission`,async()=>{
 let f,advanced=0,denied=false;const verifier={inspect:async bytes=>{await decode(bytes);if(boundary==='deadline')advanced=120001;if(boundary==='cancel'){const j=[...f.jobs.values()][0];j.state='cancelled';j.revision++;}if(boundary==='membership')denied=true;},prepare:prepareExpected,finalize:finalizeExpected};
 f=await fixture({clock:()=>Date.now()+advanced,verifierOverride:verifier});const read=f.store.read;f.store.read=async(...args)=>{if(denied)throw Error('Dungeon Master access required');return read(...args);};
 const i={...intent(),kind:'reference',parentVersionId:crypto.randomUUID(),expectedVersion:1,source:'artwork'};delete i.document;
 const result=await f.app.execute('dm',{kind:'submit',intent:i});assert.equal(f.calls,0);assert.equal(f.completions,0);assert.equal(f.jobs.get(i.requestId).proof,undefined);
 if(boundary==='deadline'){assert.equal(result.job.state,'failed');assert.equal(result.job.code,'provider-timeout');}else if(boundary==='cancel')assert.equal(result.job.state,'cancelled');else assert.equal(result.code,'access-denied');
});
