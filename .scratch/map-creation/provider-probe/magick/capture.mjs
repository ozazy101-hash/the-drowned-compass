import {readFile,writeFile,mkdir} from 'node:fs/promises';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {verify} from './verify.mjs';
const dir=new URL('../../provider-evidence/magick-edge-'+Date.now()+'/',import.meta.url);await mkdir(dir,{recursive:true});
const name='map-magick-edge-03-'+process.pid+'-'+Date.now();const results=[];let launchAttempted=false;
const execute=promisify(execFile),deadline=Date.now()+60000,outer=new AbortController();
// Asynchronous Docker calls keep the watchdog runnable, even when the daemon hangs.
const docker=async(args,{cleanup=false,timeout=5000}={})=>{
 const result=await execute('docker',args,{timeout:cleanup?1500:Math.max(1,Math.min(timeout,deadline-Date.now())),killSignal:'SIGKILL',maxBuffer:8*1024*1024,...(cleanup?{}:{signal:outer.signal})});
 return result.stdout+result.stderr;
};
let stopping;
const stop=()=>stopping??=(async()=>{try{await docker(['stop','-t','1',name],{cleanup:true});}catch{try{await docker(['kill',name],{cleanup:true});}catch{}}})();
const watchdog=setTimeout(()=>{outer.abort(Error('Outer 60-second deadline'));void stop();},60000);
try{
 launchAttempted=true;await docker(['run','--detach','--name',name,'--read-only','--memory','2048m','--memory-swap','2048m','--cpus','1','--tmpfs','/tmp:rw,size=256m','-e','DENO_DIR=/tmp/deno','--publish','127.0.0.1:4195:9000','--mount','type=bind,src='+new URL('.',import.meta.url).pathname+',dst=/magick,readonly','sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c','start','--main-service','/magick/main','--event-worker','/magick/events','--policy','per_worker','--max-parallelism','1','--user-worker-request-idle-timeout','150000'],{timeout:15000});
 for(let attempt=0;attempt<30;attempt++){outer.signal.throwIfAborted();try{const health=await fetch('http://127.0.0.1:4195/health',{signal:AbortSignal.any([outer.signal,AbortSignal.timeout(1000)])});if(health.ok){await writeFile(new URL('health.json',dir),await health.text());break;}}catch{}await new Promise(r=>setTimeout(r,100));}
 let liveAccepted=false;
 for(const mode of ['live','live-warm']){
  if(mode==='live-warm'&&!liveAccepted){results.push({mode,skipped:'Cold retained worker did not return an image; warm reuse unproven'});continue;}
  try{
  const start=performance.now();const response=await fetch('http://127.0.0.1:4195/'+mode,{signal:AbortSignal.any([outer.signal,AbortSignal.timeout(20000)])});const bytes=Buffer.from(await response.arrayBuffer());
  const result={mode,status:response.status,wallMs:performance.now()-start,initMs:response.headers.get('x-init-ms'),composeWallMs:response.headers.get('x-compose-wall-ms')};
  if(response.headers.get('content-type')?.startsWith('image/png')){
   if(mode==='live')liveAccepted=true;await writeFile(new URL(mode+'.png',dir),bytes);const fixture=mode.replace('-warm','');result.pixels=verify(await readFile(new URL('fixtures/'+fixture+'-source.png',import.meta.url)),await readFile(new URL('fixtures/'+fixture+'-candidate.png',import.meta.url)),bytes);
  }else result.error=bytes.toString();results.push(result);console.log(JSON.stringify(result));
  }catch(error){const failure={mode,error:String(error)};results.push(failure);console.log(JSON.stringify(failure));}
 }
}catch(error){results.push({transportError:String(error)});}finally{
 try{
 await writeFile(new URL('report.json',dir),JSON.stringify({results,configuration:{workerCPUHardMs:2000,workerMemoryMb:256,containerMemoryMb:2048,CPU:1,policy:'per_worker',package:'@imagemagick/magick-wasm@0.0.44'}},null,2));
 try{await writeFile(new URL('cgroup.txt',dir),await docker(['exec',name,'sh','-c','cat /sys/fs/cgroup/memory.peak /sys/fs/cgroup/memory.max /sys/fs/cgroup/cpu.max']));}catch(error){await writeFile(new URL('cgroup.txt',dir),String(error));}
 try{await writeFile(new URL('events.log',dir),await docker(['logs',name]));}catch{}
 }finally{
 clearTimeout(watchdog);if(launchAttempted){await stop();try{await writeFile(new URL('container-inspect.json',dir),await docker(['inspect',name],{cleanup:true}));}catch{}try{await docker(['rm',name],{cleanup:true});}catch{}}
 }
 console.log('Evidence '+dir.pathname);
}
