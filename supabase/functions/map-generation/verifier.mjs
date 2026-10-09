const limits=Object.freeze({memoryLimitMb:256,workerTimeoutMs:150000,cpuTimeSoftLimitMs:1900,cpuTimeHardLimitMs:2000});
/** Supervisor-private ingress returns the worker response directly. The Edge tag
 * belongs to this internal HTTP request, never to an outer durable job command.
 * Consuming a tagged worker response then doing SQL can abort the outer connection.
 */
export function verifierGateway(runtime,servicePath,nonce){
 return async request=>{
  const token=request.headers.get('X-Verifier-Token')??'';let difference=token.length^nonce.length;for(let i=0;i<nonce.length;i++)difference|=nonce.charCodeAt(i)^(token.charCodeAt(i)||0);
  if(request.method!=='POST'||difference)return new Response('Denied',{status:403});
  const worker=await runtime.userWorkers.create({servicePath,...limits,envVars:[],forceCreate:true,noModuleCache:true});
  const headers=new Headers(request.headers);headers.delete('X-Verifier-Token');
  const forwarded=new Request('http://owned-verifier.internal/',{method:'POST',body:request.body,duplex:'half',headers});
  runtime.applySupabaseTag(request,forwarded);return worker.fetch(forwarded);
 };
}
/** Internal HTTP gives every stage its own physical lifecycle; no unbounded or
 * same-worker decode fallback. The private nonce/proof never reach the browser.
 */
export function boundedVerifier({gatewayUrl,nonce,fetchImpl=fetch}){
 async function stage(kind,body,headers={}){
  let response;try{response=await fetchImpl(gatewayUrl,{method:'POST',body,headers:{'X-Verifier-Token':nonce,'X-Internal-Stage':kind,...headers}});}catch{throw Error('verification-unavailable');}
  if(response.status===422)throw Error('verifier-validation');
  if(!response.ok)throw Error('verification-unavailable');return response;
 }
 return {
  async inspect(bytes){const result=await json(await stage('inspect',bytes));if(result?.ok!==true)throw Error('verification-unavailable');},
  async mask(region){return new Uint8Array(await(await stage('mask',null,{'X-Internal-Region':JSON.stringify(region)})).arrayBuffer());},
  async prepare(binding,id,source,candidate){if(id!==binding.requestId)throw Error('Invalid binding');const body=new Uint8Array(source.length+candidate.length+4);new DataView(body.buffer).setUint32(0,source.length);body.set(source,4);body.set(candidate,source.length+4);const result=await json(await stage('prepare',body,{'X-Internal-Binding':JSON.stringify(binding)}));if(!valid(result,binding)||!hex(result.expectedRgbaDigest)||!Number.isFinite(result.expiresAt))throw Error('verification-unavailable');return result;},
  async finalize(binding,id,proof,bytes){if(id!==binding.requestId)throw Error('Invalid binding');const result=await json(await stage('finalize',bytes,{'X-Internal-Binding':JSON.stringify(binding),'X-Internal-Proof':JSON.stringify(proof)}));if(!valid(result,binding)||!['verified','rejected'].includes(result.kind)||!hex(result.outputDigest)||!hex(result.actualRgbaDigest))throw Error('verification-unavailable');return result;},
 };
}

const hex=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
function valid(value,binding){return value&&value.requestId===binding.requestId&&value.parentId===binding.parentId&&value.sourceDigest===binding.files.source.sha256&&value.candidateDigest===binding.files.candidate.sha256&&value.pixelWidth===1024&&value.pixelHeight===1024&&['x','y','width','height'].every(k=>value.region?.[k]===binding.region[k]);}
async function json(response){
 try{const reader=response.body?.getReader();if(!reader)throw Error();const parts=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw Error();}parts.push(value);}const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('verification-unavailable');}
}
