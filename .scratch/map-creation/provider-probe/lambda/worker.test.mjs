import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Buffer} from 'node:buffer';
import {createArtworkVerifier,sha256,workerLimits} from './worker.mjs';
const source=await readFile(new URL('./corpus/source.png',import.meta.url)),candidate=await readFile(new URL('./corpus/candidate.png',import.meta.url));
const origin='https://storage.probe.invalid',authorization='local-fixture-only',at=1_000_000;
const descriptor=(path,bytes)=>({url:origin+path,digest:sha256(bytes),size:bytes.length,width:1024,height:1024,mime:'image/png',expiresAt:at+60000});
const provisionalDescriptor=(input,bytes,path='/provisional/op-one.png')=>({...descriptor(path,bytes),operationId:input.operationId,sourceIdentity:input.sourceIdentity,sourceDigest:input.source.digest,candidateDigest:input.candidate.digest,region:input.region});
const command=()=>({mode:'verify',operationId:'op-one',authorization,sourceIdentity:'synthetic-source',source:descriptor('/source.png',source),candidate:descriptor('/candidate.png',candidate),region:{x:650,y:160,width:220,height:240},deadline:at+60000});
function fixture(intercept){
 const objects=new Map([['/source.png',source],['/candidate.png',candidate]]),calls=[];let current=at;
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method??'GET'});
  assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,authorization);
  const path=new URL(url).pathname;
  const response=await intercept?.({url,path,options,objects,setTime:value=>current=value});if(response)return response;
  if(options.method==='PUT'){
   assert.equal(options.headers['If-None-Match'],'*');
   if(objects.has(path))return new Response(null,{status:412});objects.set(path,Buffer.from(options.body));return new Response(null,{status:201});
  }
  return objects.has(path)?new Response(objects.get(path),{headers:{'content-type':'image/png'}}):new Response(null,{status:404});
 };
 const verifier=createArtworkVerifier({storageOrigin:origin,authorization,fetchImpl,now:()=>current});
 return {...verifier,objects,calls};
}
test('verify stores immutable provisional and proves all995776 outside pixels',async()=>{const f=fixture(),result=await f.verifyArtwork(command());assert.equal(result.kind,'verified');assert.equal(result.outsidePixelCount,995776);assert.equal(result.changedOutsidePixels,0);assert.equal(result.insideMatchesCandidate,true);assert.equal(result.registration,'server-verification-required');});
test('same-operation reverify checks exact retained inputs/output and never writes',async()=>{const f=fixture(),input=command(),verified=await f.verifyArtwork(input);f.calls.length=0;const recovered=await f.verifyArtwork({...input,mode:'reverify',provisional:{...verified.output,expiresAt:input.deadline}});assert.equal(recovered.kind,'verified');assert.equal(recovered.output.digest,verified.output.digest);assert.ok(f.calls.every(call=>call.method==='GET'));});
test('matching forged output digest is insufficient when decoded pixels disagree',async()=>{const f=fixture(),input=command();f.objects.set('/provisional/op-one.png',candidate);const result=await f.verifyArtwork({...input,mode:'reverify',provisional:provisionalDescriptor(input,candidate)});assert.equal(result.kind,'rejected');assert.equal(result.code,'provisional-pixels-mismatch');});
test('lost store response leaves uncertain, same-operation recovery requires no repeat write',async()=>{let lost=true;const f=fixture(({path,options,objects})=>{if(options.method==='PUT'&&lost){lost=false;objects.set(path,Buffer.from(options.body));throw Error('response lost');}}),input=command();assert.equal((await f.verifyArtwork(input)).kind,'uncertain');const saved=f.objects.get('/provisional/op-one.png');f.calls.length=0;const result=await f.verifyArtwork({...input,mode:'reverify',provisional:provisionalDescriptor(input,saved)});assert.equal(result.kind,'verified');assert.ok(f.calls.every(call=>call.method==='GET'));});
for(const [label,mutate,code]of [
 ['badhost',input=>input.source.url='https://evil.invalid/source.png','unapproved-storage-url'],
 ['forgeddigest',input=>input.source.digest='0'.repeat(64),'image-integrity'],
 ['expired',input=>input.source.expiresAt=at-1,'expired-descriptor'],
 ['unauthorized',input=>input.authorization='wrong','unauthorized-fixture-invocation'],
 ['oversizeddescriptor',input=>input.source.size=workerLimits.maxBytes+1,'invalid-descriptor'],
 ['oversizedpixels',input=>input.source.width=2048,'invalid-descriptor'],
 ['expireddeadline',input=>input.deadline=at,'invalid-command'],
 ['foreignoperationreceipt',input=>{input.mode='reverify';input.provisional=descriptor('/provisional/op-other.png',source);},'unapproved-storage-url'],
])test(label,async()=>{const f=fixture(),input=command();mutate(input);const result=await f.verifyArtwork(input);assert.equal(result.kind,'rejected');assert.equal(result.code,code);});
test('redirect is rejected without following host',async()=>{const f=fixture(({path})=>path==='/source.png'?new Response(null,{status:302,headers:{location:'https://evil.invalid'}}):null);assert.equal((await f.verifyArtwork(command())).code,'redirect-denied');assert.equal(f.calls.length,1);});
test('oversize content-length rejected before body buffering',async()=>{const f=fixture(({path})=>path==='/source.png'?new Response(source,{headers:{'content-type':'image/png','content-length':String(workerLimits.maxBytes+1)}}):null);assert.equal((await f.verifyArtwork(command())).code,'image-too-large');});
test('oversize withoutContentLength stream is bounded and cancelled',async()=>{let cancelled=false;const f=fixture(({path})=>path==='/source.png'?new Response(new ReadableStream({start(controller){for(let i=0;i<21;i++)controller.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}}),{headers:{'content-type':'image/png'}}):null);assert.equal((await f.verifyArtwork(command())).code,'image-too-large');assert.equal(cancelled,true);});
test('storage denies unauthorized read',async()=>{const f=fixture(()=>new Response(null,{status:403}));assert.equal((await f.verifyArtwork(command())).code,'storage-read-403');});
test('late store receipt cannot become accepted',async()=>{const f=fixture(({options,objects,path,setTime})=>{if(options.method==='PUT'){objects.set(path,Buffer.from(options.body));setTime(at+60001);return new Response(null,{status:201});}});const result=await f.verifyArtwork(command());assert.equal(result.kind,'uncertain');assert.equal(result.code,'deadline-exceeded');});
test('APNG chunks rejected before baseline PNG decode',async()=>{
 const chunk=Buffer.alloc(20);chunk.writeUInt32BE(8);chunk.write('acTL',4);chunk.writeUInt32BE(2,8);
 const apng=Buffer.concat([source.subarray(0,33),chunk,source.subarray(33)]),f=fixture(({path})=>path==='/source.png'?new Response(apng,{headers:{'content-type':'image/png'}}):null),input=command();input.source=descriptor('/source.png',apng);
 assert.equal((await f.verifyArtwork(input)).code,'animated-png-denied');
});
test('stored output cannot overwrite a previously created operation',async()=>{const f=fixture();await f.verifyArtwork(command());const result=await f.verifyArtwork(command());assert.equal(result.kind,'uncertain');assert.equal(result.code,'storage-write-412');});

