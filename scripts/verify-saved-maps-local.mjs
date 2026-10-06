import {spawnSync} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
// Sole disposable fixture writer. No credentials are emitted or written.
const container='supabase_db_the-drowned-compass';
function sql(source){const result=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:source,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);return result.stdout.trim();}
const settings=spawnSync('pnpm',['exec','supabase','status','-o','json'],{encoding:'utf8'});if(settings.status!==0)throw new Error('Local Supabase status unavailable.');
const config=JSON.parse(settings.stdout),dm=randomUUID(),player=randomUUID(),party=sql('select id from public.parties order by id limit 1;');
const prefix='Ticket06 fixture '+randomUUID(),revealedMap=randomUUID(),revealedObject=randomUUID();
const baseline=sql("select jsonb_build_object('slots',(select md5(string_agg(to_jsonb(s)::text,'' order by id)) from public.character_slots s),'members',(select count(*) from public.party_members),'handouts',(select count(*) from public.party_handouts),'objects',(select count(*) from storage.objects where bucket_id='party-handouts'));" );
function token(user){const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const unsigned=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user,role:'authenticated',aud:'authenticated',iss:config.API_URL+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600});return unsigned+'.'+createHmac('sha256',config.JWT_SECRET).update(unsigned).digest('base64url');}
let status=1;
try {
 sql(`begin;insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,confirmation_token,recovery_token,email_change_token_new,email_change,created_at,updated_at,raw_app_meta_data,raw_user_meta_data) values('${dm}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${dm}@verification.test',now(),'','','','',now(),now(),'{}','{}'),('${player}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${player}@verification.test',now(),'','','','',now(),now(),'{}','{}');insert into public.party_members(party_id,user_id,role)values('${party}','${dm}','dungeon-master'),('${party}','${player}','player');commit;`);
 const artwork=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP4XxGAFTEMLQkAnhxxwZ2rsCsAAAAASUVORK5CYII=','base64');
 const uploaded=await fetch(config.API_URL+'/storage/v1/object/party-handouts/'+party+'/'+revealedObject,{method:'POST',headers:{apikey:config.ANON_KEY,authorization:'Bearer '+token(dm),'content-type':'image/png'},body:artwork});if(!uploaded.ok)throw new Error('Disposable revealed image fixture could not upload.');
 sql(`insert into public.party_grid_maps(id,party_id,title,visibility,version,document,background)values('${revealedMap}','${party}','${prefix} revealed fixture','revealed',1,'{"columns":8,"rows":6,"feetPerSquare":5,"terrain":[{"x":1,"y":1,"kind":"floor"}],"edges":[]}',jsonb_build_object('x',1,'y',0,'width',6,'height',6,'pixelWidth',8,'pixelHeight',8,'size',${artwork.length},'mime','image/png','digest',repeat('a',64),'object_id','${revealedObject}'));`);
 const test=spawnSync('pnpm',['exec','playwright','test','--config=playwright.saved-maps.config.ts',...process.argv.slice(2)],{stdio:'inherit',env:{...process.env,MAP_FIXTURE_PREFIX:prefix,MAP_LIVE_REVEALED_ID:revealedMap,MAP_LIVE_REVEALED_OBJECT:revealedObject,MAP_LIVE_URL:config.API_URL,MAP_LIVE_KEY:config.ANON_KEY,MAP_LIVE_DM_JWT:token(dm),MAP_LIVE_PLAYER_JWT:token(player)}});status=test.status??1;
}finally{
 const maps=JSON.parse(sql(`select coalesce(jsonb_agg(id),'[]') from public.party_grid_maps where party_id='${party}' and title like '${prefix}%';`));
 const objects=JSON.parse(sql(`select coalesce(jsonb_agg(name),'[]') from storage.objects where bucket_id='party-handouts' and owner_id in('${dm}','${player}') and name like '${party}/%';`));
 if(maps.length){const ids=maps.map(id=>`'${id}'`).join(',');sql(`begin;delete from public.party_grid_map_requests where map_id in(${ids});delete from public.party_grid_maps where id in(${ids});commit;`);}
 if(objects.length){const result=await fetch(config.API_URL+'/storage/v1/object/party-handouts',{method:'DELETE',headers:{apikey:config.SERVICE_ROLE_KEY,authorization:'Bearer '+config.SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify({prefixes:objects})});if(!result.ok)throw new Error('Disposable image cleanup failed.');}
 sql(`begin;delete from public.party_members where user_id in('${dm}','${player}');delete from auth.users where id in('${dm}','${player}');commit;`);
 const after=sql("select jsonb_build_object('slots',(select md5(string_agg(to_jsonb(s)::text,'' order by id)) from public.character_slots s),'members',(select count(*) from public.party_members),'handouts',(select count(*) from public.party_handouts),'objects',(select count(*) from storage.objects where bucket_id='party-handouts'));" );
 if(after!==baseline)throw new Error('Local baseline changed during verification.');
 console.log(`Disposable fixture cleanup: ${maps.length} maps, ${objects.length} remaining image objects; original Character Records, memberships, Handouts and image count unchanged.`);
}
process.exitCode=status;
