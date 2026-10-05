-- A rest uses the same Character Slot lock as the independently addressed commands.
-- Its latest receipt permits safe immediate retries after a lost acknowledgement.
create table public.character_rest_receipts (
  slot_id uuid primary key references public.character_slots(id) on delete cascade,
  command jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.character_rest_receipts enable row level security;
revoke all on public.character_rest_receipts from public, anon, authenticated;
grant select on public.character_rest_receipts to authenticated;
create policy "Members read rest receipts" on public.character_rest_receipts for select to authenticated
using (exists(select 1 from public.character_slots s where s.id=slot_id and public.is_party_member(s.party_id)));
create function public.resolve_character_rest(target_slot_id uuid, command jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  slot public.character_slots%rowtype;
  prior jsonb;
  receipt jsonb;
  change jsonb;
  resource public.limited_resources%rowtype;
  magic public.character_magic%rowtype;
  expected bigint;
  kind text;
  field text;
  keys text[];
  addressed text[] := array[]::text[];
  address text;
  health_changed boolean := false;
  next_health jsonb;
begin
  select * into slot from public.character_slots where id=target_slot_id and claimed_at is not null and public.is_party_member(party_id) for update;
  if not found then return false; end if;
  if command is null or jsonb_typeof(command) <> 'object' then raise exception 'Invalid rest command' using errcode='23514'; end if;
  if (select array_agg(k order by k) from jsonb_object_keys(command) k) <> array['changes','operationId','rest']
    or jsonb_typeof(command->'operationId') is distinct from 'string'
    or (command->>'operationId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(command->'rest') is distinct from 'string' or command->>'rest' not in ('Short Rest','Long Rest')
    or jsonb_typeof(command->'changes') is distinct from 'array' then raise exception 'Invalid rest command' using errcode='23514'; end if;
  if jsonb_array_length(command->'changes') not between 1 and 1000 then raise exception 'Invalid rest selection' using errcode='23514'; end if;
  select state into prior from public.character_survival where slot_id=target_slot_id;
  prior := coalesce(prior,'{"current":null,"temporary":0,"version":0,"successes":0,"failures":0,"unconscious":false,"inspiration":false,"undo":null}'::jsonb);
  -- Validate complete shape before a receipt can acknowledge the operation.
  for change in select value from jsonb_array_elements(command->'changes') loop
    if jsonb_typeof(change) <> 'object' or jsonb_typeof(change->'expectedVersion') is distinct from 'number'
      or (change->>'expectedVersion') !~ '^[0-9]+$' or (change->>'expectedVersion')::numeric >= 9007199254740991 then raise exception 'Invalid rest version' using errcode='23514'; end if;
    expected := (change->>'expectedVersion')::bigint; kind := change->>'kind'; field := change->>'field';
    select array_agg(k order by k) into keys from jsonb_object_keys(change) k;
    if kind='resource' then
      if keys <> array['expectedVersion','id','kind'] or jsonb_typeof(change->'id') is distinct from 'string' or (change->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or expected >= 2147483647 then raise exception 'Invalid rest resource' using errcode='23514'; end if;
      address := 'resource.' || lower(change->>'id');
    elsif kind='slots' then
      if keys <> array['expectedVersion','kind','level'] or command->>'rest' <> 'Long Rest' or jsonb_typeof(change->'level') is distinct from 'number' or (change->>'level') !~ '^[1-9]$' then raise exception 'Invalid rest slots' using errcode='23514'; end if;
      address := 'slots.' || (change->>'level');
    elsif kind='health' then
      if command->>'rest' <> 'Long Rest' or field is null or field not in ('current','successes','failures') then raise exception 'Invalid rest health' using errcode='23514'; end if;
      if field='current' then
        if keys <> array['expectedVersion','field','kind','maximumVersion'] or jsonb_typeof(change->'maximumVersion') is distinct from 'number' or (change->>'maximumVersion') !~ '^[0-9]+$' or (change->>'maximumVersion')::numeric >= 9007199254740991 then raise exception 'Invalid maximum version' using errcode='23514'; end if;
      elsif keys <> array['expectedVersion','field','kind'] then raise exception 'Invalid rest health' using errcode='23514'; end if;
      address := 'health.' || field;
    else raise exception 'Invalid rest change' using errcode='23514'; end if;
    if address=any(addressed) then raise exception 'Duplicate rest change' using errcode='23514'; end if;
    addressed := array_append(addressed,address);
  end loop;
  select r.command into receipt from public.character_rest_receipts r where slot_id=target_slot_id;
  if receipt->>'operationId' = command->>'operationId' then
    if receipt <> command then raise exception 'Rest operation identity cannot change' using errcode='23514'; end if;
    return true;
  end if;
  -- Every selected prerequisite is checked before the first write. Exclusions
  -- intentionally do not participate in CAS, including maximum HP if excluded.
  for change in select value from jsonb_array_elements(command->'changes') loop
    expected := (change->>'expectedVersion')::bigint; kind := change->>'kind'; field := change->>'field';
    if kind='resource' then
      select * into resource from public.limited_resources where slot_id=target_slot_id and id=(change->>'id')::uuid;
      if not found or resource.deleted or resource.version <> expected or resource.current=resource.maximum or not (resource.recovery='Short Rest' or (command->>'rest'='Long Rest' and resource.recovery='Long Rest')) then return false; end if;
    elsif kind='slots' then
      select * into magic from public.character_magic where slot_id=target_slot_id and id='slots.' || (change->>'level');
      if not found or magic.kind <> 'slots' or magic.version <> expected or magic.state->'remaining'=magic.state->'maximum' then return false; end if;
    else
      if (prior->>'version')::bigint <> expected then return false; end if;
      if field='current' then
        if coalesce((slot.overview_field_versions->>'maxHitPoints')::bigint,0) <> (change->>'maximumVersion')::bigint or prior->'current'=to_jsonb(slot.max_hit_points) then return false; end if;
      elsif (prior->>field)::integer=0 then return false; end if;
    end if;
  end loop;
  next_health := prior;
  for change in select value from jsonb_array_elements(command->'changes') loop
    kind := change->>'kind'; field := change->>'field';
    if kind='resource' then
      update public.limited_resources set current=maximum,version=version+1,updated_at=now() where slot_id=target_slot_id and id=(change->>'id')::uuid;
    elsif kind='slots' then
      update public.character_magic set state=jsonb_set(state,'{remaining}',state->'maximum'),version=version+1,updated_at=now(),updated_by=auth.uid() where slot_id=target_slot_id and id='slots.' || (change->>'level');
    else
      health_changed := true;
      next_health := jsonb_set(next_health,array[field],to_jsonb(case when field='current' then slot.max_hit_points else 0 end));
      if field='current' then next_health := jsonb_set(next_health,'{undo}','null'::jsonb); end if;
    end if;
  end loop;
  if health_changed then
    next_health := jsonb_set(next_health,'{version}',to_jsonb((prior->>'version')::bigint+1));
    insert into public.character_survival(slot_id,state,updated_by) values(target_slot_id,next_health,auth.uid())
      on conflict(slot_id) do update set state=excluded.state,updated_at=now(),updated_by=excluded.updated_by;
  end if;
  insert into public.character_rest_receipts(slot_id,command) values(target_slot_id,command)
    on conflict(slot_id) do update set command=excluded.command,updated_at=now();
  return true;
end;
$$;
revoke all on function public.resolve_character_rest(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.resolve_character_rest(uuid,jsonb) to authenticated;
