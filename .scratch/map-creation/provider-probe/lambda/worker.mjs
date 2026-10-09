import {Buffer} from 'node:buffer';
import {createHash} from 'node:crypto';
import {decodePng,limits} from '../png.mjs';
import {runIntent,fixtureProvider} from '../probe.mjs';
export const workerLimits=Object.freeze({width:1024,height:1024,maxBytes:limits.bytes,maxRequestBytes:16384,maxDeadlineMs:60000});
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const failure=code=>Object.assign(Error(code),{code});
/** Private probe module: verifyArtwork(intent) -> verified provisional outcome | rejected | uncertain.
 * verify/reverify share identity/descriptors; worker owns no provider, ledger, billing or accepted attachment.
 */
export function createArtworkVerifier({storageOrigin,authorization,fetchImpl=fetch,now=Date.now}) {
 const origin=new URL(storageOrigin).origin;
 return {verifyArtwork:async intent=>{
  let writing=false;
  if(!intent||typeof intent!=='object'||Array.isArray(intent))return {kind:'rejected',code:'invalid-command',operationId:null};
  try {
   const checkTime=()=>{if(now()>=intent.deadline)throw failure('deadline-exceeded');};
   if(Buffer.byteLength(JSON.stringify(intent))>workerLimits.maxRequestBytes)throw failure('request-too-large');
   if(!authorization||intent.authorization!==authorization)throw failure('unauthorized-fixture-invocation');
   if(typeof intent.sourceIdentity!=='string'||!intent.sourceIdentity.length||intent.sourceIdentity.length>200||!/^op-[A-Za-z0-9-]{1,60}$/.test(intent.operationId)||!['verify','reverify'].includes(intent.mode)||!Number.isSafeInteger(intent.deadline)||intent.deadline<=now()||intent.deadline-now()>workerLimits.maxDeadlineMs)throw failure('invalid-command');
   const validateDescriptor=(descriptor,path)=>{
    if(!descriptor||typeof descriptor.url!=='string'||!Number.isSafeInteger(descriptor.expiresAt)||descriptor.expiresAt<=now())throw failure('expired-descriptor');
    const url=new URL(descriptor.url);
    if(url.origin!==origin||url.pathname!==path||url.username||url.password||url.hash||url.search)throw failure('unapproved-storage-url');
    if(!/^[a-f0-9]{64}$/.test(descriptor.digest)||descriptor.mime!=='image/png'||!Number.isSafeInteger(descriptor.size)||descriptor.size<1||descriptor.size>workerLimits.maxBytes||descriptor.width!==1024||descriptor.height!==1024)throw failure('invalid-descriptor');
    return descriptor;
   };
   validateDescriptor(intent.source,'/source.png');validateDescriptor(intent.candidate,'/candidate.png');
   const outputPath=`/provisional/${intent.operationId}.png`,outputURL=origin+outputPath;
   if(intent.mode==='reverify'){
    validateDescriptor(intent.provisional,outputPath);
    const receipt=intent.provisional;
    if(receipt.operationId!==intent.operationId||receipt.sourceIdentity!==intent.sourceIdentity||receipt.sourceDigest!==intent.source.digest||receipt.candidateDigest!==intent.candidate.digest||!['x','y','width','height'].every(key=>receipt.region?.[key]===intent.region?.[key]))throw failure('receipt-identity-mismatch');
   }
   const signal=AbortSignal.timeout(Math.max(1,intent.deadline-now()));
   const read=async descriptor=>{
    checkTime();if(descriptor.expiresAt<=now())throw failure('expired-descriptor');
    const response=await fetchImpl(descriptor.url,{headers:{Authorization:authorization},redirect:'manual',signal});
    if(response.redirected||response.status>=300&&response.status<400)throw failure('redirect-denied');
    if(!response.ok)throw failure(`storage-read-${response.status}`);
    if(response.headers.get('content-type')?.split(';')[0]!=='image/png')throw failure('invalid-mime');
    const contentLength=response.headers.get('content-length');
    if(contentLength!==null&&(!/^[0-9]+$/.test(contentLength)||Number(contentLength)>workerLimits.maxBytes))throw failure('image-too-large');
    if(!response.body)throw failure('empty-image');
    const reader=response.body.getReader(),chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();checkTime();if(done)break;size+=value.byteLength;if(size>workerLimits.maxBytes){await reader.cancel();throw failure('image-too-large');}chunks.push(value);}
    const bytes=Buffer.concat(chunks);
    if(bytes.length!==descriptor.size||sha256(bytes)!==descriptor.digest)throw failure('image-integrity');
    // Header and frame checks precede baseline decoder allocations. Never accept an APNG first-frame proof.
    if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw failure('invalid-png');
    if(bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(8)!==13||bytes.readUInt32BE(16)!==1024||bytes.readUInt32BE(20)!==1024)throw failure('unsupported-pixel-dimensions');
    for(let offset=8;offset<bytes.length;){if(offset+12>bytes.length)throw failure('truncated-png');const size=bytes.readUInt32BE(offset),end=offset+size+12;if(end>bytes.length)throw failure('truncated-png');if(['acTL','fcTL','fdAT'].includes(bytes.toString('ascii',offset+4,offset+8)))throw failure('animated-png-denied');offset=end;}
    return bytes;
   };
   const source=await read(intent.source),candidate=await read(intent.candidate);checkTime();
   const result=await runIntent({kind:'revise',requestId:intent.operationId,prompt:'Probe constrained artwork',source:{identity:intent.sourceIdentity,bytes:source},region:intent.region},fixtureProvider(candidate));
   if(result.kind!=='accepted')throw failure('invalid-composition');checkTime();
   let provisional;
   if(intent.mode==='reverify') {
    provisional=await read(intent.provisional);

   } else {
    writing=true;
    const response=await fetchImpl(outputURL,{method:'PUT',headers:{Authorization:authorization,'Content-Type':'image/png','If-None-Match':'*','X-Operation-Id':intent.operationId,'X-Content-SHA256':result.digest},body:result.bytes,redirect:'manual',signal});
    checkTime();
    if(response.redirected||response.status>=300&&response.status<400)throw failure('redirect-denied');
    if(!response.ok)throw failure(`storage-write-${response.status}`);
    // Readback prevents a forged/success-only receipt from authorizing attachment.
    const descriptor={url:outputURL,digest:result.digest,size:result.size,width:1024,height:1024,mime:'image/png',expiresAt:intent.deadline};
    provisional=await read(descriptor);
   }
   // Independently inspect the stored decoded output: digest-only self-consistency cannot prove this operation.
   const output=decodePng(provisional),before=decodePng(source),raw=decodePng(candidate),region=intent.region;
   let outsidePixelCount=0,changedOutsidePixels=0;
   for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const inside=x>=region.x&&x<region.x+region.width&&y>=region.y&&y<region.y+region.height,i=(y*1024+x)*4,expected=inside?raw.rgba:before.rgba;
    if(!inside)outsidePixelCount++;
    for(let c=0;c<4;c++)if(output.rgba[i+c]!==expected[i+c]){if(!inside)changedOutsidePixels++;throw failure('provisional-pixels-mismatch');}
   }
   if(sha256(provisional)!==result.digest||provisional.length!==result.size)throw failure('provisional-operation-mismatch');
   checkTime();
   return {kind:'verified',operationId:intent.operationId,mode:intent.mode,sourceIdentity:intent.sourceIdentity,sourceDigest:intent.source.digest,candidateDigest:intent.candidate.digest,region:intent.region,output:{operationId:intent.operationId,sourceIdentity:intent.sourceIdentity,sourceDigest:intent.source.digest,candidateDigest:intent.candidate.digest,region:intent.region,url:outputURL,mime:'image/png',size:provisional.length,digest:sha256(provisional),width:1024,height:1024},outsidePixelCount,changedOutsidePixels,insideMatchesCandidate:true,registration:'server-verification-required'};
  } catch(error) {return {kind:writing||!error.code?'uncertain':'rejected',code:error.code??'storage-response-unknown',operationId:intent?.operationId??null};}
 }};
}
