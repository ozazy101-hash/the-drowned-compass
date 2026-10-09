import {prepareExpected,finalizeExpected,decode,boundedBody} from '../verifier/png.mjs';
import {encodeMask} from '../verifier/mask.mjs';
const instance=crypto.randomUUID();
Deno.serve(async request=>{
 try{
  const stage=request.headers.get('X-Internal-Stage');
  console.log(JSON.stringify({event:'verification-stage',stage,instance}));
  if(stage==='mask')return new Response(await encodeMask(JSON.parse(request.headers.get('X-Internal-Region')!)),{headers:{'Content-Type':'image/png'}});
  if(stage==='inspect'){await decode(await boundedBody(request.body));return Response.json({ok:true});}
  const binding=JSON.parse(request.headers.get('X-Internal-Binding')!);
  if(stage==='prepare'){
   const bytes=await boundedBody(request.body,40*1024*1024+4);if(bytes.length>40*1024*1024+4)throw Error('Encoded bound');
   const size=new DataView(bytes.buffer).getUint32(0);if(size<1||size>20*1024*1024||bytes.length-size-4>20*1024*1024)throw Error('Encoded bound');
   return Response.json(await prepareExpected(binding,binding.requestId,bytes.subarray(4,4+size),bytes.subarray(4+size)));
  }
  if(stage==='finalize')return Response.json(await finalizeExpected(binding,binding.requestId,JSON.parse(request.headers.get('X-Internal-Proof')!),await boundedBody(request.body)));
  throw Error('Unknown stage');
 }catch{return Response.json({error:'Unsupported PNG, invalid binding or pixel mismatch'},{status:422});}
});
