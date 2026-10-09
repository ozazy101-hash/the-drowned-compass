import {digest, boundedBody} from './verifier/png.mjs';
export const verifierVersion='map-png-rgba-v1';
const fullRegion=Object.freeze({x:0,y:0,width:1024,height:1024});
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validateIntent(input){
 if(!input||Object.keys(input).some(k=>!['requestId','familyId','parentVersionId','expectedVersion','kind','title','instructions','document','source','region'].includes(k))||!uuid(input.requestId)||!uuid(input.familyId)||!Number.isInteger(input.expectedVersion)||input.expectedVersion<0||!['generate','reference','revise'].includes(input.kind)||typeof input.title!=='string'||!input.title.trim()||input.title.length>160||typeof input.instructions!=='string'||!input.instructions.trim()||input.instructions.length>8000)throw Error('invalid-intent');
 if(input.parentVersionId!==undefined&&(typeof input.parentVersionId!=='string'||!input.parentVersionId))throw Error('invalid-parent');
 if(input.parentVersionId&&input.document)throw Error('saved-parent-required');
 if(input.kind!=='generate'&&!['artwork','reference'].includes(input.source))throw Error('invalid-source');
 if(input.kind==='revise'){
  const r=input.region;if(input.source!=='artwork'||!r||Object.keys(r).length!==4||!['x','y','width','height'].every(k=>Number.isInteger(r[k]))||r.x<0||r.y<0||r.width<1||r.height<1||r.x+r.width>1024||r.y+r.height>1024)throw Error('invalid-region');
 }else if(input.region!==undefined)throw Error('invalid-region');
 return structuredClone(input);
}
const snapshot=j=>({id:j.id,familyId:j.intent.familyId,parentVersionId:j.intent.parentVersionId??null,state:j.state,revision:j.revision,mode:j.mode,createdAt:j.created_at,code:j.code??null,versionId:j.state==='completed'?j.id:null,...(j.state==='awaiting-client-output'?{assembly:{region:j.binding.region??fullRegion,pixelWidth:1024,pixelHeight:1024,requiresSource:j.intent.kind==='revise'}}:{})});
function proofBinding(j){
 const source=j.intent.kind==='revise'?j.binding.source:j.candidate;
 return {requestId:j.id,parentId:j.binding.parent??j.intent.familyId,region:j.binding.region??fullRegion,files:{source:{bytes:source.size,sha256:source.digest},candidate:{bytes:j.candidate.size,sha256:j.candidate.digest}}};
}
function object(j,kind){
 const metadata=kind==='source'?j.binding.source:kind==='candidate'?j.candidate:j.provisional;
 return {bucket:kind==='source'?'party-handouts':kind==='candidate'?'private-map-generation':'party-handouts',partyId:j.party_id,objectId:metadata.objectId??metadata.object_id,metadata};
}
/** One intent/outcome interface. All durable state lives in the injected owned SQL adapter.
 * Verifier.prepare/finalize are separate fresh bounded workers, never in-process fallback.
 */
