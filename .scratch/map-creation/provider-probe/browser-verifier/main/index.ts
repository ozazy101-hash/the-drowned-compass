const limits={memoryLimitMb:256,workerTimeoutMs:150000,cpuTimeSoftLimitMs:1900,cpuTimeHardLimitMs:2000};
const prepared=new Map();const origin='http://127.0.0.1:4186';
Deno.serve(async request=>{
 const path=new URL(request.url).pathname;
 if(path==='/health')return Response.json({runtime:Deno.version,limits,mode:'staged; fresh oneshot worker per stage'});
 if(path==='/internal-manifest')return new Response(await Deno.readFile('/verifier/fixtures/manifest.json'));
 if(/^\/internal\/(live|transparent|lowalpha|noise)-(source|candidate)\.png$/.test(path))return new Response(await Deno.readFile('/verifier/fixtures/'+path.split('/').at(-1)));
 const cors=request.headers.get('Origin');if(cors&&cors!==origin)return new Response('Origin denied',{status:403});
 if(!['/prepare','/verify'].includes(path))return new Response('Unknown route',{status:404});
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Probe-Request','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return new Response('POST required',{status:405,headers});
 if(['X-Probe-Parent','X-Probe-Region','X-Probe-Source','X-Probe-Candidate','X-Probe-Digest','X-Internal-Proof','X-Internal-Stage'].some(key=>request.headers.has(key)))return Response.json({kind:'rejected',reason:'Client authority metadata not accepted'},{status:422,headers});
 const id=request.headers.get('X-Probe-Request');if(!['live','transparent','lowalpha','noise'].includes(id))return Response.json({kind:'rejected',reason:'Unknown trusted request'},{status:403,headers});
 if(path==='/prepare'&&request.body){const reader=request.body.getReader();try{while(true){const {value,done}=await reader.read();if(done)break;if(value.length){await reader.cancel();return Response.json({kind:'rejected',reason:'Prepare accepts identity only, no body'},{status:422,headers});}}}finally{reader.releaseLock();}}
 if(path==='/verify'&&(!prepared.has(id)||prepared.get(id).expiresAt<=Date.now()))return Response.json({kind:'rejected',reason:'Prepared proof missing/expired'},{status:422,headers});
 try{
  const worker=await EdgeRuntime.userWorkers.create({servicePath:'/verifier/worker',...limits,envVars:[],forceCreate:true,noModuleCache:true});
  const forwarded=new Request('http://fixture.local/',{method:'POST',...(path==='/verify'?{body:request.body,duplex:'half'}:{}),headers:{'X-Probe-Request':id,'X-Internal-Stage':path==='/prepare'?'prepare':'finalize',...(path==='/verify'?{'X-Internal-Proof':JSON.stringify(prepared.get(id))}:{})}});
  EdgeRuntime.applySupabaseTag(request,forwarded);const response=await worker.fetch(forwarded);
  if(path==='/prepare'){
   const result=await response.json();if(!response.ok)return Response.json(result,{status:response.status,headers});
   prepared.set(id,Object.freeze(structuredClone(result.proof)));
   // Hidden expected digest remains server RAM, never echoed as a client certificate.
   return Response.json({kind:'prepared',requestId:id,workerInstance:result.workerInstance,wallMs:result.wallMs},{headers});
  }
  for(const [key,value]of Object.entries(headers))response.headers.set(key,value);return response;
 }catch(error){return Response.json({kind:'runtime-failed',reason:String(error)},{status:500,headers});}
});
