import {generationApplication} from './application.mjs';
import {supabaseGenerationStore,authenticatedUser} from './store.mjs';
import {liveProvider,fixtureProvider} from './provider.mjs';
import {boundedVerifier,verifierGateway} from './verifier.mjs';
// This entrypoint runs at the owned Edge supervisor, which can create fresh bounded
// workers. Fail closed on runtimes lacking that capability; no unbounded fallback.
const url=Deno.env.get('SUPABASE_URL')!,anonKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const fixture=Deno.env.get('MAP_LOCAL_FIXTURE_FILE');
if(fixture&&!url.startsWith('http://host.docker.internal:54321'))throw Error('Fixture mode requires known local Supabase');
const fixtureBytes=fixture?new Uint8Array(await Deno.readFile(fixture)):null;
const store=supabaseGenerationStore({url,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!});
const nonce=crypto.randomUUID();
const gateway=verifierGateway(EdgeRuntime,Deno.env.get('MAP_VERIFIER_WORKER_PATH')??'/generation/worker',nonce);
Deno.serve(async request=>{
 if(new URL(request.url).pathname==='/internal-verifier')return gateway(request);
 const origin=request.headers.get('Origin'),allowed=Deno.env.get('MAP_CONTROLLER_ORIGIN');
 if(origin&&origin!==allowed)return new Response('Origin denied',{status:403});
 const headers={'Access-Control-Allow-Origin':allowed??'','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-map-command,x-map-request','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return new Response('POST required',{status:405,headers});
 if([...request.headers.keys()].some(k=>k.startsWith('x-internal-')||['x-map-proof','x-map-digest','x-map-passed'].includes(k)))return Response.json({ok:false,code:'invalid-command'},{status:422,headers});
 try{const user=await authenticatedUser(request,{url,anonKey});
 const verifier=boundedVerifier({gatewayUrl:'http://127.0.0.1:9000/internal-verifier',nonce});
 const provider=fixtureBytes?fixtureProvider(fixtureBytes,{uncertain:user===Deno.env.get('MAP_LOCAL_FIXTURE_UNCERTAIN_USER')}):liveProvider({key:Deno.env.get('OPENAI_API_KEY'),encodeMask:verifier.mask});
 const app=generationApplication({mode:fixture?'fixture':'live',store,provider,verifier});
 const result=await app.handle(user,request);return result.bytes?new Response(result.bytes,{headers:{...headers,'Content-Type':'image/png'}}):Response.json(result,{status:result.ok?200:422,headers});}
 catch{return Response.json({ok:false,code:'access-denied'},{status:403,headers});}
});
