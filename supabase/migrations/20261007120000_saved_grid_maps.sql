-- Grid Maps extend the existing content capability and protected image bucket.
create function public.valid_grid_map_document(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare c integer; r integer; feet integer; entry jsonb; seen text[]='{}'; key text;
begin
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'terrain') is distinct from 'array' or jsonb_typeof(d->'edges') is distinct from 'array' then return false; end if;
 if jsonb_typeof(d->'columns') is distinct from 'number' or jsonb_typeof(d->'rows') is distinct from 'number' or jsonb_typeof(d->'feetPerSquare') is distinct from 'number' then return false;end if;
 if coalesce(d->>'columns','') !~ '^[0-9]+$' or coalesce(d->>'rows','') !~ '^[0-9]+$' or coalesce(d->>'feetPerSquare','') !~ '^[0-9]+$' then return false; end if;
 c=(d->>'columns')::integer;r=(d->>'rows')::integer;feet=(d->>'feetPerSquare')::integer;
 if c not between 2 and 80 or r not between 2 and 80 or feet not between 1 and 100 then return false;end if;
 for entry in select value from jsonb_array_elements(d->'terrain') loop
  if jsonb_typeof(entry->'x') is distinct from 'number' or jsonb_typeof(entry->'y') is distinct from 'number' then return false;end if;
  if jsonb_typeof(entry) is distinct from 'object' or coalesce(entry->>'x','') !~ '^[0-9]+$' or coalesce(entry->>'y','') !~ '^[0-9]+$' or coalesce(entry->>'kind','') not in('floor','water','difficult') then return false;end if;
  if (entry->>'x')::integer>=c or (entry->>'y')::integer>=r then return false;end if;
  key=(entry->>'x')||','||(entry->>'y');if key=any(seen) then return false;end if;seen=array_append(seen,key);
 end loop;
 seen='{}';
 for entry in select value from jsonb_array_elements(d->'edges') loop
  if jsonb_typeof(entry->'x') is distinct from 'number' or jsonb_typeof(entry->'y') is distinct from 'number' then return false;end if;
  if jsonb_typeof(entry) is distinct from 'object' or coalesce(entry->>'x','') !~ '^[0-9]+$' or coalesce(entry->>'y','') !~ '^[0-9]+$' or coalesce(entry->>'kind','') not in('wall','door') or coalesce(entry->>'direction','') not in('horizontal','vertical') then return false;end if;
  if (entry->>'x')::integer>c-(case when entry->>'direction'='horizontal' then 1 else 0 end) or (entry->>'y')::integer>r-(case when entry->>'direction'='vertical' then 1 else 0 end) then return false;end if;
  key=(entry->>'x')||','||(entry->>'y')||','||(entry->>'direction');if key=any(seen) then return false;end if;seen=array_append(seen,key);
 end loop;
 return true;
