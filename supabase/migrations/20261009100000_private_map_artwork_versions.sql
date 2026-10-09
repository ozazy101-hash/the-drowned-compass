-- Additive migration: maps/receipts/objects remain intact; rollback must first
-- export retained versions/references/presentations. Never roll back by reset.
create table public.party_map_artwork_versions (
 id text primary key, accepting_transaction xid8 not null default pg_current_xact_id(), party_id uuid not null references public.parties(id),
 family_id uuid not null references public.party_grid_maps(id), parent_version_id text references public.party_map_artwork_versions(id),
 request_id uuid unique, map_revision integer not null, created_at timestamptz not null default now(),
 title text not null, document jsonb not null check(public.valid_grid_map_document(document)),
 background jsonb check(public.valid_grid_map_background(document,background)),
 origin text not null check(origin in('drawing','uploaded','generated','revised','legacy','copy')),
 instructions text not null default '' check(char_length(instructions)<=8000),
 reference jsonb check(public.valid_grid_map_background(document,reference)), job_id uuid
);
create table public.party_map_presentations (
 party_id uuid primary key references public.parties(id), revision integer not null check(revision>=1),
 version_id text not null references public.party_map_artwork_versions(id),mask jsonb not null
);
create table public.party_map_presentation_requests (
 request_id uuid primary key,party_id uuid not null references public.parties(id),signature jsonb not null,presentation jsonb not null
);
alter table public.party_map_artwork_versions enable row level security;
alter table public.party_map_presentations enable row level security;
alter table public.party_map_presentation_requests enable row level security;
revoke all on public.party_map_artwork_versions,public.party_map_presentations,public.party_map_presentation_requests from anon,authenticated;
grant select on public.party_map_artwork_versions,public.party_map_presentations,public.party_map_presentation_requests to authenticated;
create policy "DM reads immutable Map Artwork Versions" on public.party_map_artwork_versions for select to authenticated using(public.is_party_dm(party_id));
create policy "DM reads coherent map presentation" on public.party_map_presentations for select to authenticated using(public.is_party_dm(party_id));
create policy "DM reads presentation receipts" on public.party_map_presentation_requests for select to authenticated using(public.is_party_dm(party_id));
-- Preserve all accepted historical receipts as retained sources, plus current
-- legacy maps which may predate receipts. Object identity, never digest, is lineage.
insert into public.party_map_artwork_versions(id,party_id,family_id,request_id,map_revision,title,document,background,origin,created_at)
select r.request_id::text,r.party_id,r.map_id,r.request_id,(r.item->>'version')::integer,r.item->>'title',r.item->'document',
 case when jsonb_typeof(r.item->'background')='object' then (r.item->'background')||jsonb_build_object('registration','legacy:'||(r.item->'background'->>'object_id')) else null end,'legacy',(r.item->>'created_at')::timestamptz
from public.party_grid_map_requests r;
insert into public.party_map_artwork_versions(id,party_id,family_id,map_revision,title,document,background,origin,created_at)
select 'legacy:'||m.id::text||':'||m.version,m.party_id,m.id,m.version,m.title,m.document,
 case when m.background is not null then m.background||jsonb_build_object('registration','legacy:'||(m.background->>'object_id')) end,'legacy',m.created_at
from public.party_grid_maps m where not exists(select 1 from public.party_map_artwork_versions v where v.family_id=m.id and v.map_revision=m.version);
update public.party_grid_maps set background=background||jsonb_build_object('registration','legacy:'||(background->>'object_id')) where background is not null;
-- Authoritative registration: arbitrary new object gets a new identity; keep/copy
-- retains its existing identity. Client-supplied registration is never accepted.
create function public.register_map_background() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.background is not null then
  if TG_OP='UPDATE' and old.background->>'object_id'=new.background->>'object_id' then
   new.background=new.background||jsonb_build_object('registration',coalesce((select v.background->>'registration' from public.party_map_artwork_versions v where v.party_id=new.party_id and v.background->>'object_id'=new.background->>'object_id' order by v.map_revision desc limit 1),old.background->>'registration','legacy:'||(old.background->>'object_id')));
  else
   new.background=new.background||jsonb_build_object('registration',coalesce((select v.background->>'registration' from public.party_map_artwork_versions v where v.party_id=new.party_id and v.background->>'object_id'=new.background->>'object_id' limit 1),'upload:'||(new.background->>'object_id')));
  end if;
 end if;return new;
