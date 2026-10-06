import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
// Only local stack credentials are read; never echo credential values.
const status=JSON.parse(execFileSync('supabase',['status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
const url=status.API_URL,key=status.ANON_KEY,service=status.SERVICE_ROLE_KEY;
if(!url?.startsWith('http://127.0.0.1:'))throw new Error('Verification requires local Supabase.');
const admin=createClient(url,service,{auth:{persistSession:false}}),party='00000000-0000-4000-8000-000000000001';
const started=new Date().toISOString(),nonce=randomUUID(),password=`Verify-${randomUUID()}!`;
const users=[],paths=[];let count=0;
const check=(condition,message)=>{assert(condition,message);count++;console.log(`ok ${count} - ${message}`);};
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP4XxGAFTEMLQkAnhxxwZ2rsCsAAAAASUVORK5CYII=','base64');
try{
  const clients={};
  for(const role of ['dungeon-master','player']){
    const email=`handout-${role}-${nonce}@verification.test`;
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw created.error;users.push(created.data.user.id);
    const member=await admin.from('party_members').insert({party_id:party,user_id:created.data.user.id,role});if(member.error)throw member.error;
    const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url'); const unsigned=`${encoded({alg:'HS256',typ:'JWT'})}.${encoded({sub:created.data.user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+1800})}`; const jwt=`${unsigned}.${createHmac('sha256',status.JWT_SECRET).update(unsigned).digest('base64url')}`; const client=createClient(url,key,{accessToken:async()=>jwt}); clients[role]={client,email,jwt};
  }
  const dm=clients['dungeon-master'].client,player=clients.player.client,anon=createClient(url,key,{auth:{persistSession:false}}),id=randomUUID(),path=`${party}/${id}`;paths.push(path);
  const uploaded=await dm.storage.from('party-handouts').upload(path,image,{contentType:'image/png'});check(!uploaded.error,'DM genuine HTTP object upload');
  const row={id,party_id:party,title:'Storage verification',mime:'image/png',size:image.length,digest:'a'.repeat(64)};
  const committed=await dm.from('party_handouts').insert(row).select().single();check(!committed.error,'DM metadata commit references actual usable object');
  check(!(await dm.storage.from('party-handouts').download(path)).error,'DM genuine HTTP private object download');
  check((await dm.from('party_handouts').select('id').eq('id',id)).data?.length===1,'DM enumerates committed private metadata');
  for(const [role,client] of [['Player',player],['anonymous',anon]]){
    const metadata=await client.from('party_handouts').select('id').eq('id',id);check(Boolean(metadata.error)||metadata.data?.length===0,`${role} direct metadata denied`);
    check(Boolean((await client.storage.from('party-handouts').download(path)).error),`${role} direct private object HTTP denied`);
    check(Boolean((await client.storage.from('party-handouts').createSignedUrl(path,60)).error),`${role} signed URL issuance denied`);
    const listed=await client.storage.from('party-handouts').list(party);check(Boolean(listed.error)||listed.data?.length===0,`${role} object listing denied`);
    check(Boolean((await client.storage.from('party-handouts').upload(`${party}/${randomUUID()}`,image,{contentType:'image/png'})).error),`${role} object upload denied`);
    check(Boolean((await client.from('party_handouts').insert({...row,id:randomUUID()})).error),`${role} metadata insert denied`);
  }
  const publicResponse=await fetch(`${url}/storage/v1/object/public/party-handouts/${path}`);check(!publicResponse.ok,'public object endpoint cannot bypass private bucket');
  check(Boolean((await dm.storage.from('party-handouts').upload(path,image,{contentType:'image/png',upsert:true})).error),'DM cannot overwrite committed object');
  await dm.storage.from('party-handouts').remove([path]);check(!(await dm.storage.from('party-handouts').download(path)).error,'compensation/delete cannot remove committed object');
  check(Boolean((await dm.from('party_handouts').insert({...row,id:randomUUID()})).error),'metadata without object denied');
  check(Boolean((await dm.storage.from('party-handouts').upload(`ffffffff-ffff-4fff-8fff-ffffffffffff/${randomUUID()}`,image,{contentType:'image/png'})).error),'DM cannot upload into another Party');
  check(Boolean((await dm.storage.from('party-handouts').upload(`${party}/${randomUUID()}`,Buffer.from('svg'),{contentType:'image/svg+xml'})).error),'storage rejects unsupported MIME');
  const staged=`${party}/${randomUUID()}`;paths.push(staged);await dm.storage.from('party-handouts').upload(staged,image,{contentType:'image/png'});await dm.storage.from('party-handouts').remove([staged]);check(Boolean((await dm.storage.from('party-handouts').download(staged)).error),'uncommitted object compensation permitted');
  const command=async(kind,version,request= randomUUID(),extra={})=>dm.rpc('change_party_handout',{p_id:id,p_expected_version:version,p_request_id:request,p_kind:kind,...extra});
  const revealRequest=randomUUID();const reveal=await command('reveal',1,revealRequest);check(!reveal.error&&reveal.data.item.visibility==='revealed','DM reveal commits persistent visibility');
  check((await player.from('party_handouts').select('id').eq('id',id)).data?.length===1,'Player direct metadata includes revealed Handout');
  check(!(await player.storage.from('party-handouts').download(path)).error,'Player direct HTTP download succeeds only when revealed');
  check(Boolean((await anon.storage.from('party-handouts').download(path)).error),'anonymous cannot download revealed private-bucket object');
  const same=await command('reveal',1,revealRequest);check(same.data.item.version===2,'immediate command retry is idempotent');
  const stale=await command('withdraw',1);check(stale.data.ok===false&&stale.data.item.visibility==='revealed','stale withdrawal reports conflict without changing visibility');
  check(Boolean((await player.rpc('change_party_handout',{p_id:id,p_expected_version:2,p_request_id:randomUUID(),p_kind:'withdraw'})).error),'Player lifecycle RPC denied');
  const badId=randomUUID();const failed=await command('replace',2,badId,{p_object_id:badId,p_digest:'b'.repeat(64),p_mime:'image/png',p_size:image.length});check(Boolean(failed.error),'replacement with missing object rejected atomically');
  check(!(await player.storage.from('party-handouts').download(path)).error,'old content remains usable after failed replacement');
  const nextId=randomUUID(),nextPath=`${party}/${nextId}`;paths.push(nextPath);await dm.storage.from('party-handouts').upload(nextPath,image,{contentType:'image/png'});
  check(Boolean((await player.storage.from('party-handouts').download(nextPath)).error),'staged replacement remains private before reference switch');
  const replaced=await command('replace',2,nextId,{p_object_id:nextId,p_digest:'b'.repeat(64),p_mime:'image/png',p_size:image.length});check(!replaced.error&&replaced.data.item.visibility==='revealed'&&replaced.data.item.title==='Storage verification'&&replaced.data.item.content_version===2,'replacement retains title/visibility and switches content version');
  check(Boolean((await player.storage.from('party-handouts').download(path)).error),'fresh access to obsolete object denied after replacement');
  check(!(await player.storage.from('party-handouts').download(nextPath)).error,'current revealed replacement downloads');
  await dm.storage.from('party-handouts').remove([path]);check(Boolean((await dm.storage.from('party-handouts').download(path)).error),'obsolete replacement object cleanup permitted');
  check(!(await dm.storage.from('party-handouts').download(nextPath)).error,'cleanup preserves referenced replacement');
  const signed=await player.storage.from('party-handouts').createSignedUrl(nextPath,60);check(!signed.error,'authorized external signed URL is temporary capability');
  const withdrawn=await command('withdraw',3);check(!withdrawn.error&&withdrawn.data.item.visibility==='private','withdrawal retains private metadata');
  check((await player.from('party_handouts').select('id').eq('id',id)).data?.length===0,'withdrawal removes Player enumeration');
  check(Boolean((await player.storage.from('party-handouts').download(nextPath)).error),'fresh authenticated download denied after withdrawal');
  check(Boolean((await player.storage.from('party-handouts').createSignedUrl(nextPath,60)).error),'new signed URL issuance denied after withdrawal');
  check(!(await dm.storage.from('party-handouts').download(nextPath)).error,'DM retains withdrawn content');
  check((await fetch(signed.data.signedUrl)).ok,'previously minted external signed URL remains valid until expiry (documented)');
  const late=await command('reveal',1,revealRequest);check(late.data.ok===false&&late.data.item.visibility==='private','old command retry cannot undo later withdrawal');
  // Force the actual HTTP cleanup into the metadata transaction's lock window.
  const raceId=randomUUID(),racePath=`${party}/${raceId}`;paths.push(racePath);
  await dm.storage.from('party-handouts').upload(racePath,image,{contentType:'image/png'});
  const sql=spawn('docker',['exec','-i','supabase_db_the-drowned-compass','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});
  let stderr='';sql.stderr.on('data',chunk=>{stderr+=chunk;});
  const finished=new Promise((resolve,reject)=>sql.on('exit',code=>code===0?resolve():reject(new Error(stderr))));
  const held=new Promise(resolve=>sql.stdout.on('data',chunk=>{if(String(chunk).includes('HANDOUT_COMMIT_HELD'))resolve();}));
  sql.stdin.end(`begin;insert into public.party_handouts(id,party_id,title,mime,size,digest) values('${raceId}','${party}','Storage verification','image/png',${image.length},repeat('a',64));select 'HANDOUT_COMMIT_HELD';select pg_sleep(2);commit;`);
  await held;const racedCleanup=dm.storage.from('party-handouts').remove([racePath]);await Promise.all([finished,racedCleanup]);
  check(!(await dm.storage.from('party-handouts').download(racePath)).error,'HTTP compensation racing metadata commit preserves actual object');
  check((await dm.from('party_handouts').select('id').eq('id',raceId)).data?.length===1,'racing metadata remains committed and usable');
  console.log(`Storage HTTP: ${count} assertions passed.`);
  const result=spawnSync('pnpm',['exec','playwright','test',`--config=${process.env.HANDOUT_TEST_CONFIG??'playwright.handouts.config.ts'}`,...(process.env.HANDOUT_TEST_GREP?['--grep',process.env.HANDOUT_TEST_GREP]:[])],{stdio:'inherit',env:{...process.env,HANDOUT_LIVE_URL:url,HANDOUT_LIVE_KEY:key,HANDOUT_LIVE_DM_JWT:clients['dungeon-master'].jwt,HANDOUT_LIVE_PLAYER_JWT:clients.player.jwt}});if(result.status!==0)throw new Error(`Focused browser verification failed (${result.status}).`);
}finally{
  const rows=await admin.from('party_handouts').select('id,party_id,title,object_id').gte('created_at',started);
  const owned=(rows.data??[]).filter(row=>row.title==='Storage verification'||row.title==='Adapter verify'||row.title==='Renamed adapter verify'||row.title==='Local lifecycle'||row.title.startsWith('Lifecycle '));
  for(const row of owned){const deleted=await admin.from('party_handouts').delete().eq('id',row.id);if(deleted.error)throw deleted.error;paths.push(`${row.party_id}/${row.object_id}`);}
  // Include unreferenced stages/old versions owned by these disposable users,
  // including requests whose responses failed before the UI could retry.
  if(users.length){const names=execFileSync('docker',['exec','supabase_db_the-drowned-compass','psql','-U','postgres','-d','postgres','-Atc',`select name from storage.objects where bucket_id='party-handouts' and owner_id in (${users.map(id=>`'${id.replaceAll("'","''")}'`).join(',')})`],{encoding:'utf8'}).trim();if(names)paths.push(...names.split('\n'));}
  if(paths.length){const removed=await admin.storage.from('party-handouts').remove([...new Set(paths)]);if(removed.error)throw removed.error;}
  for(const id of users){await admin.from('party_members').delete().eq('user_id',id);const deleted=await admin.auth.admin.deleteUser(id);if(deleted.error)throw deleted.error;}
  console.log('Disposable local metadata, objects, memberships and users cleaned.');
}
