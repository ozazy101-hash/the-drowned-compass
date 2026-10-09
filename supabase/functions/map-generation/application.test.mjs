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

test('authorized persisted original intent survives successful and failed reloads',async()=>{
 for(const response of [{kind:'image',bytes:candidate},{kind:'failed'}]){const f=await fixture({response}),i=intent();const submitted=await f.app.execute('dm',{kind:'submit',intent:i});assert.deepEqual(submitted.job.originalIntent,i);const reload=await f.app.execute('dm',{kind:'read',requestId:i.requestId,intent:{...i,instructions:'caller substitution'}});assert.deepEqual(reload.job.originalIntent,i);assert.equal(f.calls,1);}
});
test('cancelled reload returns its selected persisted intent independent of other jobs',async()=>{
 const f=await fixture(),a=intent(),b={...intent(),instructions:'Selected B'};await f.app.execute('dm',{kind:'submit',intent:a});await f.app.execute('dm',{kind:'submit',intent:b});const cancelled=await f.app.execute('dm',{kind:'cancel',requestId:b.requestId});assert.deepEqual(cancelled.job.originalIntent,b);assert.deepEqual((await f.app.execute('dm',{kind:'read',requestId:b.requestId})).job.originalIntent,b);assert.notDeepEqual(cancelled.job.originalIntent,a);
});
test('uncertain original intent keeps same request without another submission',async()=>{
 const f=await fixture({response:{kind:'uncertain'}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});const reload=await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.deepEqual(reload.job.originalIntent,i);assert.equal((await f.app.execute('dm',{kind:'submit',intent:reload.job.originalIntent})).job.state,'uncertain');assert.equal(f.calls,1);
});
test('intent projection denies membership loss, Player, anonymous and other party',async()=>{
 const f=await fixture(),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});for(const actor of ['player','anon','other-party-dm'])for(const kind of ['read','cancel'])assert.deepEqual(await f.app.execute(actor,{kind,requestId:i.requestId}),{ok:false,code:'access-denied'});f.store.read=async()=>{throw Error('Dungeon Master access required');};assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:i.requestId}),{ok:false,code:'access-denied'});
});
test('projection whitelists persisted intent and nested grid/region without leaking authority',async()=>{
 const f=await fixture({response:{kind:'failed'}}),i={...intent(),document:{...doc,terrain:[{x:1,y:1,kind:'floor'}],edges:[{x:0,y:0,direction:'vertical',kind:'wall'}]}};await f.app.execute('dm',{kind:'submit',intent:i});const j=f.jobs.get(i.requestId);Object.assign(j.intent,{proof:'private',provider:'private',credentials:'private',objectId:'private',path:'private'});Object.assign(j.intent.document,{proof:'private'});j.intent.document.terrain[0].digest='private';j.intent.document.edges[0].path='private';const result=await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.deepEqual(result.job.originalIntent,i);assert.equal(JSON.stringify(result).includes('private'),false);result.job.originalIntent.document.terrain[0].kind='water';assert.equal(j.intent.document.terrain[0].kind,'floor');
 const regionJob={...intent(),kind:'revise',parentVersionId:crypto.randomUUID(),expectedVersion:1,source:'artwork',region:{x:10,y:20,width:200,height:160}};delete regionJob.document;await f.app.execute('dm',{kind:'submit',intent:regionJob});const r=f.jobs.get(regionJob.requestId);r.intent.region.expectedRgba='private';assert.deepEqual((await f.app.execute('dm',{kind:'read',requestId:regionJob.requestId})).job.originalIntent,regionJob);r.intent.region.width=0;assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:regionJob.requestId}),{ok:false,code:'invalid-region'});
 j.intent.document.terrain[0].x=900;assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:i.requestId}),{ok:false,code:'invalid-intent'});
});

test('persisted projection fails closed on substituted identity or invalid source',async()=>{
 const f=await fixture({response:{kind:'failed'}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});const j=f.jobs.get(i.requestId);j.intent.requestId=crypto.randomUUID();assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:i.requestId}),{ok:false,code:'invalid-intent'});j.intent.requestId=i.requestId;for(const source of ['artwork','provider-secret']){j.intent.source=source;assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:i.requestId}),{ok:false,code:'invalid-intent'});}
});

