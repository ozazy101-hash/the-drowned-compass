import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { decodePng,encodePng,limits } from './png.mjs';
export const MODEL='gpt-image-2.5-sunburst';
export const settings=Object.freeze({concurrency:1,maxSubmissions:3,timeoutMs:120_000,orphanRetentionHours:24,maxBytes:limits.bytes,maxPixels:limits.pixels});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function regionOf(region,image) {
  if(!region||!['x','y','width','height'].every(k=>Number.isInteger(region[k]))||region.x<0||region.y<0||region.width<1||region.height<1||region.x+region.width>image.width||region.y+region.height>image.height)throw Error('Invalid region');
  return region;
}
function selected(x,y,r) {return x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height;}
function providerMask(image,region) {
  const rgba=Buffer.alloc(image.width*image.height*4,255);
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++) if(selected(x,y,region))rgba[(y*image.width+x)*4+3]=0;
  return encodePng({...image,rgba});
}
/** Internal normalized port: async generate({prompt,source?,mask?,size,requestId}) -> {kind:'image',bytes,receipt,usage} | {kind:'failed'|'uncertain',code,receipt?}.
 * Provider payloads/polarity never cross the workshop seam. This probe is not the ticket06 job application.
 */
export async function runIntent(intent,provider) {
  let source,region;
  try {
    if(!intent.requestId||typeof intent.prompt!=='string'||!intent.prompt.trim()||intent.prompt.length>2000)throw Error('Invalid intent');
    if(!['generate','reference','revise'].includes(intent.kind))throw Error('Invalid kind');
    if(intent.kind!=='generate') {
      if(!intent.source?.identity||!intent.source.bytes)throw Error('Source identity required');
      source=decodePng(intent.source.bytes);
    } else if(intent.source||intent.region)throw Error('Unexpected source');
    if(intent.kind==='revise')region=regionOf(intent.region,source);
    else if(intent.region)throw Error('Unexpected region');
  } catch {return {kind:'rejected',code:'invalid-input'};}
  const size=source?`${source.width}x${source.height}`:'1024x1024';
  const response=await provider.generate({requestId:intent.requestId,prompt:intent.prompt,source:intent.source?.bytes,mask:region?providerMask(source,region):undefined,size});
  if(response.kind!=='image')return response;
  try {
    const candidate=decodePng(response.bytes);
    if(candidate.width*candidate.height>limits.pixels)throw Error('Invalid dimensions');
    let image=candidate,composition=null;
    if(region) {
      if(candidate.width!==source.width||candidate.height!==source.height)throw Error('Dimension drift');
      const rgba=Buffer.from(source.rgba); let outsidePixelCount=0,rawOutsideChanged=0;
      for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++) {
        const i=(y*source.width+x)*4;
        if(selected(x,y,region)) candidate.rgba.copy(rgba,i,i,i+4);
        else {outsidePixelCount++;if(!candidate.rgba.subarray(i,i+4).equals(source.rgba.subarray(i,i+4)))rawOutsideChanged++;}
      }
      image={...source,rgba};
      composition={sourceIdentity:intent.source.identity,sourceDigest:digest(intent.source.bytes),region,outsidePixelCount,rawOutsideChanged,preserved:true};
    }
    const bytes=encodePng(image),verified=decodePng(bytes);
    if(!verified.rgba.equals(image.rgba))throw Error('Lossless roundtrip failed');
    return {kind:'accepted',bytes,mime:'image/png',size:bytes.length,digest:digest(bytes),width:image.width,height:image.height,requestId:intent.requestId,origin:intent.kind,parentIdentity:intent.source?.identity??null,registration:region?'server-verification-required':'new',composition,receipt:response.receipt,usage:response.usage??null};
  } catch {return {kind:'rejected',code:'invalid-output',receipt:response.receipt,usage:response.usage??null};}
}
export function fixtureProvider(bytes) {return {generate:async()=>({kind:'image',bytes,receipt:{mode:'fixture'},usage:null})};}
/** No retries: a disconnected paid submission may already exist. HTTP 5xx/408 and interrupted decoding are uncertain. */
export function openAIProvider({apiKey,fetchImpl=fetch,timeoutMs=settings.timeoutMs}={}) {
  return {generate:async input=>{
    if(!apiKey)return {kind:'failed',code:'missing-OPENAI_API_KEY'};
    const sizeMatch=typeof input.size==='string'&&/^[0-9]{1,4}x[0-9]{1,4}$/.test(input.size);
    const [width,height]=sizeMatch?input.size.split('x').map(Number):[0,0];
    const pixels=width*height;
    if(!width||!height||width%16||height%16||width>3840||height>3840||width/height<1/3||width/height>3||pixels<655360||pixels>8294400)return {kind:'failed',code:'unsupported-provider-dimensions'};
    const headers={Authorization:`Bearer ${apiKey}`,'X-Client-Request-Id':input.requestId};
    const fields={model:MODEL,prompt:input.prompt,n:1,size:input.size,quality:'low',output_format:'png'};
    let body,endpoint='generations';
    if(input.source) {
      endpoint='edits'; body=new FormData();for(const [key,value]of Object.entries(fields))body.set(key,String(value));
      body.append('image[]',new Blob([input.source],{type:'image/png'}),'source.png');
      if(input.mask)body.set('mask',new Blob([input.mask],{type:'image/png'}),'mask.png');
    } else {headers['Content-Type']='application/json';body=JSON.stringify(fields);}
    let receipt={mode:'live',model:MODEL,requestId:input.requestId},response;
    try {
      response=await fetchImpl(`https://api.openai.com/v1/images/${endpoint}`,{method:'POST',headers,body,signal:AbortSignal.timeout(timeoutMs)});
      receipt={...receipt,httpStatus:response.status,providerRequestId:response.headers.get('x-request-id')};
      if(!response.ok)return {kind:response.status>=500||response.status===408?'uncertain':'failed',code:`http-${response.status}`,receipt};
      // Limit decoded JSON/base64 buffering, not just Content-Length supplied by upstream.
      const chunks=[];let length=0;const reader=response.body.getReader();
      while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>Math.ceil(limits.bytes*4/3)+65536){await reader.cancel();return {kind:'uncertain',code:'response-too-large',receipt};}chunks.push(value);}
      const payload=JSON.parse(Buffer.concat(chunks).toString('utf8')),b64=payload.data?.[0]?.b64_json;
      if(payload.data?.length!==1||typeof b64!=='string'||!b64.length||b64.length%4)return {kind:'failed',code:'invalid-provider-output',receipt};
      // A repeated-group regexp can exhaust the JS stack on legitimate multi-MiB images.
      // Scan the alphabet once, isolate at most two padding characters, then verify canonical bits.
      const padding=b64.endsWith('==')?2:b64.endsWith('=')?1:0;
      if(/[^A-Za-z0-9+/]/.test(b64.slice(0,b64.length-padding)))return {kind:'failed',code:'invalid-provider-output',receipt};
      const bytes=Buffer.from(b64,'base64');
      if(bytes.length>limits.bytes||bytes.toString('base64')!==b64)return {kind:'failed',code:'invalid-provider-output',receipt};
      return {kind:'image',bytes,receipt,usage:payload.usage??null};
    } catch {return {kind:'uncertain',code:'submission-or-response-unknown',receipt};}
  }};
}
