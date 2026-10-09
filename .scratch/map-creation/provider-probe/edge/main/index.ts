import { Buffer } from 'node:buffer';
const limits={memoryLimitMb:256,workerTimeoutMs:150000,cpuTimeSoftLimitMs:1900,cpuTimeHardLimitMs:2000};
Deno.serve(async request=>{
 const path=new URL(request.url).pathname.slice(1),diagnostic=path==='live-diagnostic',mode=diagnostic?'live':path;
 if(mode==='health')return Response.json({runtime:Deno.version,limits});
 if(!['live','noise','minimum','overlimit'].includes(mode))return new Response('Unknown probe', {status:404});
 const payload=mode==='live'?{
  mode,
  source:Buffer.from(await Deno.readFile('/evidence/live-1791537498387/sea-cave-output.png')).toString('base64'),
  candidate:Buffer.from(await Deno.readFile('/evidence/live-1791537498387/added-chamber-raw.png')).toString('base64'),
 }: {mode};
 try {
  const worker=await EdgeRuntime.userWorkers.create({servicePath:'/probe/edge/worker',...limits,...(diagnostic?{cpuTimeSoftLimitMs:7900,cpuTimeHardLimitMs:8000}:{}),envVars:[],forceCreate:true,noModuleCache:true});
  const forwarded=new Request('http://fixture.local/probe',{method:'POST',body:JSON.stringify(payload)});
  EdgeRuntime.applySupabaseTag(request,forwarded);
  const response=await worker.fetch(forwarded);
  response.headers.set('X-Probe-CPU-Budget-Ms',diagnostic?'8000':'2000');
  return response;
 } catch(error) {return Response.json({kind:'runtime-failed',error:String(error),mode},{status:500});}
});
