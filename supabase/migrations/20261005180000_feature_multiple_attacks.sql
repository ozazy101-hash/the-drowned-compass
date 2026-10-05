-- Preserve the legacy table and primary column for old backups/clients.
alter table public.character_primary_attacks add column featured_ids uuid[] not null default '{}';
update public.character_primary_attacks p set featured_ids = array[p.primary_id]
where p.primary_id is not null and exists (select 1 from public.character_combat_entries e where e.id=p.primary_id and e.slot_id=p.slot_id and not e.deleted and e.details->>'kind'='attack');
-- Repeatable Combat records; tombstones prevent delayed snapshots reviving removals.
create or replace function public.valid_combat_entry_details(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_typeof(value) = 'object'
    and value ?& array['kind','name','attackBonus','ability','range','damage','damageType','notes']
    and not exists (select 1 from jsonb_object_keys(value) k where k not in ('kind','name','attackBonus','ability','range','damage','damageType','notes','category'))
    and (not value ? 'category' or (jsonb_typeof(value->'category') = 'string' and value->>'category' in ('melee','ranged','other')))
    and value->>'kind' in ('attack','action')
    and length(btrim(value->>'name')) between 1 and 120
    and not exists (select 1 from jsonb_each(value) e where e.key in ('name','attackBonus','range','damage','damageType','notes')
      and (jsonb_typeof(e.value) <> 'string' or length(e.value #>> '{}') > case when e.key = 'notes' then 4000 else 120 end))
    and (value->>'attackBonus' = '' or (value->>'attackBonus' ~ '^-?[0-9]{1,3}$'))
    and (value->'ability' = 'null'::jsonb or value->>'ability' in ('strength','dexterity','constitution','intelligence','wisdom','charisma')),
  false);
$$;
revoke all on function public.valid_combat_entry_details(jsonb) from public, anon, authenticated;
grant execute on function public.valid_combat_entry_details(jsonb) to authenticated;

create or replace function public.update_character_combat_entry(target_slot_id uuid, command jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  slot public.character_slots;
  entry public.character_combat_entries;
  selection public.character_primary_attacks;
  target_id uuid;
  expected bigint;
  operation text;
  next_rank double precision;
  selected_ids uuid[];
begin
  select * into slot from public.character_slots where id = target_slot_id and public.is_party_member(party_id) for update;
  if slot.id is null or slot.claimed_at is null or not public.is_party_member(slot.party_id) then
    raise exception 'That Character Record is unavailable.' using errcode = '42501';
  end if;
  if jsonb_typeof(command) <> 'object' or command->>'expectedVersion' is null
    or command->>'expectedVersion' !~ '^[0-9]+$' then raise exception 'Invalid version.' using errcode = '23514'; end if;
  expected := (command->>'expectedVersion')::bigint;
  operation := command->>'type';
  target_id := (command->>'id')::uuid;
  select * into selection from public.character_primary_attacks where slot_id = target_slot_id;
  if operation in ('primary','featured') then
    if selection.version <> expected then return false; end if;
    if operation = 'primary' then selected_ids := case when target_id is null then '{}'::uuid[] else array[target_id] end;
    else
      if jsonb_typeof(command->'ids') is distinct from 'array' then raise exception 'Choose available attacks.' using errcode = '23514'; end if;
      if exists (select 1 from jsonb_array_elements(command->'ids') v where jsonb_typeof(v) <> 'string') then raise exception 'Choose available attacks.' using errcode = '23514'; end if;
      select coalesce(array_agg(distinct value::uuid), '{}'::uuid[]) into selected_ids from jsonb_array_elements_text(command->'ids');
    end if;
    if exists (select 1 from unnest(selected_ids) as selected(id) where not exists (select 1 from public.character_combat_entries e where e.id=selected.id and e.slot_id=target_slot_id and not e.deleted and e.details->>'kind'='attack')) then
      raise exception 'Choose available attacks.' using errcode = '23514';
    end if;
    update public.character_primary_attacks set featured_ids = selected_ids, primary_id = selected_ids[1], version = version + 1,
      updated_at = now(), updated_by = auth.uid() where slot_id = target_slot_id;
    return true;
  end if;
  if target_id is null or operation is null or operation not in ('save','move','remove') then
    raise exception 'Invalid attack or action command.' using errcode = '23514';
  end if;
  select * into entry from public.character_combat_entries where id = target_id;
  if entry.id is not null and entry.slot_id <> target_slot_id then
    raise exception 'That attack or action is unavailable.' using errcode = '42501';
  end if;
  if coalesce(entry.version, 0) <> expected or coalesce(entry.deleted, false) then return false; end if;
  if operation in ('save','move') then
    next_rank := (command->>'rank')::double precision;
    if next_rank is null or not (next_rank between -1e12 and 1e12) then raise exception 'Invalid order.' using errcode = '23514'; end if;
  end if;
  if operation = 'save' then
    if not public.valid_combat_entry_details(command->'details') then raise exception 'Invalid attack or action details.' using errcode = '23514'; end if;
    if entry.id is null then
      insert into public.character_combat_entries(id,slot_id,details,rank,updated_by)
        values(target_id,target_slot_id,command->'details',next_rank,auth.uid());
    else
      update public.character_combat_entries set details = command->'details', rank = next_rank, version = version + 1,
        updated_at = now(), updated_by = auth.uid() where id = target_id;
    end if;
  elsif entry.id is null then return false;
  elsif operation = 'move' then
    update public.character_combat_entries set rank = next_rank, version = version + 1,
      updated_at = now(), updated_by = auth.uid() where id = target_id;
  else
    update public.character_combat_entries set deleted = true, version = version + 1,
      updated_at = now(), updated_by = auth.uid() where id = target_id;
  end if;
  if target_id = any(selection.featured_ids) and (operation = 'remove' or (operation = 'save' and command->'details'->>'kind' <> 'attack')) then
    update public.character_primary_attacks set featured_ids = array_remove(featured_ids, target_id), primary_id = (array_remove(featured_ids, target_id))[1], version = version + 1,
      updated_at = now(), updated_by = auth.uid() where slot_id = target_slot_id;
  end if;
  return true;
end;
$$;
revoke all on function public.update_character_combat_entry(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.update_character_combat_entry(uuid,jsonb) to authenticated;