end;$$;
create trigger register_map_background before insert or update on public.party_grid_maps for each row execute function public.register_map_background();
create function public.retain_map_artwork_version() returns trigger language plpgsql security definer set search_path='' as $$
declare parent text; b jsonb;
begin
 select id into parent from public.party_map_artwork_versions where family_id=new.map_id order by map_revision desc,created_at desc,id limit 1;
 b=case when jsonb_typeof(new.item->'background')='object' then new.item->'background' else null end;
 insert into public.party_map_artwork_versions(id,party_id,family_id,parent_version_id,request_id,map_revision,title,document,background,origin)
 values(new.request_id::text,new.party_id,new.map_id,parent,new.request_id,(new.item->>'version')::integer,new.item->>'title',new.item->'document',b,
 case when new.signature->>'kind'='copy' then 'copy' when new.signature->>'mode'='replace' then 'uploaded' else 'drawing' end);
 return new;
end;$$;
create trigger retain_map_artwork_version after insert on public.party_grid_map_requests for each row execute function public.retain_map_artwork_version();
create or replace function public.guard_handout_object_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='party-handouts' then
  perform pg_advisory_xact_lock(hashtextextended(old.name,0));
  if exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=old.name)
   or exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=old.name)
   or exists(select 1 from public.party_map_artwork_versions where party_id::text||'/'||(background->>'object_id')=old.name or party_id::text||'/'||(reference->>'object_id')=old.name) then return null;end if;
 end if;return old;
end;$$;
-- Known paths for new/historical version and reference files are DM-only. A file
-- explicitly granted by a revealed Handout keeps that separate Handout grant.
drop policy "Members download current revealed or DM private objects" on storage.objects;
create policy "Members download current revealed or DM private objects" on storage.objects for select to authenticated using(bucket_id='party-handouts' and (public.can_manage_handout_object(name) or exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name and visibility='revealed' and public.is_party_member(party_id))));
drop policy "DM uploads private Handout objects" on storage.objects;
create policy "DM uploads private Handout objects" on storage.objects for insert to authenticated with check(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name) and not exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=name) and not exists(select 1 from public.party_map_artwork_versions where party_id::text||'/'||(background->>'object_id')=name or party_id::text||'/'||(reference->>'object_id')=name));
drop policy "DM cleans uncommitted Handout objects" on storage.objects;
create policy "DM cleans uncommitted Handout objects" on storage.objects for delete to authenticated using(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name) and not exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=name) and not exists(select 1 from public.party_map_artwork_versions where party_id::text||'/'||(background->>'object_id')=name or party_id::text||'/'||(reference->>'object_id')=name));
create function public.map_presentation_snapshot(p_party uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('revision',p.revision,'version',to_jsonb(v),'mask',p.mask) from public.party_map_presentations p join public.party_map_artwork_versions v on v.id=p.version_id and v.party_id=p.party_id where p.party_id=p_party),jsonb_build_object('revision',0,'version',null,'mask',null));
$$;
create function public.read_map_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target uuid;
begin
 select party_id into target from public.party_members where user_id=auth.uid() and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access is required' using errcode='42501';end if;
 return jsonb_build_object('families',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from public.party_grid_maps m where m.party_id=target),'[]'::jsonb),'versions',coalesce((select jsonb_agg(to_jsonb(v) order by v.map_revision,v.id) from public.party_map_artwork_versions v where v.party_id=target),'[]'::jsonb),'presentation',public.map_presentation_snapshot(target));
