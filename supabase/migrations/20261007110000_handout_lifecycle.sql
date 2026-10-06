-- Extend the same private/revealed collection with atomic versioned transitions.
alter table public.party_handouts drop constraint party_handouts_visibility_check;
alter table public.party_handouts add constraint party_handouts_visibility_check check(visibility in('private','revealed'));
alter table public.party_handouts add column object_id uuid;
update public.party_handouts set object_id=id;
alter table public.party_handouts alter column object_id set not null;
alter table public.party_handouts add column version integer not null default 1 check(version>=1);
alter table public.party_handouts add column content_version integer not null default 1 check(content_version>=1);
alter table public.party_handouts add column last_request_id uuid;
alter table public.party_handouts add column last_signature text;
revoke update(title) on public.party_handouts from authenticated;
drop policy "DM retitles Handouts" on public.party_handouts;
drop policy "DM reads private Handouts" on public.party_handouts;
create policy "Members read revealed or DM private Handouts" on public.party_handouts for select to authenticated using(public.is_party_dm(party_id) or (visibility='revealed' and public.is_party_member(party_id)));
drop policy "DM saves private Handouts" on public.party_handouts;
create policy "DM saves private Handouts" on public.party_handouts for insert to authenticated with check(public.is_party_dm(party_id) and visibility='private' and version=1 and content_version=1 and last_request_id is null and last_signature is null and object_id=id and exists(select 1 from storage.objects where bucket_id='party-handouts' and name=party_handouts.party_id::text||'/'||party_handouts.object_id::text and (metadata->>'size')::bigint=party_handouts.size and metadata->>'mimetype'=party_handouts.mime));
create or replace function public.guard_handout_commit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.object_id=coalesce(new.object_id,new.id);
 perform pg_advisory_xact_lock(hashtextextended(new.party_id::text||'/'||new.object_id::text,0));
 if not exists(select 1 from storage.objects where bucket_id='party-handouts' and name=new.party_id::text||'/'||new.object_id::text and (metadata->>'size')::bigint=new.size and metadata->>'mimetype'=new.mime) then raise exception 'Upload usable content before saving the Handout'; end if;
 return new;
end; $$;
drop trigger guard_handout_commit on public.party_handouts;
create trigger guard_handout_commit before insert or update on public.party_handouts for each row execute function public.guard_handout_commit();
create or replace function public.guard_handout_object_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='party-handouts' then
  perform pg_advisory_xact_lock(hashtextextended(old.name,0));
  if exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=old.name) then return null; end if;
 end if;return old;
end; $$;
drop policy "DM downloads private Handout objects" on storage.objects;
create policy "Members download current revealed or DM private objects" on storage.objects for select to authenticated using(bucket_id='party-handouts' and (public.can_manage_handout_object(name) or exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name and visibility='revealed' and public.is_party_member(party_id))));
drop policy "DM uploads private Handout objects" on storage.objects;
create policy "DM uploads private Handout objects" on storage.objects for insert to authenticated with check(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name));
drop policy "DM cleans uncommitted Handout objects" on storage.objects;
create policy "DM cleans uncommitted Handout objects" on storage.objects for delete to authenticated using(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||object_id::text=name));
create function public.change_party_handout(p_id uuid,p_expected_version integer,p_request_id uuid,p_kind text,p_title text default null,p_object_id uuid default null,p_digest text default null,p_mime text default null,p_size integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.party_handouts; signature text;
begin
 select * into item from public.party_handouts where id=p_id for update;
 if not found or not public.is_party_dm(item.party_id) then raise exception 'Dungeon Master access is required to manage Handouts' using errcode='42501'; end if;
 if p_request_id is null or p_expected_version<1 or p_expected_version is null then raise exception 'Invalid change request'; end if;
 if p_kind='rename' then
  if p_title is null or char_length(btrim(p_title)) not between 1 and 160 then raise exception 'Enter a title between 1 and 160 characters'; end if;
  signature='rename|'||btrim(p_title);
 elsif p_kind='replace' then
  if p_object_id is distinct from p_request_id or p_object_id is null or p_digest is null or p_mime is null or p_size is null then raise exception 'Invalid replacement'; end if;
  signature='replace|'||p_object_id::text||'|'||p_digest||'|'||p_size::text||'|'||p_mime;
 elsif p_kind in('reveal','withdraw') then signature=p_kind;
 else raise exception 'Unsupported Handout change'; end if;
 if item.last_request_id=p_request_id then
  if item.last_signature is distinct from signature then raise exception 'This change request was already used for different content'; end if;
  return jsonb_build_object('ok',true,'item',to_jsonb(item));
 end if;
 if item.version<>p_expected_version then return jsonb_build_object('ok',false,'item',to_jsonb(item)); end if;
 if p_kind='replace' and item.object_id=p_object_id then raise exception 'Choose a new replacement request'; end if;
 update public.party_handouts set
  title=case when p_kind='rename' then btrim(p_title) else title end,
  visibility=case when p_kind='reveal' then 'revealed' when p_kind='withdraw' then 'private' else visibility end,
  object_id=case when p_kind='replace' then p_object_id else object_id end,
  digest=case when p_kind='replace' then p_digest else digest end,
  mime=case when p_kind='replace' then p_mime else mime end,
  size=case when p_kind='replace' then p_size else size end,
  content_version=content_version+case when p_kind='replace' then 1 else 0 end,
  version=version+1,last_request_id=p_request_id,last_signature=signature
 where id=p_id returning * into item;
 return jsonb_build_object('ok',true,'item',to_jsonb(item));
end; $$;
revoke all on function public.change_party_handout(uuid,integer,uuid,text,text,uuid,text,text,integer) from public;
grant execute on function public.change_party_handout(uuid,integer,uuid,text,text,uuid,text,text,integer) to authenticated;
-- UPDATE old/new visibility may be hidden by RLS; adapters also poll full lists.
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='party_handouts') then alter publication supabase_realtime add table public.party_handouts; end if;
end; $$;