exception when others then return false;
end;$$;
create function public.valid_grid_map_background(d jsonb,b jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare x double precision;y double precision;w double precision;h double precision;pw integer;ph integer;
begin
 if b is null then return true;end if;
 if jsonb_typeof(b) is distinct from 'object' or coalesce(b->>'mime','') not in('image/png','image/jpeg','image/webp') or coalesce(b->>'digest','') !~ '^[0-9a-f]{64}$' or coalesce(b->>'object_id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return false;end if;
 if jsonb_typeof(b->'size') is distinct from 'number' or jsonb_typeof(b->'pixelWidth') is distinct from 'number' or jsonb_typeof(b->'pixelHeight') is distinct from 'number' then return false;end if;
 if coalesce(b->>'size','') !~ '^[0-9]+$' or (b->>'size')::integer not between 1 and 20971520 or coalesce(b->>'pixelWidth','') !~ '^[0-9]+$' or coalesce(b->>'pixelHeight','') !~ '^[0-9]+$' then return false;end if;
 pw=(b->>'pixelWidth')::integer;ph=(b->>'pixelHeight')::integer;
 if pw<1 or ph<1 or pw::bigint*ph>16000000 then return false;end if;
 if jsonb_typeof(b->'x') is distinct from 'number' or jsonb_typeof(b->'y') is distinct from 'number' or jsonb_typeof(b->'width') is distinct from 'number' or jsonb_typeof(b->'height') is distinct from 'number' then return false;end if;
 x=(b->>'x')::double precision;y=(b->>'y')::double precision;w=(b->>'width')::double precision;h=(b->>'height')::double precision;
 return coalesce(x>=0 and y>=0 and w>0 and h>0 and x+w<=(d->>'columns')::integer+1e-8 and y+h<=(d->>'rows')::integer+1e-8 and abs(w/h-pw::double precision/ph)<1e-8,false);
exception when others then return false;
end;$$;
create table public.party_grid_maps(
 id uuid primary key,party_id uuid not null references public.parties(id),title text not null check(title=btrim(title) and char_length(title) between 1 and 160),visibility text not null default 'private' check(visibility in('private','revealed')),
 created_at timestamptz not null default now(),version integer not null check(version>=1),document jsonb not null check(public.valid_grid_map_document(document)),background jsonb check(public.valid_grid_map_background(document,background))
);
create table public.party_grid_map_requests(
 request_id uuid primary key,party_id uuid not null references public.parties(id),map_id uuid not null references public.party_grid_maps(id),signature jsonb not null,client_signature text not null,item jsonb not null,old_object_id uuid
);
alter table public.party_grid_maps enable row level security;alter table public.party_grid_map_requests enable row level security;
revoke all on public.party_grid_maps,public.party_grid_map_requests from anon,authenticated;
grant select on public.party_grid_maps,public.party_grid_map_requests to authenticated;
create policy "Members read revealed or DM private Grid Maps" on public.party_grid_maps for select to authenticated using(public.is_party_dm(party_id) or (visibility='revealed' and public.is_party_member(party_id)));
create policy "DM reads accepted Grid Map requests" on public.party_grid_map_requests for select to authenticated using(public.is_party_dm(party_id));
-- Protect all current content references against concurrent compensation.
create function public.guard_grid_map_commit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.background is not null then
  perform pg_advisory_xact_lock(hashtextextended(new.party_id::text||'/'||(new.background->>'object_id'),0));
  if not exists(select 1 from storage.objects where bucket_id='party-handouts' and name=new.party_id::text||'/'||(new.background->>'object_id') and (metadata->>'size')::bigint=(new.background->>'size')::bigint and metadata->>'mimetype'=new.background->>'mime') then raise exception 'Upload usable image content before saving the Grid Map';end if;
 end if;return new;
end;$$;
create trigger guard_grid_map_commit before insert or update on public.party_grid_maps for each row execute function public.guard_grid_map_commit();
create or replace function public.guard_handout_object_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='party-handouts' then
  perform pg_advisory_xact_lock(hashtextextended(old.name,0));
  if exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=old.name) or exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=old.name) then return null;end if;
 end if;return old;
