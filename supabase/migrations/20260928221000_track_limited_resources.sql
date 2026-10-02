-- Each repeatable resource has a conditional-write version. Deleted records remain as
-- tombstones so delayed full snapshots cannot resurrect them on connected clients.
create table public.limited_resources (
  id uuid primary key,
  slot_id uuid not null references public.character_slots(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  current integer not null check (current >= 0),
  maximum integer not null check (maximum between 0 and 9999 and current <= maximum),
  recovery text not null check (recovery in ('Short Rest', 'Long Rest', 'Dawn', 'Manual')),
  position double precision not null check (position between -1000000000000 and 1000000000000),
  important boolean not null default false,
  deleted boolean not null default false check (not (deleted and important)),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
create index limited_resources_slot on public.limited_resources(slot_id);
create unique index limited_resources_one_important on public.limited_resources(slot_id) where important and not deleted;
alter table public.limited_resources enable row level security;
revoke all on public.limited_resources from public, anon, authenticated;
grant select on public.limited_resources to authenticated;
create policy "Members can read limited resources" on public.limited_resources for select to authenticated
using (exists (select 1 from public.character_slots slot where slot.id = slot_id and public.is_party_member(slot.party_id)));

create function public.write_limited_resource(
  target_slot_id uuid, target_resource_id uuid, next_name text,
  next_current integer, next_maximum integer, next_recovery text,
  next_position double precision, next_important boolean, next_deleted boolean, expected_version integer
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  resource public.limited_resources;
  slot public.character_slots;
begin
  -- All resource mutations for one Character Slot serialize here. This makes the
  -- important-resource handoff atomic and avoids lost concurrent spend/restore writes.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_resource_id::text, 0));
  select * into slot from public.character_slots where id = target_slot_id for update;
  if not found or slot.claimed_at is null or not public.is_party_member(slot.party_id) then return false; end if;
  select * into resource from public.limited_resources where id = target_resource_id;
  if found then
    if resource.slot_id <> target_slot_id or resource.deleted or resource.version <> expected_version then return false; end if;
  elsif expected_version <> 0 or next_deleted then return false;
  end if;
  if next_important and not next_deleted then
    update public.limited_resources set important = false, version = version + 1, updated_at = now()
      where slot_id = target_slot_id and important and id <> target_resource_id;
  end if;
  insert into public.limited_resources(id,slot_id,name,current,maximum,recovery,position,important,deleted,version)
  values(target_resource_id,target_slot_id,btrim(next_name),next_current,next_maximum,next_recovery,next_position,
    next_important and not next_deleted,next_deleted,expected_version + 1)
  on conflict(id) do update set name=excluded.name,current=excluded.current,maximum=excluded.maximum,
    recovery=excluded.recovery,position=excluded.position,important=excluded.important,deleted=excluded.deleted,
    version=excluded.version,updated_at=now();
  return true;
end;
$$;
revoke all on function public.write_limited_resource(uuid,uuid,text,integer,integer,text,double precision,boolean,boolean,integer) from public, anon;
grant execute on function public.write_limited_resource(uuid,uuid,text,integer,integer,text,double precision,boolean,boolean,integer) to authenticated;
alter publication supabase_realtime add table public.limited_resources;
