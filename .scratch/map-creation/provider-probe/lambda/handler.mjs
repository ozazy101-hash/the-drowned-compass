// Local RIE transport fixture only. This is not an AWS/Supabase authentication adapter.
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {performance} from 'node:perf_hooks';
import {Buffer} from 'node:buffer';
import {createArtworkVerifier,sha256} from './worker.mjs';
const origin='http://127.0.0.1:8081',authorization='local-rie-fixture-only',objects=new Map();
let calls=0,loseNext=false;
const ready=(async()=>{
 objects.set('/source.png',await readFile(new URL('./corpus/source.png',import.meta.url)));
 objects.set('/candidate.png',await readFile(new URL('./corpus/candidate.png',import.meta.url)));
 const server=createServer(async(request,response)=>{
  if(request.headers.authorization!==authorization){response.writeHead(403);response.end();return;}
  const path=request.url;
  if(request.method==='PUT'){
   if(request.headers['if-none-match']!=='*'||objects.has(path)){response.writeHead(412);response.end();return;}
   const chunks=[];for await(const chunk of request)chunks.push(chunk);const bytes=Buffer.concat(chunks);
   if(bytes.length>20*1024*1024||sha256(bytes)!==request.headers['x-content-sha256']){response.writeHead(422);response.end();return;}
   objects.set(path,bytes);
   if(loseNext){loseNext=false;request.socket.destroy();return;}
   response.writeHead(201);response.end();return;
  }
  if(!objects.has(path)){response.writeHead(404);response.end();return;}
  response.writeHead(200,{'content-type':'image/png'});response.end(objects.get(path));
 });
 await new Promise(resolve=>server.listen(8081,'127.0.0.1',resolve));server.unref();
})();
const descriptor=(path,bytes,deadline)=>({url:origin+path,digest:sha256(bytes),size:bytes.length,mime:'image/png',width:1024,height:1024,expiresAt:deadline});
export async function handler(event){
 const cpu=process.cpuUsage(),started=performance.now();await ready;calls++;
 const operationId=event.operationId??'op-rie-one',deadline=Date.now()+55000;
 const source=descriptor('/source.png',objects.get('/source.png'),deadline),candidate=descriptor('/candidate.png',objects.get('/candidate.png'),deadline);
 const intent={mode:event.mode??'verify',operationId,sourceIdentity:'synthetic-retained-sea-cave',authorization,deadline,source,candidate,region:{x:650,y:160,width:220,height:240}};
 if(event.loseStoreResponse)loseNext=true;
 if(intent.mode==='reverify'){
  const path=`/provisional/${operationId}.png`,bytes=objects.get(path);
  if(!bytes)return {kind:'rejected',code:'no-provisional-fixture'};
  intent.provisional={...descriptor(path,bytes,deadline),operationId,sourceIdentity:intent.sourceIdentity,sourceDigest:source.digest,candidateDigest:candidate.digest,region:intent.region};
 }
 const result=await createArtworkVerifier({storageOrigin:origin,authorization}).verifyArtwork(intent);
 const elapsed=process.cpuUsage(cpu),stats={node:process.version,architecture:process.arch,invocation:calls,wallMs:Math.round(performance.now()-started),cpuMs:Math.round((elapsed.user+elapsed.system)/1000),processMemory:process.memoryUsage(),cgroup:{}};
 for(const name of ['memory.peak','memory.current','memory.max','cpu.max'])try{stats.cgroup[name]=(await readFile(`/sys/fs/cgroup/${name}`,'utf8')).trim();}catch{stats.cgroup[name]='unavailable';}
 return {...result,stats};
}
