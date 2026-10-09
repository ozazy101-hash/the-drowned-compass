import {prepareExpected,finalizeExpected,boundedBody} from '../decoder.mjs';
const instance=crypto.randomUUID();const bindings=await(await fetch('http://127.0.0.1:9000/internal-manifest')).json();
Deno.serve(async request=>{
 const start=performance.now(),id=request.headers.get('X-Probe-Request'),stage=request.headers.get('X-Internal-Stage'),binding=bindings[id];
 console.log(JSON.stringify({stage,workerInstance:instance,requestId:id}));
 if(!binding)return Response.json({kind:'rejected',reason:'Unknown trusted request'},{status:403});
 try{
  if(stage==='prepare'){
   const read=async kind=>new Uint8Array(await(await fetch(`http://127.0.0.1:9000/internal/${id}-${kind}.png`)).arrayBuffer());
   const proof=await prepareExpected(binding,id,await read('source'),await read('candidate'));
   return Response.json({proof,workerInstance:instance,wallMs:performance.now()-start});
  }
  if(stage!=='finalize')throw Error('Unknown internal stage');
  const proof=JSON.parse(request.headers.get('X-Internal-Proof')??'null');
  const result=await finalizeExpected(binding,id,proof,await boundedBody(request.body));
  return Response.json({...result,workerInstance:instance,wallMs:performance.now()-start},{status:result.kind==='verified'?200:422});
 }catch(error){return Response.json({kind:'rejected',reason:String(error),requestId:id,workerInstance:instance},{status:422});}
});
