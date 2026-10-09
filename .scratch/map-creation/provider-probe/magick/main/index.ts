const limits={memoryLimitMb:256,workerTimeoutMs:150000,cpuTimeSoftLimitMs:1900,cpuTimeHardLimitMs:2000};
let retained;
Deno.serve(async request=>{
 const path=new URL(request.url).pathname;
 if(path==='/health')return Response.json({runtime:Deno.version,limits});
 if(path==='/wasm')return new Response(await Deno.readFile('/magick/deps/package/dist/x86/magick.wasm'));
 if(/^\/fixture\/(live|transparent|lowalpha|noise)-(source|candidate)\.png$/.test(path))return new Response(await Deno.readFile('/magick/fixtures/'+path.split('/').at(-1)));
 const match=path.match(/^\/(live|transparent|lowalpha|noise)(-warm)?$/);if(!match)return new Response('Unknown case',{status:404});
 try{
  const worker=match[2]&&retained?retained:await EdgeRuntime.userWorkers.create({servicePath:'/magick/worker',...limits,envVars:[],forceCreate:true,noModuleCache:true});
  retained=worker;
  const forwarded=new Request('http://fixture.local/',{method:'POST',body:JSON.stringify({caseName:match[1],region:{x:650,y:160,width:220,height:240}})});
  EdgeRuntime.applySupabaseTag(request,forwarded);
  return await worker.fetch(forwarded);
 }catch(error){retained=undefined;return Response.json({error:String(error)},{status:500});}
});
