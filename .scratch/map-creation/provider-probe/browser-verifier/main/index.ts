const limits={memoryLimitMb:256,workerTimeoutMs:150000,cpuTimeSoftLimitMs:1900,cpuTimeHardLimitMs:2000};
let retained;const reuse=Deno.env.get('PROBE_REUSE')==='1';
const origin='http://127.0.0.1:4186';
Deno.serve(async request=>{
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health')return Response.json({runtime:Deno.version,limits});
 if(path==='/internal-manifest')return new Response(await Deno.readFile('/verifier/fixtures/manifest.json'));
 if(/^\/internal\/(live|transparent|lowalpha|noise)-(source|candidate)\.png$/.test(path))return new Response(await Deno.readFile('/verifier/fixtures/'+path.split('/').at(-1)));
 const cors=request.headers.get('Origin');if(cors&&cors!==origin)return new Response('Origin denied',{status:403});
 if(path!=='/verify')return new Response('Unknown route',{status:404});
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Probe-Request','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});if(request.method!=='POST')return new Response('POST required',{status:405,headers});
 if(!['live','transparent','lowalpha','noise'].includes(request.headers.get('X-Probe-Request')))return Response.json({kind:'rejected',reason:'Unknown trusted request'},{status:403,headers});
 try{
  const worker=reuse&&retained?retained:await EdgeRuntime.userWorkers.create({servicePath:'/verifier/worker',...limits,envVars:[],forceCreate:true,noModuleCache:true});
  if(reuse)retained=worker;
  const forwarded=new Request('http://fixture.local/verify',{method:'POST',body:request.body,headers:{'X-Probe-Request':request.headers.get('X-Probe-Request')},duplex:'half'});EdgeRuntime.applySupabaseTag(request,forwarded);
  const response=await worker.fetch(forwarded);for(const [key,value]of Object.entries(headers))response.headers.set(key,value);return response;
 }catch(error){return Response.json({kind:'runtime-failed',reason:String(error)},{status:500,headers});}
});
