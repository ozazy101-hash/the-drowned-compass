import {verifyBound,boundedBody} from '../decoder.mjs';
const instance=crypto.randomUUID();
const bindings=await(await fetch('http://127.0.0.1:9000/internal-manifest')).json();
Deno.serve(async request=>{
 const start=performance.now(),id=request.headers.get('X-Probe-Request'),binding=bindings[id];
 console.log(JSON.stringify({stage:'verify-start',workerInstance:instance,requestId:id}));
 if(!binding)return Response.json({kind:'rejected',reason:'Unknown trusted request'},{status:403});
 try{
  const read=async kind=>new Uint8Array(await(await fetch(`http://127.0.0.1:9000/internal/${id}-${kind}.png`)).arrayBuffer());
  const source=await read('source'),candidate=await read('candidate'),output=await boundedBody(request.body);
  const result=await verifyBound(binding,id,source,candidate,output);
  return Response.json({...result,requestId:id,parentId:binding.parentId,region:binding.region,workerInstance:instance,wallMs:performance.now()-start},{status:result.kind==='verified'?200:422});
 }catch(error){return Response.json({kind:'rejected',reason:String(error),requestId:id},{status:422});}
});