end;$$;
drop policy "DM uploads private Handout objects" on storage.objects;
create policy "DM uploads private Handout objects" on storage.objects for insert to authenticated with check(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name) and not exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=name));
drop policy "DM cleans uncommitted Handout objects" on storage.objects;
create policy "DM cleans uncommitted Handout objects" on storage.objects for delete to authenticated using(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name) and not exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=name));
drop policy "Members download current revealed or DM private objects" on storage.objects;
create policy "Members download current revealed or DM private objects" on storage.objects for select to authenticated using(bucket_id='party-handouts' and (public.can_manage_handout_object(name) or exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name and visibility='revealed' and public.is_party_member(party_id)) or exists(select 1 from public.party_grid_maps where party_id::text||'/'||(background->>'object_id')=name and visibility='revealed' and public.is_party_member(party_id))));
create function public.save_party_grid_map(p_id uuid,p_expected_version integer,p_request_id uuid,p_title text,p_document jsonb,p_mode text,p_background jsonb,p_client_signature text) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_party uuid;item public.party_grid_maps;receipt public.party_grid_map_requests;signature jsonb;background jsonb;old_object uuid;
begin
 select party_id into target_party from public.party_members where user_id=(select auth.uid()) and role='dungeon-master';
 if target_party is null then raise exception 'Dungeon Master access is required to save Grid Maps' using errcode='42501';end if;
 if p_id is null or p_request_id is null or p_expected_version is null or p_expected_version<0 or p_title is null or char_length(btrim(p_title)) not between 1 and 160 or not public.valid_grid_map_document(p_document) or p_mode is null or p_mode not in('keep','remove','replace') or p_client_signature is null then raise exception 'Invalid map save request';end if;
 if p_mode='replace' and (p_background is null or p_background->>'object_id' is distinct from p_request_id::text or not public.valid_grid_map_background(p_document,p_background)) then raise exception 'Invalid Map Background';end if;
 if p_mode<>'replace' and p_background is not null then raise exception 'Unexpected Map Background';end if;
 signature=jsonb_build_object('id',p_id,'expectedVersion',p_expected_version,'title',btrim(p_title),'document',p_document,'mode',p_mode,'background',p_background);
 perform pg_advisory_xact_lock(hashtextextended('grid-request/'||p_request_id::text,0));
 select * into receipt from public.party_grid_map_requests where request_id=p_request_id;
 if found then
  if receipt.party_id<>target_party or receipt.signature<>signature or receipt.client_signature<>p_client_signature then raise exception 'This save request was already used for different content';end if;
  return jsonb_build_object('ok',true,'item',receipt.item,'old_object_id',receipt.old_object_id);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('grid-map/'||p_id::text,0));
 select * into item from public.party_grid_maps where id=p_id for update;
 if found then
  if item.party_id<>target_party then raise exception 'Grid Map is unavailable' using errcode='42501';end if;
  if item.version<>p_expected_version then return jsonb_build_object('ok',false,'item',to_jsonb(item));end if;
 else
  if p_expected_version<>0 then raise exception 'Grid Map is unavailable';end if;
  item.id=p_id;item.party_id=target_party;item.visibility='private';item.created_at=now();item.version=0;
 end if;
 background=case p_mode when 'replace' then p_background when 'remove' then null else item.background end;
 if not public.valid_grid_map_background(p_document,background) then raise exception 'Background placement does not fit this Map Grid';end if;
 if item.background is not null and item.background->>'object_id' is distinct from background->>'object_id' then old_object=(item.background->>'object_id')::uuid;end if;
 insert into public.party_grid_maps(id,party_id,title,visibility,created_at,version,document,background) values(p_id,target_party,btrim(p_title),item.visibility,item.created_at,item.version+1,p_document,background)
 on conflict(id) do update set title=excluded.title,version=excluded.version,document=excluded.document,background=excluded.background returning * into item;
 insert into public.party_grid_map_requests(request_id,party_id,map_id,signature,client_signature,item,old_object_id) values(p_request_id,target_party,p_id,signature,p_client_signature,to_jsonb(item),old_object);
 return jsonb_build_object('ok',true,'item',to_jsonb(item),'old_object_id',old_object);
end;$$;
revoke all on function public.valid_grid_map_document(jsonb),public.valid_grid_map_background(jsonb,jsonb),public.guard_grid_map_commit(),public.save_party_grid_map(uuid,integer,uuid,text,jsonb,text,jsonb,text) from public;
grant execute on function public.valid_grid_map_document(jsonb),public.valid_grid_map_background(jsonb,jsonb),public.save_party_grid_map(uuid,integer,uuid,text,jsonb,text,jsonb,text) to authenticated;
