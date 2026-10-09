import {initialize,compose} from '../image.mjs';
const start=performance.now();
console.log(JSON.stringify({stage:'wasm-fetch-start',runtime:Deno.version}));
const wasm=new Uint8Array(await(await fetch('http://127.0.0.1:9000/wasm')).arrayBuffer());
console.log(JSON.stringify({stage:'wasm-initialize-start',bytes:wasm.length,elapsedMs:performance.now()-start}));
await initialize(wasm);
const initMs=performance.now()-start;
console.log(JSON.stringify({stage:'wasm-ready',initMs}));
Deno.serve(async request=>{
 const {caseName,region}=await request.json();const began=performance.now();
 try{
  const read=async name=>new Uint8Array(await(await fetch(`http://127.0.0.1:9000/fixture/${caseName}-${name}.png`)).arrayBuffer());
  const source=await read('source'),candidate=await read('candidate');
  const output=compose(source,candidate,region);
  return new Response(output,{headers:{'Content-Type':'image/png','X-Init-Ms':String(initMs),'X-Compose-Wall-Ms':String(performance.now()-began)}});
 }catch(error){return Response.json({error:String(error)},{status:422});}
});
