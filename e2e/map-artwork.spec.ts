import {test,expect} from '@playwright/test';
import {png} from './handout-fixtures';
for(const adapter of ['local','supabase'] as const)test(`${adapter}: immutable artwork workspace branches saved sources, reconciles retries, observes and presents atomically`,async({page})=>{
 test.skip(adapter==='supabase'&&!process.env.MAP_LIVE_URL,'Needs genuine local Supabase fixture.');await page.goto('./');
 const result=await page.evaluate(async({image,adapter,url,key,dmJwt,playerJwt,prefix})=>{
  let jwt=dmJwt,content,signIn,client;
  if(adapter==='local'){const data=(await import('/the-drowned-compass/src/data/in-memory-party-data.ts')).createInMemoryPartyData();content=data.content;signIn=(role:'player'|'dungeon-master')=>data.signIn(role,role==='player'?'player-password':'dm-password');}
  else{const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');client=sdk.createClient(url,key,{accessToken:async()=>jwt});content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);signIn=async(role:string)=>{jwt=role==='player'?playerJwt:dmJwt;};}
  await signIn('dungeon-master');const domain=await import('/the-drowned-compass/src/domain/grid-map.ts');const document=domain.createGridMapEditor({columns:8,rows:6}).snapshot().document;
  const initialRevision=(await content.readMapWorkspace()).presentation.revision;
  const familyId=crypto.randomUUID(),file=new File([new Uint8Array(image)],'artwork.png',{type:'image/png'}),requestId=crypto.randomUUID();
  const input={familyId,expectedVersion:0,requestId,title:prefix+' retained '+adapter,document,artwork:file,reference:file,instructions:'Private coastline reference'};
  const first=await content.attachMapVersion(input);if(!first.ok)throw new Error('Unexpected create conflict');
  const retry=await content.attachMapVersion(input);const parent=await content.readMapVersion(requestId);const reference=(await content.openMapVersion(requestId,'reference')).size;
  const duplicate=(await content.readMapWorkspace()).versions.filter(v=>v.id===requestId).length;
  let reused=false;try{await content.attachMapVersion({...input,instructions:'different'});}catch{reused=true;}
  const editable=domain.createGridMapEditor(document);editable.draw('water',[{x:1.5,y:1.5}]);
  const replacement=await content.saveMap({id:familyId,requestId:crypto.randomUUID(),expectedVersion:1,title:input.title,document:editable.snapshot().document,background:file});if(!replacement.ok)throw new Error('Unexpected save conflict');
  const branchRequest=crypto.randomUUID(),branchInput={familyId,parentVersionId:requestId,requestId:branchRequest,expectedVersion:2,title:input.title,instructions:'From original saved source'};
  const branch=await content.attachMapVersion(branchInput);if(!branch.ok)throw new Error('Unexpected branch conflict');
  const branchRetry=await content.attachMapVersion(branchInput);const bytes=(await content.openMapVersion(requestId)).size;
  let draftRejected=false;try{await content.attachMapVersion({...branchInput,requestId:crypto.randomUUID(),expectedVersion:3,document:editable.snapshot().document});}catch{draftRejected=true;}
  let invalidRejected=false;try{await content.attachMapVersion({...branchInput,requestId:crypto.randomUUID(),expectedVersion:3,artwork:new File(['bad'],'bad.png',{type:'image/png'})});}catch{invalidRejected=true;}
  let workspace=await content.readMapWorkspace();const noImplicit=workspace.presentation.revision===initialRevision;
  const firstChoice={versionId:requestId,requestId:crypto.randomUUID(),expectedRevision:initialRevision,newMap:true};const firstPresentation=await content.chooseMapPresentation(firstChoice);if(!firstPresentation.ok)throw new Error('Unexpected choice conflict');
  const sameChoice=await content.chooseMapPresentation(firstChoice);
  const branchChoice={versionId:branchRequest,requestId:crypto.randomUUID(),expectedRevision:initialRevision+1};
  const next=await content.chooseMapPresentation(branchChoice);
  const semanticRetry=await content.chooseMapPresentation({newMap:false,requestId:branchChoice.requestId,expectedRevision:branchChoice.expectedRevision,versionId:branchChoice.versionId});
  const other=workspace.versions.find(v=>v.familyId===familyId&&v.id!==requestId&&v.id!==branchRequest)!;
  const incompatible=await content.chooseMapPresentation({versionId:other.id,requestId:crypto.randomUUID(),expectedRevision:initialRevision+2});
  const conflict=await content.chooseMapPresentation({versionId:other.id,requestId:crypto.randomUUID(),expectedRevision:initialRevision+1,newMap:true});
  const observed=await new Promise<boolean>(resolve=>{let stop=()=>{};const timeout=setTimeout(()=>{stop();resolve(false);},5000);stop=content.observeMapWorkspace(snapshot=>{if('workspace'in snapshot&&snapshot.workspace.presentation.revision===initialRevision+2){clearTimeout(timeout);stop();resolve(true);}});});
  workspace=await content.readMapWorkspace();const beforeDenied=workspace.versions.filter(v=>v.familyId===familyId).length;
  const raw=client?(await client.from('party_map_artwork_versions').select('*').eq('id',requestId).single()).data:null;
  await signIn('player');let denied=0;for(const op of [()=>content.readMapWorkspace(),()=>content.readMapVersion(requestId),()=>content.openMapVersion(requestId),()=>content.openMapVersion(requestId,'reference'),()=>content.attachMapVersion({...branchInput,requestId:crypto.randomUUID(),expectedVersion:3})])try{await op();}catch{denied++;}
  const knownStatuses:number[]=[];
  if(client)for(const image of [raw.background,raw.reference]){const response=await fetch(`${url}/storage/v1/object/party-handouts/${raw.party_id}/${image.object_id}`,{headers:{apikey:key,authorization:'Bearer '+playerJwt},cache:'no-store'});knownStatuses.push(response.status);}
  const knownPathsDenied=knownStatuses.every(status=>status>=400);
  if(client)jwt='expired.invalid.token';else await (await import('/the-drowned-compass/src/data/in-memory-party-data.ts')).createInMemoryPartyData().signOut();
  let expiredDenied=false;try{await content.openMapVersion(requestId,'reference');}catch{expiredDenied=true;}
  return {retry:retry.ok&&retry.version.id===requestId,duplicate,reused,reference,bytes,branchRetry:branchRetry.ok&&branchRetry.version.id===branchRequest,parentUnchanged:parent.document.terrain.length===0,branchDrawing:branch.version.document.terrain.length,branchRegistration:branch.version.background.registration===parent.background.registration,draftRejected,invalidRejected,noImplicit,hidden:firstPresentation.presentation.mask.uncovered.length,choiceRetry:sameChoice.ok&&sameChoice.presentation.revision===initialRevision+1,compatible:next.ok&&next.presentation.revision===initialRevision+2,semanticRetry:semanticRetry.ok&&semanticRetry.presentation.revision===initialRevision+2,incompatible:!incompatible.ok&&incompatible.reason==='incompatible'&&incompatible.presentation.version.id===branchRequest,conflict:!conflict.ok&&conflict.reason==='conflict',observed,retained:beforeDenied,denied,knownPathsDenied,knownStatuses,expiredDenied};
 },{image:Array.from(png),adapter,url:process.env.MAP_LIVE_URL??'',key:process.env.MAP_LIVE_KEY??'',dmJwt:process.env.MAP_LIVE_DM_JWT??'',playerJwt:process.env.MAP_LIVE_PLAYER_JWT??'',prefix:process.env.MAP_FIXTURE_PREFIX??'Ticket04'});
 const {knownStatuses,...outcome}=result;
 expect(knownStatuses).toEqual(adapter==='supabase'?[400,400]:[]);
 expect(outcome).toEqual({retry:true,duplicate:1,reused:true,reference:png.length,bytes:png.length,branchRetry:true,parentUnchanged:true,branchDrawing:0,branchRegistration:true,draftRejected:true,invalidRejected:true,noImplicit:true,hidden:0,choiceRetry:true,compatible:true,semanticRetry:true,incompatible:true,conflict:true,observed:true,retained:3,denied:5,knownPathsDenied:true,expiredDenied:true});
});
test('supabase: failed reference storage after artwork upload preserves accepted versions and presentation',async({page})=>{
 test.skip(!process.env.MAP_LIVE_URL,'Needs genuine local Supabase fixture.');await page.goto('./');
 const auth={url:process.env.MAP_LIVE_URL!,key:process.env.MAP_LIVE_KEY!,jwt:process.env.MAP_LIVE_DM_JWT!,image:Array.from(png),prefix:process.env.MAP_FIXTURE_PREFIX??'Ticket04'};
 const source=await page.evaluate(async({url,key,jwt,image,prefix})=>{
  const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>jwt});const content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);const document=(await import('/the-drowned-compass/src/domain/grid-map.ts')).createGridMapEditor({columns:8,rows:6}).snapshot().document;
  const requestId=crypto.randomUUID(),familyId=crypto.randomUUID();const first=await content.attachMapVersion({familyId,requestId,expectedVersion:0,title:prefix+' failed storage',document,artwork:new File([new Uint8Array(image)],'source.png',{type:'image/png'})});if(!first.ok)throw new Error('Create conflicted');const workspace=await content.readMapWorkspace();return {familyId,versionId:first.version.id,presentation:workspace.presentation};
 },auth);
 let stagedUploads=0;
 await page.route('**/storage/v1/object/party-handouts/**',async route=>{
  if(route.request().method()==='POST'&&++stagedUploads===2){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({statusCode:503,error:'Unavailable',message:'Owned storage failure fixture'})});return;}
  await route.continue();
 });
 const result=await page.evaluate(async({url,key,jwt,image,source})=>{
  const sdk=await import('/the-drowned-compass/node_modules/.vite/deps/@supabase_supabase-js.js');const client=sdk.createClient(url,key,{accessToken:async()=>jwt});const content=(await import('/the-drowned-compass/src/data/supabase-party-content.ts')).supabasePartyContent(client);const requestId=crypto.randomUUID();const file=new File([new Uint8Array(image)],'candidate.png',{type:'image/png'});let failed=false;
  try{await content.attachMapVersion({familyId:source.familyId,parentVersionId:source.versionId,expectedVersion:1,requestId,title:source.familyId,artwork:file,reference:file});}catch{failed=true;}
  const workspace=await content.readMapWorkspace();const family=workspace.families.find(f=>f.id===source.familyId)!;const original=await content.openMapVersion(source.versionId);
  const row=(await client.from('party_grid_maps').select('party_id').eq('id',source.familyId).single()).data;
  const orphan=`${row.party_id}/${requestId}`;
  const cleaned=!(await fetch(`${url}/storage/v1/object/party-handouts/${orphan}`,{headers:{apikey:key,authorization:'Bearer '+jwt},cache:'no-store'})).ok;
  return {failed,revision:family.version,versions:workspace.versions.filter(v=>v.familyId===source.familyId).length,originalBytes:original.size,presentationUnchanged:JSON.stringify(workspace.presentation)===JSON.stringify(source.presentation),cleaned};
 },{...auth,source});
 expect(stagedUploads).toBe(2);expect(result).toEqual({failed:true,revision:1,versions:1,originalBytes:png.length,presentationUnchanged:true,cleaned:true});
});
