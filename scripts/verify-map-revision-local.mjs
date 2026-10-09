import {spawnSync} from 'node:child_process';
import {randomUUID,createHmac} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {localSettings,sql,snapshot} from './local-verification.mjs';
const lock='/private/tmp/ticket08-local-verification.lock';
try{mkdirSync(lock);}catch{throw Error('Another Ticket08 fixture verification holds the lease');}
process.once('exit',()=>rmSync(lock,{recursive:true}));
const config=localSettings(),baseline=snapshot(),owned=Array.from({length:9},()=>({party:randomUUID(),dm:randomUUID()})),player=randomUUID();
const name='map-revision-08-'+randomUUID().slice(0,8),temp=mkdtempSync('/private/tmp/map-revision-08-');
const image='sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c';
function token(user){const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user,role:'authenticated',aud:'authenticated',iss:config.API_URL+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return unsigned+'.'+createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url');}
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});if(r.status!==0)throw Error(r.stderr||'Local command failed');return r.stdout.trim();};
writeFileSync('.scratch/map-creation/evidence/08-baseline-before.json',JSON.stringify(baseline,null,2)+'\n');
writeFileSync('.scratch/map-creation/evidence/08-owned-'+name+'.json',JSON.stringify({owned,player,baseline},null,2)+'\n');
let status=1,started=false;
try{
 for(const [index,{party,dm}]of owned.entries())sql(`begin;insert into public.parties(id,name)values('${party}','Ticket08 browser fixture');insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)values('${dm}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${dm}@verification.test',now(),'','','','',now(),now(),'{}','{}');insert into public.party_members(party_id,user_id,role)values('${party}','${dm}','dungeon-master');insert into public.party_map_generation_settings(party_id,fixture_enabled,quota,wait_seconds)values('${party}',true,5,${index===4?1:120});commit;`);
 sql(`insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)values('${player}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${player}@verification.test',now(),'','','','',now(),now(),'{}','{}');insert into public.party_members(party_id,user_id,role)values('${owned[0].party}','${player}','player');`);
 writeFileSync(temp+'/env',`SUPABASE_URL=http://host.docker.internal:54321\nSUPABASE_ANON_KEY=${config.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${config.SERVICE_ROLE_KEY}\nMAP_CONTROLLER_ORIGIN=http://127.0.0.1:4178\nMAP_LOCAL_FIXTURE_FILE=/fixture.png\nMAP_LOCAL_FIXTURE_UNCERTAIN_USER=${owned[4].dm}\nDENO_DIR=/tmp/deno\n`,{mode:0o600});
 writeFileSync(temp+'/fixture.png',readFileSync('.scratch/map-creation/provider-evidence/live-1791537498387/sea-cave-raw.png'));
 console.log('Starting explicitly labelled fixture application with fresh bounded Edge workers.');
 started=true;run('docker',['run','--detach','--name',name,'--read-only','--memory','2048m','--memory-swap','2048m','--cpus','1','--tmpfs','/tmp:rw,size=256m','--env-file',temp+'/env','--publish','127.0.0.1:49178:9000','--mount',`type=bind,src=${process.cwd()}/supabase/functions/map-generation,dst=/generation,readonly`,'--mount',`type=bind,src=${temp}/fixture.png,dst=/fixture.png,readonly`,image,'start','--main-service','/generation','--event-worker','/generation/events','--policy','oneshot','--max-parallelism','1','--user-worker-request-idle-timeout','150000']);started=true;
 let ready=false;for(let n=0;n<30;n++){try{const r=await fetch('http://127.0.0.1:49178');if(r.status===405){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}if(!ready)throw Error('Owned fixture runtime did not become ready');
 const r=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=playwright.map-revision.config.ts',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,MAP_LIVE_URL:config.API_URL,MAP_LIVE_KEY:config.ANON_KEY,MAP_LIVE_PARTY_IDS:JSON.stringify(owned.map(x=>x.party)),MAP_LIVE_DM_JWTS:JSON.stringify(owned.map(x=>token(x.dm))),MAP_LIVE_PLAYER_JWT:token(player),MAP_LIVE_LATE_JWT:token(owned[4].dm)}});status=r.status??1;
 }finally{
 const failures=[];const attempt=async(label,action)=>{try{return await action();}catch{failures.push(label);return undefined;}};
 if(started){await attempt('owned runtime logs',()=>writeFileSync('.scratch/map-creation/evidence/08-runtime.log',(()=>{const r=spawnSync('docker',['logs',name],{encoding:'utf8'});if(r.status!==0)throw Error('Owned runtime logs unavailable');return r.stdout+r.stderr;})()));await attempt('owned runtime removal',()=>run('docker',['rm','--force',name]));}
 const parties=owned.map(x=>`'${x.party}'`).join(','),users=[...owned.map(x=>x.dm),player].map(x=>`'${x}'`).join(',');
 const objects=await attempt('owned object inventory',()=>JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name)),'[]')from storage.objects where split_part(name,'/',1)in(${parties});`)));
 await attempt('owned database cleanup',()=>sql(`begin;delete from public.party_map_generation_jobs where party_id in(${parties});delete from public.party_map_presentations where party_id in(${parties});delete from public.party_map_presentation_requests where party_id in(${parties});delete from public.party_map_reveal_masks where party_id in(${parties});delete from public.party_map_artwork_versions where party_id in(${parties});delete from public.party_grid_map_requests where party_id in(${parties});delete from public.party_grid_maps where party_id in(${parties});delete from public.parties where id in(${parties});delete from auth.users where id in(${users});commit;`));
 for(const bucket of ['party-handouts','private-map-generation'])await attempt('owned '+bucket+' cleanup',async()=>{const prefixes=(objects??[]).filter(o=>o.bucket===bucket).map(o=>o.name);if(prefixes.length){const r=await fetch(config.API_URL+'/storage/v1/object/'+bucket,{method:'DELETE',headers:{apikey:config.SERVICE_ROLE_KEY,Authorization:'Bearer '+config.SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({prefixes})});if(!r.ok)throw Error('Owned storage cleanup failed');}});
 await attempt('exact fixture baseline',()=>{const final=snapshot();writeFileSync('.scratch/map-creation/evidence/08-baseline-final.json',JSON.stringify(final,null,2)+'\n');if(JSON.stringify(final)!==JSON.stringify(baseline))throw Error('Baseline mismatch');});
 await attempt('owned temporary files',()=>rmSync(temp,{recursive:true}));
 if(failures.length)throw Error('Ticket08 cleanup needs attention: '+failures.join(', '));
 console.log(`Exact baseline restored; ${owned.length} owned parties/DMs, one Player and ${(objects??[]).length} owned objects cleaned; container49178 removed.`);
}
process.exitCode=status;