end;$$;
create function public.attach_map_artwork_version(p_family uuid,p_parent text,p_expected_version integer,p_request uuid,p_title text,p_document jsonb,p_artwork jsonb,p_reference jsonb,p_instructions text,p_client_signature text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;source public.party_map_artwork_versions;current public.party_grid_maps;accepted public.party_grid_map_requests;signature jsonb;outcome jsonb;doc jsonb; b jsonb;
begin
 select party_id into target from public.party_members where user_id=auth.uid() and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access is required' using errcode='42501';end if;
 if p_family is null or p_request is null or p_expected_version is null or p_expected_version<0 or p_title is null or char_length(btrim(p_title)) not between 1 and 160 or p_instructions is null or char_length(p_instructions)>8000 or p_client_signature is null then raise exception 'Invalid attachment';end if;
 signature=jsonb_build_object('family',p_family,'parent',p_parent,'expectedVersion',p_expected_version,'title',btrim(p_title),'document',p_document,'artwork',p_artwork,'reference',p_reference,'instructions',p_instructions);
 perform pg_advisory_xact_lock(hashtextextended('grid-request/'||p_request::text,0));
 select * into accepted from public.party_grid_map_requests where request_id=p_request;
 if found then
  if accepted.party_id<>target or accepted.signature<>signature or accepted.client_signature<>p_client_signature then raise exception 'Request already used';end if;
  return jsonb_build_object('ok',true,'version',(select to_jsonb(v) from public.party_map_artwork_versions v where id=p_request::text));
 end if;
 if p_parent is not null then
  select * into source from public.party_map_artwork_versions where id=p_parent and family_id=p_family and party_id=target;
  if not found or p_document is not null then raise exception 'Choose a saved source; draft geometry cannot branch';end if;
  doc=source.document;b=source.background;
 else doc=p_document;end if;
 if not public.valid_grid_map_document(doc) then raise exception 'Invalid Map Grid';end if;
 if p_artwork is not null then
  if p_artwork->>'object_id' is distinct from p_request::text or not public.valid_grid_map_background(doc,p_artwork) then raise exception 'Invalid uploaded artwork';end if;
  b=p_artwork;
 end if;
 if p_reference is not null then
  if not public.valid_grid_map_background(doc,p_reference) or p_reference->>'object_id'=p_request::text then raise exception 'Invalid reference';end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text||'/'||(p_reference->>'object_id'),0));
  if not exists(select 1 from storage.objects where bucket_id='party-handouts' and name=target::text||'/'||(p_reference->>'object_id') and (metadata->>'size')::bigint=(p_reference->>'size')::bigint and metadata->>'mimetype'=p_reference->>'mime') then raise exception 'Upload reference before attachment';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('grid-map/'||p_family::text,0));
 select * into current from public.party_grid_maps where id=p_family for update;
 if found and current.party_id<>target then raise exception 'Map unavailable' using errcode='42501';end if;
 if found and current.version<>p_expected_version then return jsonb_build_object('ok',false,'item',to_jsonb(current));end if;
 if not found and p_expected_version<>0 then raise exception 'Map unavailable';end if;
 -- Direct save in this transaction permits retained old-parent artwork without
 -- pretending it is a new upload; all file/registration guards still run.
 insert into public.party_grid_maps(id,party_id,title,visibility,version,document,background) values(p_family,target,btrim(p_title),'private',coalesce(current.version,0)+1,doc,b)
 on conflict(id) do update set title=excluded.title,visibility='private',version=excluded.version,document=excluded.document,background=excluded.background returning * into current;
 insert into public.party_grid_map_requests(request_id,party_id,map_id,signature,client_signature,item) values(p_request,target,p_family,signature,p_client_signature,to_jsonb(current));
 update public.party_map_artwork_versions set parent_version_id=p_parent,instructions=p_instructions,reference=case when p_reference is not null then p_reference||jsonb_build_object('registration','reference:'||(p_reference->>'object_id')) end,origin=case when p_artwork is null then 'drawing' else 'uploaded' end where id=p_request::text;
 return jsonb_build_object('ok',true,'version',(select to_jsonb(v) from public.party_map_artwork_versions v where id=p_request::text));
