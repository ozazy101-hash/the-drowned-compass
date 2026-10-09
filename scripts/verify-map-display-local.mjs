import {spawnSync} from 'node:child_process';
import {randomUUID,createHmac} from 'node:crypto';
import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {localSettings,sql,snapshot} from './local-verification.mjs';
const lock='/private/tmp/ticket10-local-verification.lock';mkdirSync(lock);process.once('exit',()=>rmSync(lock,{recursive:true}));
const config=localSettings(),baseline=snapshot(),owned=Array.from({length:2},()=>({party:randomUUID(),dm:randomUUID(),player:randomUUID()}));
writeFileSync('.scratch/map-creation/evidence/10-baseline-before.json',JSON.stringify(baseline,null,2)+'\n');
writeFileSync('.scratch/map-creation/evidence/10-owned-fixtures.json',JSON.stringify(owned,null,2)+'\n');
function token(user){const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user,role:'authenticated',aud:'authenticated',iss:config.API_URL+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return unsigned+'.'+createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url');}
let status=1;
try{
 for(const {party,dm,player} of owned){sql(`begin;insert into public.parties(id,name)values('${party}','Ticket10 display fixture');insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)values('${dm}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${dm}@verification.test',now(),'','','','',now(),now(),'{}','{}'),('${player}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${player}@verification.test',now(),'','','','',now(),now(),'{}','{}');insert into public.party_members(party_id,user_id,role)values('${party}','${dm}','dungeon-master'),('${party}','${player}','player');commit;`);}
 const r=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=playwright.map-display-live.config.ts',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,MAP_LIVE_URL:config.API_URL,MAP_LIVE_KEY:config.ANON_KEY,MAP_DISPLAY_OWNED:JSON.stringify(owned),MAP_DISPLAY_DM_JWTS:JSON.stringify(owned.map(x=>token(x.dm))),MAP_DISPLAY_PLAYER_JWTS:JSON.stringify(owned.map(x=>token(x.player)))}});status=r.status??1;
}finally{
 const parties=owned.map(x=>`'${x.party}'`).join(','),users=owned.flatMap(x=>[x.dm,x.player]).map(x=>`'${x}'`).join(',');
 const objects=JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'name',name)),'[]')from storage.objects where split_part(name,'/',1)in(${parties});`));
 sql(`begin;delete from public.party_handouts where party_id in(${parties});delete from public.party_map_presentations where party_id in(${parties});delete from public.party_map_presentation_requests where party_id in(${parties});delete from public.party_map_reveal_masks where party_id in(${parties});delete from public.party_map_artwork_versions where party_id in(${parties});delete from public.party_grid_map_requests where party_id in(${parties});delete from public.party_grid_maps where party_id in(${parties});delete from public.parties where id in(${parties});delete from auth.users where id in(${users});commit;`);
 for(const bucket of [...new Set(objects.map(x=>x.bucket))]){const prefixes=objects.filter(x=>x.bucket===bucket).map(x=>x.name);const r=await fetch(config.API_URL+'/storage/v1/object/'+bucket,{method:'DELETE',headers:{apikey:config.SERVICE_ROLE_KEY,Authorization:'Bearer '+config.SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({prefixes})});if(!r.ok)throw Error('Owned storage cleanup failed');}
 const final=snapshot();writeFileSync('.scratch/map-creation/evidence/10-baseline-final.json',JSON.stringify(final,null,2)+'\n');if(JSON.stringify(final)!==JSON.stringify(baseline))throw Error('Ticket10 baseline mismatch');
 console.log(`Ticket10 exact schema/data baseline restored; 2 owned parties,4 auth users,${objects.length} objects cleaned; no provider/backend runtime.`);
}
process.exitCode=status;
