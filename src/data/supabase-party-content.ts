import type { SupabaseClient } from '@supabase/supabase-js';
import { filterHandouts, prepareHandoutChange, validateHandout, type Handout, type PartyContent } from '../domain/party-content';
import { contentSubscription } from './content-subscription';
const bucket = 'party-handouts';
const columns = 'id,party_id,title,visibility,mime,size,created_at,digest,object_id,version,content_version,last_request_id,last_signature';
type Row = { id: string; party_id: string; title: string; visibility: 'private' | 'revealed'; mime: string; size: number; created_at: string; digest: string; object_id:string;version:number;content_version:number;last_request_id:string|null;last_signature:string|null };
const metadata = (row: Row): Handout => ({ id: row.id, title: row.title, visibility: row.visibility, mime: row.mime, size: row.size, createdAt: row.created_at,version:row.version,contentVersion:row.content_version });
const path = (row: Pick<Row, 'party_id' | 'object_id'>) => `${row.party_id}/${row.object_id}`;
function failure() { return new Error('The Library request could not finish. Your change is not confirmed. Please retry.'); }
export function supabasePartyContent(client: SupabaseClient): PartyContent {
  const pendingCleanup=new Map<string,Pick<Row,'party_id'|'object_id'>>();
  const events=new EventTarget();const changed=()=>events.dispatchEvent(new Event('changed'));
  async function read(id: string): Promise<Row | null> {
    const result = await client.from('party_handouts').select(columns).eq('id',id).maybeSingle();
    if (result.error) throw failure();return result.data;
  }
  async function usable(row: Pick<Row,'party_id'|'object_id'>): Promise<Blob> {
    const result = await client.storage.from(bucket).download(path(row));
    if (result.error || !result.data) throw new Error('The Handout could not be opened. Check your connection and Library access, then retry.');
    return result.data;
  }
  async function stage(row: Pick<Row,'party_id'|'object_id'>,file:File,digest:string) {
    const uploaded = await client.storage.from(bucket).upload(path(row),file,{contentType:file.type,upsert:false});
    if(uploaded.error){
      let blob;try{blob=await usable(row);}catch{throw failure();}
      const actual=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
      if(Array.from(new Uint8Array(actual),byte=>byte.toString(16).padStart(2,'0')).join('')!==digest)throw failure();
    }
  }
  async function cleanup(object: Pick<Row,'party_id'|'object_id'>) { try { await client.storage.from(bucket).remove([path(object)]); } catch { /* best effort; referenced files remain guarded */ } }
  const content: PartyContent={
    async list(query) { const result = await client.from('party_handouts').select(columns); if (result.error) throw failure(); return filterHandouts((result.data as Row[]).map(metadata),query); },
    async upload(input) {
      const validated = await validateHandout(input);const previous = await read(input.requestId);
      if (previous) {
        if (previous.digest !== validated.digest || previous.title !== validated.title) throw new Error('This upload request was already used. Choose the file again.');
        await usable(previous);return metadata(previous);
      }
      const membership=await client.from('party_members').select('party_id,role').single();
      if(membership.error||membership.data.role!=='dungeon-master')throw new Error('Dungeon Master access is required to upload Handouts.');
      const row={id:input.requestId,object_id:input.requestId,party_id:membership.data.party_id,title:validated.title,visibility:'private',mime:input.file.type,size:input.file.size,digest:validated.digest};
      await stage(row,input.file,validated.digest);
      const inserted=await client.from('party_handouts').insert(row).select(columns).single();
      if(inserted.error){
        const committed=await read(input.requestId);
        if(committed){if(committed.digest!==validated.digest||committed.title!==validated.title)throw failure();await usable(committed);changed();return metadata(committed);}
        await client.storage.from(bucket).remove([path(row)]);throw failure();
      }
      await usable(inserted.data);changed();return metadata(inserted.data);
    },
    async change(input){
      const prepared=await prepareHandoutChange(input);const before=await read(input.id);
      if(!before)throw new Error('This Handout is unavailable.');
      if(before.last_request_id===input.requestId){if(before.last_signature!==prepared.signature)throw new Error('This change request was already used for different content.');const previous=pendingCleanup.get(input.requestId);if(previous){await cleanup(previous);pendingCleanup.delete(input.requestId);}return {ok:true,item:metadata(before)};}
      if(before.version!==input.expectedVersion){const previous=pendingCleanup.get(input.requestId);if(previous){await cleanup(previous);await cleanup({party_id:before.party_id,object_id:input.requestId});pendingCleanup.delete(input.requestId);}return {ok:false,reason:'conflict',item:metadata(before)};}
      const staged={party_id:before.party_id,object_id:input.requestId};
      if(input.command.kind==='replace'){await stage(staged,input.command.file,prepared.replacement!.digest);pendingCleanup.set(input.requestId,before);if(pendingCleanup.size>64)pendingCleanup.delete(pendingCleanup.keys().next().value!);}
      const result=await client.rpc('change_party_handout',{p_id:input.id,p_expected_version:input.expectedVersion,p_request_id:input.requestId,p_kind:input.command.kind,p_title:prepared.title??null,p_object_id:prepared.replacement?input.requestId:null,p_digest:prepared.replacement?.digest??null,p_mime:prepared.replacement?.mime??null,p_size:prepared.replacement?.size??null});
      if(result.error){
        const current=await read(input.id);
        if(current?.last_request_id===input.requestId&&current.last_signature===prepared.signature){if(prepared.replacement){await cleanup(before);pendingCleanup.delete(input.requestId);}changed();return {ok:true,item:metadata(current)};}
        if(current&&current.version!==input.expectedVersion){if(prepared.replacement){await cleanup(staged);pendingCleanup.delete(input.requestId);}changed();return {ok:false,reason:'conflict',item:metadata(current)};}
        // No destructive rollback on uncertainty: staged replacements stay
        // private and retryable; the current reference was never switched here.
        throw failure();
      }
      const outcome=result.data as {ok:boolean;item:Row};changed();
      if(!outcome.ok){if(prepared.replacement){await cleanup(staged);pendingCleanup.delete(input.requestId);}return {ok:false,reason:'conflict',item:metadata(outcome.item)};}
      if(prepared.replacement){await cleanup(before);pendingCleanup.delete(input.requestId);}
      return {ok:true,item:metadata(outcome.item)};
    },
    async open(id,expectedContentVersion){
      const row=await read(id);if(!row)throw new Error('This Handout is unavailable.');
      if(expectedContentVersion!==undefined&&row.content_version!==expectedContentVersion)throw new Error('The Handout changed. Please open its current version.');
      const blob=await usable(row);const current=await read(id);
      if(!current||current.object_id!==row.object_id)throw new Error('The Handout changed or was withdrawn. Please refresh your Library.');
      return blob;
    },
    subscribe:listener=>contentSubscription(()=>content.list(),invalidate=>{
      events.addEventListener('changed',invalidate);
      const channel=client.channel(`party-content-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'party_handouts'},invalidate).subscribe();
      return ()=>{events.removeEventListener('changed',invalidate);void client.removeChannel(channel);};
    },listener),
  };return content;
}