end;$$;
create function public.choose_map_presentation(p_version text,p_expected_revision integer,p_request uuid,p_new_map boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;v public.party_map_artwork_versions;previous public.party_map_artwork_versions;p public.party_map_presentations;r public.party_map_presentation_requests;s jsonb;mask jsonb;compatible boolean=false;result jsonb;
begin
 select party_id into target from public.party_members where user_id=auth.uid() and role='dungeon-master';
 if target is null then raise exception 'Dungeon Master access is required' using errcode='42501';end if;
 if p_request is null or p_expected_revision is null or p_expected_revision<0 or p_new_map is null then raise exception 'Invalid presentation request';end if;
 s=jsonb_build_object('version',p_version,'expectedRevision',p_expected_revision,'newMap',p_new_map);
 perform pg_advisory_xact_lock(hashtextextended('map-presentation-request/'||p_request::text,0));
 select * into r from public.party_map_presentation_requests where request_id=p_request;
 if found then
  if r.party_id<>target or r.signature<>s then raise exception 'Presentation request already used';end if;
  return jsonb_build_object('ok',true,'presentation',r.presentation);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('map-presentation/'||target::text,0));
 select * into p from public.party_map_presentations where party_id=target for update;
 if coalesce(p.revision,0)<>p_expected_revision then return jsonb_build_object('ok',false,'reason','conflict','presentation',public.map_presentation_snapshot(target));end if;
 select * into v from public.party_map_artwork_versions where id=p_version and party_id=target;
 if not found then raise exception 'Saved version unavailable';end if;
 if p.version_id is not null then
  select * into previous from public.party_map_artwork_versions where id=p.version_id;
  compatible=previous.family_id=v.family_id and previous.document->'columns'=v.document->'columns' and previous.document->'rows'=v.document->'rows' and previous.document->'feetPerSquare'=v.document->'feetPerSquare' and (
   (previous.background is null and v.background is null) or (previous.background is not null and v.background is not null and previous.background->'registration'=v.background->'registration' and (previous.background-'digest'-'object_id'-'mime'-'size')=(v.background-'digest'-'object_id'-'mime'-'size')));
  if not coalesce(compatible,false) and not p_new_map then return jsonb_build_object('ok',false,'reason','incompatible','presentation',public.map_presentation_snapshot(target));end if;
 end if;
 mask=case when compatible then p.mask else jsonb_build_object('id',p_request,'registration',coalesce(v.background->>'registration','drawing:'||v.family_id::text),'columns',v.document->'columns','rows',v.document->'rows','uncovered','[]'::jsonb) end;
 insert into public.party_map_presentations(party_id,revision,version_id,mask) values(target,coalesce(p.revision,0)+1,v.id,mask) on conflict(party_id) do update set revision=excluded.revision,version_id=excluded.version_id,mask=excluded.mask;
 result=public.map_presentation_snapshot(target);
 insert into public.party_map_presentation_requests values(p_request,target,s,result);
 return jsonb_build_object('ok',true,'presentation',result);
end;$$;
revoke all on function public.register_map_background(),public.retain_map_artwork_version(),public.map_presentation_snapshot(uuid),public.read_map_workspace(),public.attach_map_artwork_version(uuid,text,integer,uuid,text,jsonb,jsonb,jsonb,text,text),public.choose_map_presentation(text,integer,uuid,boolean) from public;
grant execute on function public.read_map_workspace(),public.attach_map_artwork_version(uuid,text,integer,uuid,text,jsonb,jsonb,jsonb,text,text),public.choose_map_presentation(text,integer,uuid,boolean) to authenticated;
do $$ begin
 alter publication supabase_realtime add table public.party_map_artwork_versions;
 alter publication supabase_realtime add table public.party_map_presentations;
