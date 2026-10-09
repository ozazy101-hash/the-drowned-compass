import {test,expect} from '@playwright/test';
import {png} from './handout-fixtures';
test('real DM/player/anonymous authority denies known map paths and old commands while preserving mixed Handout grants',async({page})=>{
 test.skip(!process.env.MAP_LIVE_URL,'Needs genuine local Supabase fixture.');await page.goto('./');
 const result=await page.evaluate(async({url,key,dmJwt,playerJwt,image,prefix,mixedId,mixedObject})=>{
  const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>dmJwt,auth:{persistSession:false}});
  const content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);
  const familyId=crypto.randomUUID(),requestId=crypto.randomUUID(),document=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor({columns:8,rows:6}).snapshot().document;
  const artwork=new File([new Uint8Array(image)],'map.png',{type:'image/png'});
  const first=await content.attachMapVersion({familyId,requestId,expectedVersion:0,title:prefix+' raw authority',document,artwork,reference:artwork,instructions:'Private reference'});if(!first.ok)throw new Error('Fixture create conflicted');
  const second=await content.saveMap({id:familyId,requestId:crypto.randomUUID(),expectedVersion:1,title:prefix+' raw authority',document,background:artwork});if(!second.ok)throw new Error('Fixture replacement conflicted');
  const workspace=await content.readMapWorkspace();await content.chooseMapPresentation({versionId:requestId,expectedRevision:workspace.presentation.revision,requestId:crypto.randomUUID(),newMap:true});
  const rows=(await client.from('party_map_artwork_versions').select('*').eq('family_id',familyId)).data!;const party=rows[0].party_id;
  const paths=[...new Set(rows.flatMap(v=>[v.background,v.reference].filter(Boolean).map(v=>`${party}/${v.object_id}`)))];
  const headers=(jwt:string)=>({apikey:key,authorization:'Bearer '+jwt});
  let dmBytes=0,playerDenied=0,anonDenied=0;
  for(const path of paths){if((await fetch(`${url}/storage/v1/object/party-handouts/${path}`,{headers:headers(dmJwt),cache:'no-store'})).ok)dmBytes++;if(!(await fetch(`${url}/storage/v1/object/party-handouts/${path}`,{headers:headers(playerJwt),cache:'no-store'})).ok)playerDenied++;if(!(await fetch(`${url}/storage/v1/object/party-handouts/${path}`,{headers:headers(key),cache:'no-store'})).ok)anonDenied++;}
  const tables=['party_grid_maps','party_grid_map_requests','party_map_artwork_versions','party_map_presentations','party_map_presentation_requests'];let playerTables=0,anonTables=0;
  for(const table of tables){const response=await fetch(`${url}/rest/v1/${table}?select=*`,{headers:headers(playerJwt),cache:'no-store'});if(response.ok&&(await response.json()).length===0)playerTables++;if(!(await fetch(`${url}/rest/v1/${table}?select=*`,{headers:headers(key),cache:'no-store'})).ok)anonTables++;}
  let oldCommands=0;for(const kind of ['reveal','withdraw']){const outcome=await client.rpc('change_party_grid_map',{p_id:familyId,p_expected_version:2,p_request_id:crypto.randomUUID(),p_kind:kind,p_copy_id:null,p_title:null,p_client_signature:kind});if(outcome.error)oldCommands++;}
  const player=sdk.createClient(url,key,{accessToken:async()=>playerJwt,auth:{persistSession:false}});const playerContent=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(player);
  const mixed=await playerContent.open(mixedId);const mixedByteResponse=await fetch(`${url}/storage/v1/object/party-handouts/${party}/${mixedObject}`,{headers:headers(playerJwt),cache:'no-store'});
  const mixedMeta=(await player.from('party_grid_maps').select('id').eq('id',mixedId)).data;
  const signed=(await player.storage.from('party-handouts').createSignedUrl(paths[0],30)).error;
  return {paths:paths.length,dmBytes,playerDenied,anonDenied,playerTables,anonTables,oldCommands,private:(await content.loadMap(familyId)).visibility,mixedBytes:mixed.size,mixedAllowed:mixedByteResponse.ok,mixedMeta: mixedMeta?.length,signedDenied:!!signed};
 },{url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,dmJwt:process.env.MAP_LIVE_DM_JWT!,playerJwt:process.env.MAP_LIVE_PLAYER_JWT!,image:Array.from(png),prefix:process.env.MAP_FIXTURE_PREFIX!,mixedId:process.env.MAP_LIVE_MIXED_ID!,mixedObject:process.env.MAP_LIVE_REVEALED_OBJECT!});
 expect(result).toEqual({paths:3,dmBytes:3,playerDenied:3,anonDenied:3,playerTables:5,anonTables:5,oldCommands:2,private:'private',mixedBytes:png.length,mixedAllowed:true,mixedMeta:0,signedDenied:true});
});
