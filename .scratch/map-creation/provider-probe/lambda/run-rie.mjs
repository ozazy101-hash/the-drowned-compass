import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const execute=promisify(execFile);
export const image='public.ecr.aws/lambda/nodejs@sha256:9456eddcb52b414c777c7dfb4f9fb6871c103f63183871e74e505bdb3461104b';
const source=fileURLToPath(new URL('../',import.meta.url)),evidence=fileURLToPath(new URL('../../provider-evidence/',import.meta.url));
const name=`map-provider-probe-lambda03-${process.pid}`,directory=join(evidence,`lambda-rie-${Date.now()}`);
await mkdir(directory,{recursive:true});
const docker=async args=>(await execute('docker',args,{timeout:30000,maxBuffer:1024*1024})).stdout;
let containerStarted=false,deadlineExpired=false;
const timer=setTimeout(()=>{deadlineExpired=true;void docker(['kill',name]).catch(()=>{});},60000);
try{
 // Never pull implicitly; authorized pull happened separately and its digest is pinned.
 const identity=await docker(['image','inspect',image,'--format','{{.Id}} {{.Architecture}}']);
 await writeFile(join(directory,'image.txt'),identity);
 await docker(['run','--detach','--rm','--name',name,'--platform','linux/arm64','--read-only','--memory','2048m','--memory-swap','2048m','--cpus','1','--tmpfs','/tmp:rw,size=512m','--publish','127.0.0.1:4194:8080','--mount',`type=bind,src=${source},dst=/var/task,readonly`,image,'lambda/handler.handler']);containerStarted=true;
 const started=Date.now();let listening=false;
 while(Date.now()-started<10000&&!listening){try{await fetch('http://127.0.0.1:4194/',{signal:AbortSignal.timeout(300)});listening=true;}catch{listening=false;}if(!listening)await new Promise(resolve=>setTimeout(resolve,100));}
 if(!listening)throw Error('RIE startup did not bind authorized port');
 const cases=[['fresh',{operationId:'op-rie-one'}],['warm-reverify',{operationId:'op-rie-one',mode:'reverify'}],['lost-response',{operationId:'op-rie-two',loseStoreResponse:true}],['recovery',{operationId:'op-rie-two',mode:'reverify'}]];
 const outcomes=[];
 for(const [label,event]of cases){
  if(deadlineExpired)throw Error('Outer60s deadline reached');
  const response=await fetch('http://127.0.0.1:4194/2015-03-31/functions/function/invocations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),signal:AbortSignal.timeout(Math.max(1,60000-(Date.now()-started)))});
  const result=await response.json();outcomes.push({label,...result});await writeFile(join(directory,`${label}.json`),JSON.stringify(result,null,2)+'\n');
  const expected=label==='lost-response'?'uncertain':'verified';
  if(result.kind!==expected)throw Error(`Unexpected ${label}: ${JSON.stringify(result)}`);
  if(expected==='verified'&&(result.outsidePixelCount!==995776||result.changedOutsidePixels!==0||!result.insideMatchesCandidate))throw Error('Pixel proof failed');
 }
 await writeFile(join(directory,'summary.json'),JSON.stringify({mode:'local-Lambda-RIE',hostedProof:false,sourceImage:image,limits:{memoryMiB:2048,temporaryMiB:512,cpuQuota:1,outerTimeoutMs:60000},outcomes},null,2)+'\n');
 console.log(JSON.stringify({directory,outcomes:outcomes.map(result=>({label:result.label,kind:result.kind,stats:result.stats}))}));
}catch(error){await writeFile(join(directory,'blocker.txt'),String(error)+'\n');throw error;}
finally{
 clearTimeout(timer);
 if(containerStarted){try{const logs=await execute('docker',['logs',name],{timeout:5000,maxBuffer:1024*1024});await writeFile(join(directory,'container.log'),logs.stdout+logs.stderr);}catch{}try{await docker(['stop','--time','1',name]);}catch{try{await docker(['kill',name]);}catch{}}}
}