export function generationApplication({store,provider,verifier,mode='live',now=Date.now}){
 async function owned(user,id){if(!uuid(id))throw Error('invalid-request');const j=await store.read(user,id);if(!j)throw Error('unknown-job');return j;}
 const transition=(j,state,patch={})=>store.transition(j.id,j.revision,state,patch);
 async function readBytes(j,kind){const ref=object(j,kind),bytes=await store.readObject(ref);if(bytes.length!==Number(ref.metadata.size)||await digest(bytes)!==ref.metadata.digest)throw Error('immutable-object-mismatch');return bytes;}
 function parentCurrent(j,current){return current&&JSON.stringify(current)===JSON.stringify(j.binding);}
 async function check(j){if(!parentCurrent(j,await store.currentBinding(j)))throw Error('stale-parent');}
 async function prepare(j){
  if(j.state!=='awaiting-client-output')return j;
  await check(j);
  if(j.proof){if(j.proof.expiresAt<=now())throw Error('expired-output');return j;}
  const binding=proofBinding(j),candidate=await readBytes(j,'candidate');
  const source=j.intent.kind==='revise'?await readBytes(j,'source'):candidate;
  const computed=await verifier.prepare(binding,j.id,source,candidate);
  const proof={...computed,verifierVersion,jobId:j.id,origin:j.intent.kind==='revise'?'revised':'generated',partyId:j.party_id,familyId:j.intent.familyId,parentVersionId:j.binding.parent,expectedVersion:j.intent.expectedVersion,sourceObjectId:j.intent.kind==='revise'?j.binding.source.object_id:j.candidate.objectId,candidateObjectId:j.candidate.objectId,expiresAt:now()+86400000};
  return transition(j,'awaiting-client-output',{proof});
 }
 async function finalize(j){
  if(!['awaiting-client-output','completed'].includes(j.state)||!j.provisional||!j.proof)throw Error('output-not-ready');
  if(j.proof.verifierVersion!==verifierVersion||j.proof.jobId!==j.id||j.proof.partyId!==j.party_id||j.proof.expectedVersion!==j.intent.expectedVersion||j.proof.candidateObjectId!==j.candidate.objectId||j.proof.sourceObjectId!==(j.intent.kind==='revise'?j.binding.source.object_id:j.candidate.objectId)||j.proof.origin!==(j.intent.kind==='revise'?'revised':'generated')||j.proof.expiresAt<=now())throw Error('expired-or-invalid-proof');
  await check(j);
  // Always re-read same provisional object on finalize AND recovery. Browser digest is never used.
  const bytes=await readBytes(j,'provisional');
  const verified=await verifier.finalize(proofBinding(j),j.id,j.proof,bytes,now());
  if(verified.kind!=='verified'||verified.outputDigest!==j.provisional.digest)throw Error('output-pixels-mismatch');
  const doc=j.binding.document,placement=j.intent.kind==='revise'?j.binding.source:fit(doc);
  const background={...placement,object_id:j.id,digest:verified.outputDigest,mime:'image/png',size:bytes.length,pixelWidth:1024,pixelHeight:1024};
  // SQL locks job/family and checks current parent, proof, same-object digest,
  // accepted request tuple and cancellation again in the attachment transaction.
  return store.complete(j,j.proof,verified,background);
 }
 async function acceptCandidate(j,response){
  if(Date.parse(j.deadline)<=now())return transition(j,'failed',{code:'provider-timeout'});
  if(response.kind==='uncertain')return transition(j,'uncertain',{code:'submission-unknown'});
  if(response.kind!=='image')return transition(j,'failed',{code:response.code==='rate-limit'?'rate-limit':'provider-failed'});
  if(!(response.bytes instanceof Uint8Array)||!response.bytes.length||response.bytes.length>20*1024*1024)return transition(j,'failed',{code:'invalid-provider-output'});
  const ref={bucket:'private-map-generation',partyId:j.party_id,objectId:j.id};
  await store.writeObject(ref,response.bytes);
  const candidate={objectId:ref.objectId,digest:await digest(response.bytes),size:response.bytes.length,mime:'image/png'};
  const accepted=await transition(j,'awaiting-client-output',{candidate});
  if(accepted.state!=='awaiting-client-output')return accepted;
  // Preparation is a distinct bounded physical stage, validates dimensions/encoding.
  return prepare(accepted);
 }
 async function submit(user,input){
  const intent=validateIntent(input);let j=await store.reserve(user,intent,mode);
  if(j.state!=='queued')return reconcile(user,j.id);
  if(Date.parse(j.deadline)<=now())return snapshot(await transition(j,'failed',{code:'expired-submission'}));
  const submissionToken=crypto.randomUUID();const started=await transition(j,'running',{submissionToken});if(started.state!=='running'||started.submission_token!==submissionToken)return snapshot(started);j=started;
  let response;
  try{
   const source=j.intent.kind==='generate'?undefined:await readBytes(j,'source');
   if(source)await verifier.inspect(source); // fresh stage validates input BEFORE provider call
   const abort=new AbortController(),wait=Math.min(120000,Math.max(1,Date.parse(j.deadline)-now()));
   let timer;try{response=await Promise.race([provider.generate({requestId:j.id,prompt:j.intent.instructions,source,region:j.binding.region,size:'1024x1024',signal:abort.signal}),new Promise(resolve=>{timer=setTimeout(()=>{abort.abort();resolve({kind:'uncertain'});},wait);})]);}finally{clearTimeout(timer);}
  }catch(error){if(String(error).includes('Unsupported')||String(error).includes('PNG')||String(error).includes('encoding'))return snapshot(await transition(j,'failed',{code:'unsupported-ai-format'}));response={kind:'uncertain'};}
  try{return snapshot(await acceptCandidate(j,response));}catch{return snapshot(await transition(await owned(user,j.id),'failed',{code:'output-unavailable'}));}
 }
 async function reconcile(user,id){
  let j=await owned(user,id);
  if(['running','uncertain'].includes(j.state)&&Date.parse(j.deadline)<=now())j=await transition(j,'failed',{code:'provider-timeout'});
  if(j.state==='uncertain'){
   // Receipt lookup only. The provider adapter must NEVER submit in reconcile.
   const response=await provider.reconcile(j.id);if(response.kind==='image'||response.kind==='failed')j=await acceptCandidate(j,response);
  }
  if(j.state==='awaiting-client-output')j=await prepare(j);
  if(j.provisional&&['awaiting-client-output','completed'].includes(j.state))j=await finalize(j);
  return snapshot(j);
 }
 return {async execute(user,command){
  try{
   if(command.kind==='submit')return {ok:true,job:await submit(user,command.intent)};
   let j=await owned(user,command.requestId);
   if(command.kind==='cancel')return {ok:true,job:snapshot(await transition(j,'cancelled',{code:'cancelled'}))};
   if(command.kind==='read')return {ok:true,job:await reconcile(user,j.id)};
   if(command.kind==='open-source'||command.kind==='open-candidate'){
    if(j.state!=='awaiting-client-output'||!j.proof||j.proof.expiresAt<=now())throw Error('output-not-ready');
    await check(j);const kind=command.kind==='open-source'?'source':'candidate';if(kind==='source'&&j.intent.kind!=='revise')throw Error('source-not-required');
    return {ok:true,bytes:await readBytes(j,kind)};
   }
   if(command.kind==='output'){
    if(j.state==='completed')return {ok:true,job:await reconcile(user,j.id)};
    j=await prepare(j);if(j.state!=='awaiting-client-output')return {ok:true,job:snapshot(j)};
    const bytes=command.bytes;if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>20*1024*1024)throw Error('invalid-output');
    // Reject a malformed assembly before consuming the canonical write-once name.
    // This bounded preflight is not attachment authority: finalize re-reads and
    // independently re-verifies the SAME stored immutable object after upload.
    const preflight=await verifier.finalize(proofBinding(j),j.id,j.proof,bytes,now());
    if(preflight.kind!=='verified')throw Error('output-pixels-mismatch');
    const ref={bucket:'party-handouts',partyId:j.party_id,objectId:j.id};
    await store.writeObject(ref,bytes);const actual=await store.readObject(ref);
    if(await digest(actual)!==await digest(bytes))throw Error('immutable-object-mismatch');
    const provisional={objectId:j.id,digest:await digest(actual),size:actual.length,mime:'image/png'};
    if(j.provisional&&JSON.stringify(j.provisional)!==JSON.stringify(provisional))throw Error('immutable-object-mismatch');
    j=await transition(j,'awaiting-client-output',{provisional});return {ok:true,job:snapshot(await finalize(j))};
   }
   throw Error('invalid-command');
  }catch(error){return {ok:false,code:code(error)};}
 },async handle(user,request){
  const action=request.headers.get('X-Map-Command'),requestId=request.headers.get('X-Map-Request');
  if(action==='output')return this.execute(user,{kind:action,requestId,bytes:await boundedBody(request.body)});
  const body=await request.json();if(Object.keys(body).some(k=>!['kind','intent','requestId'].includes(k)))return {ok:false,code:'invalid-command'};return this.execute(user,body);
 }};
}
function fit(doc){const scale=Math.min(doc.columns/1024,doc.rows/1024);return {x:(doc.columns-1024*scale)/2,y:(doc.rows-1024*scale)/2,width:1024*scale,height:1024*scale};}
function code(error){const message=String(error);const known=['invalid-intent','invalid-request','invalid-command','invalid-region','invalid-source','invalid-parent','saved-parent-required','stale-parent','expired-output','output-not-ready','expired-or-invalid-proof','output-pixels-mismatch','immutable-object-mismatch','source-not-required','invalid-output'];return known.find(c=>message.includes(c))??(message.includes('Dungeon Master')?'access-denied':message.includes('disabled')?'generation-disabled':message.includes('limit')?'usage-limit':message.includes('active')?'concurrency-limit':message.includes('identity')?'request-conflict':message.includes('revision')?'stale-parent':message.includes('format')?'unsupported-ai-format':'unavailable');}
