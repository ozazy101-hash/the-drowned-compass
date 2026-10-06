-- Private campaign content is independent of the Character Record snapshot.
create table public.party_handouts (
 id uuid primary key,
 party_id uuid not null references public.parties(id),
 title text not null check (title = btrim(title) and char_length(title) between 1 and 160),
 visibility text not null default 'private' check (visibility = 'private'),
 mime text not null check (mime in ('image/png','image/jpeg','image/webp','application/pdf')),
 size integer not null check (size between 1 and 20971520),
 digest text not null check (digest ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
create function public.is_party_dm(target_party_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists (select 1 from public.party_members where party_id=target_party_id and user_id=(select auth.uid()) and role='dungeon-master');
$$;
revoke all on function public.is_party_dm(uuid) from public;
grant execute on function public.is_party_dm(uuid) to authenticated;
alter table public.party_handouts enable row level security;
revoke all on public.party_handouts from anon,authenticated;
grant select,insert on public.party_handouts to authenticated;
grant update(title) on public.party_handouts to authenticated;
create policy "DM reads private Handouts" on public.party_handouts for select to authenticated using(public.is_party_dm(party_id));
create policy "DM saves private Handouts" on public.party_handouts for insert to authenticated with check(public.is_party_dm(party_id) and exists(select 1 from storage.objects where bucket_id='party-handouts' and name=party_handouts.party_id::text||'/'||party_handouts.id::text and (metadata->>'size')::bigint=party_handouts.size and metadata->>'mimetype'=party_handouts.mime));
create policy "DM retitles Handouts" on public.party_handouts for update to authenticated using(public.is_party_dm(party_id)) with check(public.is_party_dm(party_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('party-handouts','party-handouts',false,20971520,array['image/png','image/jpeg','image/webp','application/pdf']);
-- Object paths are exactly party UUID / request UUID. No public thumbnail bucket.
create function public.can_manage_handout_object(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.party_members where user_id=(select auth.uid()) and role='dungeon-master' and object_name ~ ('^'||party_id::text||'/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'));
$$;
revoke all on function public.can_manage_handout_object(text) from public;
grant execute on function public.can_manage_handout_object(text) to authenticated;
create policy "DM downloads private Handout objects" on storage.objects for select to authenticated using(bucket_id='party-handouts' and public.can_manage_handout_object(name));
create policy "DM uploads private Handout objects" on storage.objects for insert to authenticated with check(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||id::text=name));
-- Compensation cannot remove a committed file, even when metadata commit races
-- the client recovery read. Storage never permits overwriting committed objects.
create policy "DM cleans uncommitted Handout objects" on storage.objects for delete to authenticated using(bucket_id='party-handouts' and public.can_manage_handout_object(name) and not exists(select 1 from public.party_handouts where party_id::text||'/'||id::text=name));

-- Serialize metadata commit against object compensation, not just client reads.
create function public.guard_handout_commit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.party_id::text||'/'||new.id::text,0));
 if not exists(select 1 from storage.objects where bucket_id='party-handouts' and name=new.party_id::text||'/'||new.id::text and (metadata->>'size')::bigint=new.size and metadata->>'mimetype'=new.mime) then raise exception 'Upload usable content before saving the Handout'; end if;
 return new;
end; $$;
create trigger guard_handout_commit before insert on public.party_handouts for each row execute function public.guard_handout_commit();
create function public.guard_handout_object_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='party-handouts' then
  perform pg_advisory_xact_lock(hashtextextended(old.name,0));
  if exists(select 1 from public.party_handouts where party_id::text||'/'||id::text=old.name) then return null; end if;
 end if;
 return old;
end; $$;
create trigger guard_handout_object_cleanup before delete on storage.objects for each row execute function public.guard_handout_object_cleanup();
revoke all on function public.guard_handout_commit(),public.guard_handout_object_cleanup() from public;
