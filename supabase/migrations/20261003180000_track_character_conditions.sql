-- Independent associations with retained tombstones and conditional record writes.
create table public.character_conditions (
  slot_id uuid not null references public.character_slots(id) on delete cascade,
  id text not null,
  standard text,
  label text not null check (length(label) between 1 and 120 and label = trim(label)),
  deleted boolean not null default false,
  version bigint not null check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (slot_id, id),
  check ((standard is not null and standard in ('Blinded','Charmed','Deafened','Exhaustion','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious') and id = 'srd.' || standard and label = standard)
    or (standard is null and id ~ '^custom\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'))
);
create unique index character_custom_condition_names on public.character_conditions(slot_id, lower(label)) where standard is null and not deleted;
alter table public.character_conditions enable row level security;
revoke all on public.character_conditions from public, anon, authenticated;
grant select on public.character_conditions to authenticated;
create policy "Members read Character Conditions" on public.character_conditions for select to authenticated
using (exists(select 1 from public.character_slots s where s.id = slot_id and public.is_party_member(s.party_id)));

create function public.update_character_condition(target_slot_id uuid, command jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  prior public.character_conditions%rowtype;
  expected bigint;
  next_standard text;
  next_label text;
begin
  perform 1 from public.character_slots where id = target_slot_id and claimed_at is not null and public.is_party_member(party_id) for update;
  if not found then return false; end if;
  if command is null or jsonb_typeof(command) <> 'object'
    or jsonb_typeof(command->'expectedVersion') is distinct from 'number'
    or (command->>'expectedVersion') !~ '^[0-9]+$'
    or jsonb_typeof(command->'deleted') is distinct from 'boolean'
    or jsonb_typeof(command->'id') is distinct from 'string'
    or jsonb_typeof(command->'label') is distinct from 'string'
    or jsonb_typeof(command->'standard') not in ('null','string')
    or not (command ? 'standard') then
    raise exception 'Invalid Condition command' using errcode = '23514';
  end if;
  expected := (command->>'expectedVersion')::bigint;
  next_standard := command->>'standard';
  next_label := btrim(command->>'label', E' \t\n\r\f');
  if expected > 9007199254740991 or length(command->>'label') > 120 or length(next_label) = 0
    or (next_standard is not null and (next_standard not in ('Blinded','Charmed','Deafened','Exhaustion','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious')
      or command->>'id' <> 'srd.' || next_standard or command->>'label' <> next_standard))
    or (next_standard is null and (command->>'id') !~ '^custom\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Invalid Condition identity or name' using errcode = '23514';
  end if;
  select * into prior from public.character_conditions where slot_id = target_slot_id and id = command->>'id';
  if coalesce(prior.version,0) <> expected then return false; end if;
  if prior.id is not null and prior.standard is distinct from next_standard then
    raise exception 'Condition identity cannot change' using errcode = '23514';
  end if;
  if prior.id is null and (command->>'deleted')::boolean then return false; end if;
  insert into public.character_conditions(slot_id,id,standard,label,deleted,version,updated_by)
  values(target_slot_id,command->>'id',next_standard,next_label,(command->>'deleted')::boolean,expected+1,auth.uid())
  on conflict (slot_id,id) do update set label=excluded.label,deleted=excluded.deleted,version=excluded.version,updated_at=now(),updated_by=excluded.updated_by;
  return true;
end;
$$;
revoke all on function public.update_character_condition(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.update_character_condition(uuid,jsonb) to authenticated;
alter publication supabase_realtime add table public.character_conditions;