end;$$;
-- Internal attachment contract for06/08, not a generation job engine. The owned
-- server must authorize the completed job/request and normalize/decode the bytes
-- before invoking. p_constrained=true additionally requires authoritative lossless
-- compositing and exact decoded outside-region preservation; SQL verifies geometry
-- but cannot prove pixel preservation. No browser/anon grant can assert this flag.
create function public.attach_server_map_artwork_version(p_party uuid,p_family uuid,p_parent text,p_expected_version integer,p_request uuid,p_job uuid,p_origin text,p_title text,p_document jsonb,p_background jsonb,p_reference jsonb,p_instructions text,p_constrained boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare source public.party_map_artwork_versions;current public.party_grid_maps;accepted public.party_grid_map_requests;signature jsonb;registration text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Server attachment authority required' using errcode='42501';end if;
 if p_job is null or p_request is null or p_family is null or p_party is null or p_expected_version is null or p_expected_version<0 or p_origin is null or p_origin not in('generated','revised') or p_constrained is null or p_instructions is null or char_length(p_instructions)>8000 or p_title is null or char_length(btrim(p_title)) not between 1 and 160 or not public.valid_grid_map_document(p_document) or p_background is null or not public.valid_grid_map_background(p_document,p_background) or p_background->>'object_id' is distinct from p_request::text then raise exception 'Invalid normalized server attachment';end if;
 signature=jsonb_build_object('party',p_party,'family',p_family,'parent',p_parent,'revision',p_expected_version,'request',p_request,'job',p_job,'origin',p_origin,'title',p_title,'document',p_document,'background',p_background,'reference',p_reference,'instructions',p_instructions,'constrained',p_constrained);
 perform pg_advisory_xact_lock(hashtextextended('grid-request/'||p_request::text,0));
 select * into accepted from public.party_grid_map_requests where request_id=p_request;
 if found then
  if accepted.party_id<>p_party or accepted.signature<>signature then raise exception 'Server request already used';end if;
  return jsonb_build_object('ok',true,'version',(select to_jsonb(v) from public.party_map_artwork_versions v where id=p_request::text));
 end if;
 if p_parent is not null then
  select * into source from public.party_map_artwork_versions where id=p_parent and party_id=p_party and family_id=p_family;
  if not found then raise exception 'Saved parent unavailable';end if;
 end if;
 if p_constrained then
  if p_origin<>'revised' or p_parent is null or source.background is null or source.document<>p_document or (source.background-'digest'-'object_id'-'registration'-'mime'-'size')<>(p_background-'digest'-'object_id'-'registration'-'mime'-'size') then raise exception 'Constrained result changed canonical geometry';end if;
  registration=source.background->>'registration';
 elsif p_origin='revised' then raise exception 'Area revision requires verified constrained output';
 else registration='upload:'||p_request::text;end if;
 if p_reference is not null then
  if not public.valid_grid_map_background(p_document,p_reference) then raise exception 'Invalid server reference';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_party::text||'/'||(p_reference->>'object_id'),0));
  if not exists(select 1 from storage.objects where bucket_id='party-handouts' and name=p_party::text||'/'||(p_reference->>'object_id') and (metadata->>'size')::bigint=(p_reference->>'size')::bigint and metadata->>'mimetype'=p_reference->>'mime') then raise exception 'Server reference unavailable';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('grid-map/'||p_family::text,0));
 select * into current from public.party_grid_maps where id=p_family for update;
 if found and current.party_id<>p_party then raise exception 'Map unavailable';end if;
 if found and current.version<>p_expected_version then return jsonb_build_object('ok',false,'item',to_jsonb(current));end if;
 if not found and p_expected_version<>0 then raise exception 'Map unavailable';end if;
 insert into public.party_grid_maps(id,party_id,title,visibility,version,document,background) values(p_family,p_party,btrim(p_title),'private',coalesce(current.version,0)+1,p_document,p_background)
 on conflict(id) do update set title=excluded.title,visibility='private',version=excluded.version,document=excluded.document,background=excluded.background returning * into current;
 insert into public.party_grid_map_requests(request_id,party_id,map_id,signature,client_signature,item) values(p_request,p_party,p_family,signature,signature::text,to_jsonb(current));
 update public.party_map_artwork_versions set parent_version_id=p_parent,origin=p_origin,job_id=p_job,instructions=p_instructions,reference=case when p_reference is not null then p_reference||jsonb_build_object('registration','reference:'||(p_reference->>'object_id')) end,background=background||jsonb_build_object('registration',registration) where id=p_request::text;
 update public.party_grid_maps set background=background||jsonb_build_object('registration',registration) where id=p_family returning * into current;
 update public.party_grid_map_requests set item=to_jsonb(current) where request_id=p_request;
 return jsonb_build_object('ok',true,'version',(select to_jsonb(v) from public.party_map_artwork_versions v where id=p_request::text));
end;$$;
revoke all on function public.attach_server_map_artwork_version(uuid,uuid,text,integer,uuid,uuid,text,text,jsonb,jsonb,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.attach_server_map_artwork_version(uuid,uuid,text,integer,uuid,uuid,text,text,jsonb,jsonb,jsonb,text,boolean) to service_role;
-- Retained rows are immutable after their accepting transaction, including for
-- server callers. Attachment finalization may set origin/lineage in that same
-- transaction; no subsequent edit can overwrite a saved source.
create function public.guard_immutable_map_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.accepting_transaction<>pg_current_xact_id() then raise exception 'Saved Map Artwork Versions are immutable';end if;
 if new.parent_version_id is not null and not exists(select 1 from public.party_map_artwork_versions p where p.id=new.parent_version_id and p.id<>new.id and p.family_id=new.family_id and p.party_id=new.party_id) then raise exception 'Saved parent must belong to the same private map family';end if;
 if new.request_id is not null and new.id<>new.request_id::text then raise exception 'Version/request identity mismatch';end if;
 if new.origin in('generated','revised') and new.job_id is null then raise exception 'Generated versions require an owned job identity';end if;
 return new;
end;$$;
revoke all on function public.guard_immutable_map_version() from public;
create trigger guard_immutable_map_version before insert or update on public.party_map_artwork_versions for each row execute function public.guard_immutable_map_version();
revoke insert,update,delete on public.party_map_artwork_versions from service_role;