test('transient PREPARE recovers same timely candidate with one provider and one version',async()=>{
 let attempts=0;const f=await fixture({verifierOverride:{inspect:decode,prepare:async(...args)=>{if(++attempts===1)throw Error('verification-unavailable');return prepareExpected(...args);},finalize:finalizeExpected}}),i=intent();const submitted=await f.app.execute('dm',{kind:'submit',intent:i});assert.equal(submitted.job.state,'awaiting-client-output');assert.equal(submitted.job.code,'verification-unavailable');assert.equal(f.jobs.get(i.requestId).proof,undefined);const read=await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(read.job.state,'awaiting-client-output');assert.equal((await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate})).job.state,'completed');assert.equal(f.calls,1);assert.equal(f.completions,1);
});
for(const state of ['awaiting-client-output','cancelled','completed','failed'])test(`losing PREPARE preserves newer ${state} revision`,async()=>{
 let f;const verifier={inspect:decode,prepare:async(...args)=>{const proof=await prepareExpected(...args);const j=f.jobs.get(args[1]);j.revision++;j.state=state;j.proof={...proof,expiresAt:Date.parse(j.provider_finished_at)+86400000};j.result={receipt:'newer'};throw Error('verification-unavailable');},finalize:finalizeExpected};f=await fixture({verifierOverride:verifier});const i=intent(),result=await f.app.execute('dm',{kind:'submit',intent:i});if(state==='completed')assert.deepEqual(result,{ok:false,code:'output-not-ready'});else assert.equal(result.job.state,state);assert.equal(f.jobs.get(i.requestId).revision,4);assert.equal(f.jobs.get(i.requestId).result.receipt,'newer');assert.ok(f.jobs.get(i.requestId).proof);assert.equal(f.calls,1);
});
test('candidate before first PREPARE expires at authoritative receipt plus24hours',async()=>{
 let advanced=0,attempts=0;const f=await fixture({clock:()=>Date.now()+advanced,verifierOverride:{inspect:decode,prepare:async()=>{attempts++;throw Error('verification-unavailable');},finalize:finalizeExpected}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});advanced=86400001;assert.deepEqual(await f.app.execute('dm',{kind:'read',requestId:i.requestId}),{ok:false,code:'expired-output'});assert.equal(attempts,1);assert.equal(f.calls,1);assert.equal(f.completions,0);
});
test('repeated recovery uses fixed receipt ceiling and never extends an earlier proof',async()=>{
 let advanced=0,attempts=0;const f=await fixture({clock:()=>Date.now()+advanced,verifierOverride:{inspect:decode,prepare:async(...args)=>{if(++attempts<3)throw Error('verification-unavailable');return prepareExpected(...args);},finalize:finalizeExpected}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});const j=f.jobs.get(i.requestId),ceiling=Date.parse(j.provider_finished_at)+86400000;advanced=3600000;await f.app.execute('dm',{kind:'read',requestId:i.requestId});advanced=7200000;await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(j.proof.expiresAt,ceiling);j.proof.expiresAt=ceiling-1000;await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(j.proof.expiresAt,ceiling-1000);j.proof.expiresAt=ceiling+1000;await f.app.execute('dm',{kind:'read',requestId:i.requestId});assert.equal(j.proof.expiresAt,ceiling);assert.equal(f.calls,1);
});
test('transient FINALIZE preserves same immutable proof/object for reload recovery',async()=>{
 let attempts=0;const f=await fixture({verifierOverride:{inspect:decode,prepare:prepareExpected,finalize:async(...args)=>{if(++attempts===2)throw Error('verification-unavailable');return finalizeExpected(...args);}}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});const proof=structuredClone(f.jobs.get(i.requestId).proof);assert.deepEqual(await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate}),{ok:false,code:'verification-unavailable'});assert.equal(f.completions,0);assert.deepEqual(f.jobs.get(i.requestId).proof,proof);assert.equal((await f.app.execute('dm',{kind:'read',requestId:i.requestId})).job.state,'completed');assert.equal(f.calls,1);assert.equal(f.completions,1);
});
test('permanent PREPARE validation fails unchanged candidate and never calls provider on read',async()=>{
 const f=await fixture({verifierOverride:{inspect:decode,prepare:async()=>{throw Error('verifier-validation');},finalize:finalizeExpected}}),i=intent();assert.equal((await f.app.execute('dm',{kind:'submit',intent:i})).job.state,'failed');assert.equal((await f.app.execute('dm',{kind:'read',requestId:i.requestId})).job.state,'failed');assert.equal(f.calls,1);
});

test('receipt ceiling crossed during FINALIZE rejects attachment without extending proof',async()=>{
 let advanced=0;const f=await fixture({clock:()=>Date.now()+advanced,verifierOverride:{inspect:decode,prepare:prepareExpected,finalize:async(...args)=>{const result=await finalizeExpected(...args);advanced=86400001;return result;}}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});const expiry=f.jobs.get(i.requestId).proof.expiresAt;assert.deepEqual(await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate}),{ok:false,code:'expired-or-invalid-proof'});assert.equal(f.completions,0);assert.equal(f.calls,1);assert.equal(f.jobs.get(i.requestId).proof.expiresAt,expiry);
});

for(const tamper of [false,true])test(`newer completed PREPARE race independently re-verifies stored output (tamper=${tamper})`,async()=>{
 let f,attempts=0;const verifier={inspect:decode,prepare:async(...args)=>{if(++attempts===1){await f.app.execute('dm',{kind:'read',requestId:args[1]});assert.equal((await f.app.execute('dm',{kind:'output',requestId:args[1],bytes:candidate})).job.state,'completed');if(tamper)f.objects.set('party-handouts/party/'+args[1],inputBytes);throw Error('verification-unavailable');}return prepareExpected(...args);},finalize:finalizeExpected};f=await fixture({verifierOverride:verifier});const i=intent(),result=await f.app.execute('dm',{kind:'submit',intent:i});if(tamper)assert.deepEqual(result,{ok:false,code:'immutable-object-mismatch'});else assert.equal(result.job.state,'completed');assert.equal(f.jobs.get(i.requestId).state,'completed');assert.equal(f.completions,1);assert.equal(f.calls,1);
});

