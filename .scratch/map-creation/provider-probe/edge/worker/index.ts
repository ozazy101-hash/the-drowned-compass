import { Buffer } from 'node:buffer';
import {runIntent,fixtureProvider} from '../../probe.mjs';
import {encodePng,decodePng} from '../../png.mjs';
Deno.serve(async request=>{
 const started=performance.now(),before=Deno.memoryUsage();
 const payload=await request.json();let source,candidate;
 if(payload.mode==='live') {source=Buffer.from(payload.source,'base64');candidate=Buffer.from(payload.candidate,'base64');}
 else {
  const width=payload.mode==='overlimit'?4000:payload.mode==='minimum'?1024:1024,height=payload.mode==='minimum'?640:width;
  const rgba=Buffer.alloc(width*height*4);let state=0x12345678;
  for(let i=0;i<rgba.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;rgba[i]=state&255;}
  source=encodePng({width,height,rgba});
  for(let i=0;i<rgba.length;i++)rgba[i]^=255;
  candidate=encodePng({width,height,rgba});
 }
 const result=await runIntent({kind:'revise',requestId:'edge-fixture',prompt:'Fixture chamber',source:{identity:'retained-sea-cave',bytes:source},region:{x:650,y:160,width:220,height:240}},fixtureProvider(candidate));
 console.log(JSON.stringify({phase:'intent-completed',wallMs:Math.round(performance.now()-started),memory:Deno.memoryUsage(),kind:result.kind}));
 if(result.kind!=='accepted')return Response.json({mode:payload.mode,...result},{status:422});
 const original=decodePng(source),composed=decodePng(result.bytes);let outside=0,changed=0;
 for(let y=0;y<original.height;y++)for(let x=0;x<original.width;x++)if(!(x>=650&&x<870&&y>=160&&y<400)){
  outside++;const i=(y*original.width+x)*4;
  for(let c=0;c<4;c++)if(original.rgba[i+c]!==composed.rgba[i+c]){changed++;break;}
 }
 const {bytes,...metadata}=result;
 const output={mode:payload.mode,...metadata,wallMs:Math.round(performance.now()-started),memoryBefore:before,memoryAfter:Deno.memoryUsage(),verifiedOutsidePixels:outside,changedOutsidePixels:changed,runtime:Deno.version};
 console.log(JSON.stringify({probeOutcome:output}));
 return Response.json(output);
});
