-- Classes are independent conditional records. Slot identity/total level remain
-- compatibility projections for older readers; they cannot diverge from entries.
create table public.character_classes (
  slot_id uuid not null references public.character_slots(id) on delete cascade,
  entry_id text not null check (entry_id = 'primary' or entry_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  name text not null check (length(trim(name)) > 0),
  level integer not null check (level between 1 and 20),
  deleted boolean not null default false check (entry_id <> 'primary' or not deleted),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (slot_id, entry_id)
);
insert into public.character_classes(slot_id, entry_id, name, level, updated_by)
select id, 'primary', primary_class, level, updated_by from public.character_slots where claimed_at is not null;
alter table public.character_classes enable row level security;
revoke all on public.character_classes from public, anon, authenticated;
grant select on public.character_classes to authenticated;
create policy "Members can read classes" on public.character_classes for select to authenticated
using (exists (select 1 from public.character_slots s where s.id = slot_id and public.is_party_member(s.party_id)));

create function public.initialize_character_class() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.claimed_at is not null and old.claimed_at is null then
    insert into public.character_classes(slot_id, entry_id, name, level, updated_by)
    values (new.id, 'primary', new.primary_class, new.level, new.updated_by);
  end if;
  return new;
end;
$$;
revoke all on function public.initialize_character_class() from public, anon, authenticated;
create trigger initialize_character_class after update on public.character_slots
for each row execute function public.initialize_character_class();

create function public.guard_character_class_projection() returns trigger
language plpgsql security definer set search_path = '' as $$
declare total integer; primary_name text;
begin
  if old.claimed_at is not null then
    select sum(level), max(name) filter (where entry_id = 'primary')
      into total, primary_name from public.character_classes where slot_id = new.id and not deleted;
    if new.level is distinct from total or new.primary_class is distinct from primary_name then
      raise exception 'Edit class entries to change class or total level' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_character_class_projection() from public, anon, authenticated;
create trigger guard_character_class_projection before update on public.character_slots
for each row execute function public.guard_character_class_projection();

create function public.edit_character_class(target_slot_id uuid, target_entry_id text,
  next_name text, next_level integer, next_deleted boolean, expected_version bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target public.character_slots%rowtype;
  prior public.character_classes%rowtype;
  total integer;
  primary_name text;
begin
  select * into target from public.character_slots where id = target_slot_id
    and claimed_at is not null and public.is_party_member(party_id) for update;
  if not found then return false; end if;
  if expected_version is null or expected_version < 0 or next_name is null or next_level is null or next_deleted is null or length(trim(next_name)) not between 1 and 160 then
    raise exception 'Invalid class edit' using errcode = '23514';
  end if;
  select * into prior from public.character_classes where slot_id = target_slot_id and entry_id = target_entry_id;
  if coalesce(prior.version, 0) <> expected_version or coalesce(prior.deleted, false)
    or (prior.version is null and next_deleted) then return false; end if;
  insert into public.character_classes(slot_id, entry_id, name, level, deleted, version, updated_by)
    values (target_slot_id, target_entry_id, trim(next_name), next_level, next_deleted, expected_version + 1, auth.uid())
    on conflict (slot_id, entry_id) do update set name = excluded.name, level = excluded.level,
      deleted = excluded.deleted, version = excluded.version, updated_at = now(), updated_by = excluded.updated_by;
  select sum(level), max(name) filter (where entry_id = 'primary') into total, primary_name
    from public.character_classes where slot_id = target_slot_id and not deleted;
  if total is null or total not between 1 and 20 or primary_name is null then
    raise exception 'Total level must be between 1 and 20 with a primary class' using errcode = '23514';
  end if;
  update public.character_slots set level = total, primary_class = primary_name,
    overview_field_versions = jsonb_set(
      case when target_entry_id = 'primary' then jsonb_set(overview_field_versions, array['primaryClass'],
        to_jsonb(coalesce((overview_field_versions->>'primaryClass')::bigint,0)+1)) else overview_field_versions end,
      array['level'], to_jsonb(coalesce((overview_field_versions->>'level')::bigint,0)+1)),
    version = version + 1, updated_at = now(), updated_by = auth.uid() where id = target_slot_id;
  return true;
end;
$$;
revoke all on function public.edit_character_class(uuid,text,text,integer,boolean,bigint) from public, anon, authenticated;
grant execute on function public.edit_character_class(uuid,text,text,integer,boolean,bigint) to authenticated;

-- Legacy total-level writes adjust the primary entry while retaining other entries.
-- Their original field versions are retained; any class edit advances level's
-- compatibility version so a stale client cannot ignore a secondary class.
alter function public.update_character_overview_field(uuid,text,jsonb,bigint) rename to update_character_overview_field_before_classes;
create function public.update_character_overview_field(target_slot_id uuid, target_field text, next_value jsonb, expected_version bigint)
returns table (accepted boolean, current_version bigint)
language plpgsql set search_path = '' as $$
declare
  slot public.character_slots%rowtype;
  primary_entry public.character_classes%rowtype;
  field_version bigint;
  was_accepted boolean;
begin
  if target_field not in ('primaryClass','level') then
    return query select * from public.update_character_overview_field_before_classes(target_slot_id,target_field,next_value,expected_version); return;
  end if;
  select * into slot from public.character_slots where id = target_slot_id and claimed_at is not null for update;
  if not found then return query select false,0::bigint; return; end if;
  field_version := coalesce((slot.overview_field_versions->>target_field)::bigint,0);
  if expected_version is null or expected_version < 0 then raise exception 'Invalid version' using errcode = '23514'; end if;
  if expected_version <> field_version then return query select false,field_version; return; end if;
  select * into primary_entry from public.character_classes where slot_id=target_slot_id and entry_id='primary';
  if target_field='level' and (jsonb_typeof(next_value) is distinct from 'number'
    or (next_value #>> '{}')::numeric <> trunc((next_value #>> '{}')::numeric)) then
    raise exception 'Class levels must be whole numbers' using errcode = '23514';
  end if;
  if target_field='primaryClass' and jsonb_typeof(next_value) is distinct from 'string' then
    raise exception 'Class name must be text' using errcode = '23514';
  end if;
  was_accepted := public.edit_character_class(target_slot_id,'primary',
    case when target_field='primaryClass' then next_value #>> '{}' else primary_entry.name end,
    case when target_field='level' then (next_value #>> '{}')::integer - (slot.level - primary_entry.level) else primary_entry.level end,false,primary_entry.version);
  return query select was_accepted,field_version + case when was_accepted then 1 else 0 end;
end;
$$;
revoke all on function public.update_character_overview_field(uuid,text,jsonb,bigint) from public, anon;
grant execute on function public.update_character_overview_field(uuid,text,jsonb,bigint) to authenticated;
alter publication supabase_realtime add table public.character_classes;