for(const kind of ['read','output'])for(const tamper of [false,true])test(`legacy proof clamp CAS completed recovery verifies immutable output (${kind},tamper=${tamper})`,async()=>{
 let finalized=0;const f=await fixture({verifierOverride:{inspect:decode,prepare:prepareExpected,finalize:async(...args)=>{finalized++;return finalizeExpected(...args);}}}),i=intent();await f.app.execute('dm',{kind:'submit',intent:i});const stale=structuredClone(f.jobs.get(i.requestId));stale.proof.expiresAt+=1000;await f.app.execute('dm',{kind:'output',requestId:i.requestId,bytes:candidate});if(tamper)f.objects.set('party-handouts/party/'+i.requestId,inputBytes);let reads=0;const read=f.store.read;f.store.read=async(...args)=>++reads<=(kind==='read'?2:1)?structuredClone(stale):read(...args);const before=finalized,result=await f.app.execute('dm',{kind,requestId:i.requestId,bytes:candidate});if(tamper)assert.deepEqual(result,{ok:false,code:'immutable-object-mismatch'});else{assert.equal(result.job.state,'completed');assert.ok(finalized>before);}assert.equal(f.jobs.get(i.requestId).state,'completed');assert.equal(f.calls,1);assert.equal(f.completions,1);
});

for(const outcome of ['valid','tamper','unavailable'])test(`recovery failure-transition CAS completed result independently verifies once (${outcome})`,async()=>{
 let f,prepared=0,finalized=0;const verifier={inspect:decode,prepare:async(...args)=>{if(++prepared===1)throw Error('verification-unavailable');return prepareExpected(...args);},finalize:async(...args)=>{finalized++;if(outcome==='unavailable'&&finalized===3)throw Error('verification-unavailable');return finalizeExpected(...args);}};f=await fixture({verifierOverride:verifier});const transition=f.store.transition;f.store.transition=async(id,rev,state,patch)=>{if(patch.code==='verification-unavailable'){await f.app.execute('dm',{kind:'read',requestId:id});assert.equal((await f.app.execute('dm',{kind:'output',requestId:id,bytes:candidate})).job.state,'completed');if(outcome==='tamper')f.objects.set('party-handouts/party/'+id,inputBytes);return structuredClone(f.jobs.get(id));}return transition(id,rev,state,patch);};const i=intent(),result=await f.app.execute('dm',{kind:'submit',intent:i});if(outcome==='valid'){assert.equal(result.job.state,'completed');assert.equal(finalized,3);}else if(outcome==='tamper'){assert.deepEqual(result,{ok:false,code:'immutable-object-mismatch'});assert.equal(finalized,2);}else{assert.deepEqual(result,{ok:false,code:'verification-unavailable'});assert.equal(finalized,3);}assert.equal(f.jobs.get(i.requestId).state,'completed');assert.equal(f.calls,1);assert.equal(f.completions,1);
});

// Controlled provider429 outcome; no external HTTP submission or paid fixture.
test('provider rate-limit preserves accepted output and requires explicit fresh identity for retry',async()=>{
 let calls=0;const f=await fixture({providerOverride:{async generate(){calls++;return calls===2?{kind:'failed',code:'rate-limit'}:{kind:'image',bytes:candidate};},async reconcile(){return {kind:'uncertain'};}}});
 const accepted=intent();await f.app.execute('dm',{kind:'submit',intent:accepted});await f.app.execute('dm',{kind:'output',requestId:accepted.requestId,bytes:candidate});
 const saved=f.objects.get('party-handouts/party/'+accepted.requestId).slice(), failed=intent();
 const outcome=await f.app.execute('dm',{kind:'submit',intent:failed});assert.equal(outcome.job.state,'failed');assert.equal(outcome.job.code,'rate-limit');assert.equal(f.completions,1);assert.deepEqual(f.objects.get('party-handouts/party/'+accepted.requestId),saved);
 const reload=await f.app.execute('dm',{kind:'read',requestId:failed.requestId});assert.deepEqual(reload.job.originalIntent,failed);
 await f.app.execute('dm',{kind:'submit',intent:failed});assert.equal(calls,2);assert.equal(f.objects.has('party-handouts/party/'+failed.requestId),false);
 const retry={...reload.job.originalIntent,requestId:crypto.randomUUID()};const fresh=await f.app.execute('dm',{kind:'submit',intent:retry});assert.equal(fresh.job.state,'awaiting-client-output');assert.equal(calls,3);assert.equal(f.completions,1);assert.notEqual(retry.requestId,failed.requestId);
});
