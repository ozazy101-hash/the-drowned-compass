/** Owned REST/SQL/storage adapter. JWT and service key never reach semantic results. */
export function supabaseGenerationStore({url,serviceKey,fetchImpl=fetch}){
 const headers={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`,'Content-Type':'application/json'};
 async function json(path,body){const response=await fetchImpl(`${url}${path}`,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});if(!response.ok)throw Error((await response.json()).message??'unavailable');return response.json();}
 async function membership(user){const rows=await json(`/rest/v1/party_members?user_id=eq.${encodeURIComponent(user)}&role=eq.dungeon-master&select=party_id`);if(rows.length!==1)throw Error('Dungeon Master access required');return rows[0].party_id;}
 const objectPath=r=>`${url}/storage/v1/object/${r.bucket}/${r.partyId}/${r.objectId}`;
 return {
  async cleanup(){const objects=await json('/rest/v1/rpc/release_map_generation_orphans',{});for(const ref of objects){const response=await fetchImpl(objectPath(ref),{method:'DELETE',headers});if(!response.ok&&response.status!==404)throw Error('cleanup-unavailable');}if(objects.length)await json('/rest/v1/rpc/ack_map_generation_orphans',{p_ids:[...new Set(objects.map(o=>o.jobId))]});return objects.length;},
  async reserve(user,intent,mode){return json('/rest/v1/rpc/reserve_map_generation',{p_user:user,p_intent:intent,p_mode:mode});},
  async read(user,id){const party=await membership(user);const rows=await json(`/rest/v1/party_map_generation_jobs?id=eq.${id}&party_id=eq.${party}&select=*`);return rows[0]??null;},
  async transition(id,revision,state,patch){return json('/rest/v1/rpc/transition_map_generation',{p_id:id,p_revision:revision,p_state:state,p_patch:patch});},
  async complete(j,proof,verified,background){return json('/rest/v1/rpc/complete_map_generation',{p_id:j.id,p_revision:j.revision,p_proof:proof,p_verified:verified,p_background:background});},
  async currentBinding(j){
   const party=await membership(j.user_id);if(party!==j.party_id)return null;
   if(j.binding.parent){const rows=await json(`/rest/v1/party_map_artwork_versions?id=eq.${encodeURIComponent(j.binding.parent)}&party_id=eq.${party}&select=document,background`);if(rows.length!==1||JSON.stringify(rows[0].document)!==JSON.stringify(j.binding.parentDocument)||JSON.stringify(rows[0].background)!==JSON.stringify(j.binding.parentBackground))return null;}
   if(j.state!=='completed'){
    const rows=await json(`/rest/v1/party_grid_maps?id=eq.${j.intent.familyId}&party_id=eq.${party}&select=version`);
    if((rows[0]?.version??0)!==j.intent.expectedVersion)return null;
   }
   return j.binding;
  },
  async readObject(ref){const response=await fetchImpl(objectPath(ref),{headers});if(!response.ok||response.headers.get('Content-Type')?.split(';')[0]!=='image/png')throw Error('immutable-object-mismatch');const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>20*1024*1024)throw Error('invalid-output');return bytes;},
  async writeObject(ref,bytes){const response=await fetchImpl(objectPath(ref),{method:'POST',headers:{...headers,'Content-Type':'image/png','x-upsert':'false'},body:bytes});if(!response.ok){const body=await response.json();if(!['409','400'].includes(String(body.statusCode))&&!String(body.message).toLowerCase().includes('exists'))throw Error('storage-unavailable');} /* caller must re-read/check exact digest, never overwrite */},
 };
}
export async function authenticatedUser(request,{url,anonKey,fetchImpl=fetch}){
 const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))throw Error('Dungeon Master access required');
 const response=await fetchImpl(`${url}/auth/v1/user`,{headers:{apikey:anonKey,Authorization:authorization}});if(!response.ok)throw Error('Dungeon Master access required');const user=await response.json();if(!user.id)throw Error('Dungeon Master access required');return user.id;
}
