import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {journeys,sketch} from './corpus.mjs';
import {runIntent,openAIProvider,settings,MODEL} from './probe.mjs';
const evidence=fileURLToPath(new URL('../provider-evidence/',import.meta.url));
if(process.argv[2]!=='--live')throw Error('Use --live explicitly; no paid call happens by default.');
await mkdir(evidence,{recursive:true});
const report={mode:'live',model:MODEL,at:new Date().toISOString(),runtime:process.version,credentialPresent:Boolean(process.env.OPENAI_API_KEY),calls:0,settings,journeys:[],billingCostUSD:null};
if(!report.credentialPresent) {
 report.blocker='OPENAI_API_KEY absent from probe process environment';
 await writeFile(join(evidence,'live-blocker.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({calls:0,blocker:report.blocker}));process.exitCode=2;
} else {
 // A completed or ambiguous run must never be overwritten/retried automatically.
 const directory=join(evidence,`live-${Date.now()}`);await mkdir(directory);
 const reference=sketch();await writeFile(join(directory,'sea-cave-input.png'),reference);
 let previous;
 for(const journey of journeys) {
  const intent={...journey,requestId:`probe-${journey.id}-${Date.now()}`};delete intent.id;
  if(journey.kind==='reference')intent.source={identity:'fixed-sea-cave-sketch',bytes:reference};
  if(journey.kind==='revise')intent.source={identity:previous.requestId,bytes:previous.bytes};
  await writeFile(join(directory,`${journey.id}-instructions.json`),JSON.stringify({...intent,source:intent.source?{identity:intent.source.identity,file:journey.kind==='reference'?'sea-cave-input.png':'sea-cave-output.png'}:null},null,2)+'\n');
  const started=performance.now();report.calls++;
  const adapter=openAIProvider({apiKey:process.env.OPENAI_API_KEY});
  const result=await runIntent(intent,{generate:async input=>{
   if(input.mask)await writeFile(join(directory,`${journey.id}-mask.png`),input.mask);
   const output=await adapter.generate(input);
   if(output.bytes)await writeFile(join(directory,`${journey.id}-raw.png`),output.bytes);
   return output;
  }});
  const {bytes,...metadata}=result;
  report.journeys.push({id:journey.id,latencyMs:Math.round(performance.now()-started),...metadata,geometryDriftObservation:'Pending human inspection of retained input/raw/accepted output'});
  if(bytes)await writeFile(join(directory,`${journey.id}-output.png`),bytes);
  await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(result.kind!=='accepted'){report.blocker=`Stopped at ${journey.id}: ${result.kind}/${result.code}`;break;}
  previous=result;
 }
 await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({directory,calls:report.calls,blocker:report.blocker??null}));
 if(report.blocker)process.exitCode=2;
}