for(const input of [null,undefined,[],false])test(`malformed invocation ${JSON.stringify(input)}`,async()=>assert.equal((await fixture().verifyArtwork(input)).code,'invalid-command'));
test('receipt must bind exact sourceIdentity and region',async()=>{const f=fixture(),input=command(),verified=await f.verifyArtwork(input);const result=await f.verifyArtwork({...input,mode:'reverify',provisional:{...verified.output,expiresAt:input.deadline,sourceIdentity:'other-parent'}});assert.equal(result.code,'receipt-identity-mismatch');});
test('partial uploaded provisional cannot pass same-operation recovery',async()=>{const f=fixture(),input=command(),partial=source.subarray(0,200);f.objects.set('/provisional/op-one.png',partial);const result=await f.verifyArtwork({...input,mode:'reverify',provisional:provisionalDescriptor(input,partial)});assert.equal(result.kind,'rejected');assert.equal(result.code,'truncated-png');assert.ok(f.calls.every(call=>call.method==='GET'));});
test('full rectangle explicitly reports zero outside pixels and exact candidate',async()=>{const f=fixture(),input=command();input.region={x:0,y:0,width:1024,height:1024};const result=await f.verifyArtwork(input);assert.equal(result.kind,'verified');assert.equal(result.outsidePixelCount,0);assert.equal(result.changedOutsidePixels,0);});

test('actualPNG header dimension over ceiling rejects before decoder allocation',async()=>{const huge=Buffer.from(source);huge.writeUInt32BE(2048,16);const f=fixture(({path})=>path==='/source.png'?new Response(huge,{headers:{'content-type':'image/png'}}):null),input=command();input.source=descriptor('/source.png',huge);assert.equal((await f.verifyArtwork(input)).code,'unsupported-pixel-dimensions');});
