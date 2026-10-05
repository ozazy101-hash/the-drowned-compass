-- New neutral Health commands preserve legacy Temporary HP data without consuming it.
create or replace function public.update_character_survival(target_slot_id uuid, command jsonb, expected_version bigint, maximum_version bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  slot public.character_slots%rowtype;
  prior jsonb; next_state jsonb; kind text; field text; amount integer; current_hp integer; temporary_hp integer; max_version bigint;
begin
  select * into slot from public.character_slots where id=target_slot_id and claimed_at is not null and public.is_party_member(party_id) for update;
  if not found then return false; end if;
  select state into prior from public.character_survival where slot_id=target_slot_id;
  prior := coalesce(prior, '{"current":null,"temporary":0,"version":0,"successes":0,"failures":0,"unconscious":false,"inspiration":false,"undo":null}'::jsonb);
  max_version := coalesce((slot.overview_field_versions->>'maxHitPoints')::bigint,0);
  if expected_version is null or maximum_version is null or expected_version <> (prior->>'version')::bigint or maximum_version <> max_version then return false; end if;
  if command is null or jsonb_typeof(command) <> 'object' then raise exception 'Invalid survival command' using errcode='23514'; end if;
  kind := command->>'kind'; field := command->>'field'; next_state := prior;
  if kind = 'undo' then
    if prior->'undo' = 'null'::jsonb or (prior->'undo'->>'maximumVersion')::bigint <> max_version then return false; end if;
    next_state := next_state || (prior->'undo'->'before') || '{"undo":null}'::jsonb;
  elsif kind in ('add','subtract','set-current') then
    field := case when kind='set-current' then 'value' else 'amount' end;
    if jsonb_typeof(command->field) is distinct from 'number' then raise exception 'Invalid amount' using errcode='23514'; end if;
    if (command->>field)::numeric <> trunc((command->>field)::numeric) or (command->>field)::numeric < 0 or (command->>field)::numeric > 9999 then raise exception 'Invalid amount' using errcode='23514'; end if;
    amount := (command->>field)::integer;
    current_hp := (prior->>'current')::integer;
    if kind='set-current' then
      if amount > slot.max_hit_points then raise exception 'Current exceeds Maximum Hit Points' using errcode='23514'; end if;
      current_hp := amount;
    else
      if current_hp is null then raise exception 'Set Current Hit Points first' using errcode='23514'; end if;
      current_hp := least(slot.max_hit_points,greatest(0,current_hp + case when kind='add' then amount else -amount end));
    end if;
    next_state := next_state || jsonb_build_object('current',current_hp,'undo',jsonb_build_object('before',jsonb_build_object('current',prior->'current','temporary',prior->'temporary'),'maximumVersion',max_version,'label',kind));
  elsif kind='track' and field in ('unconscious','inspiration') then
    if jsonb_typeof(command->'value') is distinct from 'boolean' then raise exception 'Invalid survival flag' using errcode='23514'; end if;
    next_state := jsonb_set(next_state,array[field],command->'value');
  elsif kind in ('damage','heal','correct','track') then
    if (kind='correct' and (field is null or field not in ('current','temporary'))) or
       (kind='track' and (field is null or field not in ('successes','failures'))) then raise exception 'Invalid survival field' using errcode='23514'; end if;
    if jsonb_typeof(command->(case when kind in ('damage','heal') then 'amount' else 'value' end)) is distinct from 'number' then raise exception 'Invalid amount' using errcode='23514'; end if;
    if (command->>(case when kind in ('damage','heal') then 'amount' else 'value' end))::numeric <> trunc((command->>(case when kind in ('damage','heal') then 'amount' else 'value' end))::numeric) then raise exception 'Whole numbers required' using errcode='23514'; end if;
    amount := (command->>(case when kind in ('damage','heal') then 'amount' else 'value' end))::integer;
    if amount < 0 or amount > (case when kind='track' then 3 else 9999 end) then raise exception 'Invalid amount' using errcode='23514'; end if;
    if kind='track' then next_state := jsonb_set(next_state,array[field],to_jsonb(amount));
    else
      current_hp := (prior->>'current')::integer; temporary_hp := (prior->>'temporary')::integer;
      if kind in ('damage','heal') and current_hp is null then raise exception 'Set Current Hit Points first' using errcode='23514'; end if;
      if kind='correct' then next_state := jsonb_set(next_state,array[field],to_jsonb(amount));
      elsif kind='damage' then next_state := next_state || jsonb_build_object('current',greatest(0,current_hp-greatest(0,amount-temporary_hp)),'temporary',greatest(0,temporary_hp-amount));
      else next_state := jsonb_set(next_state,'{current}',to_jsonb(least(slot.max_hit_points,current_hp+amount))); end if;
      next_state := next_state || jsonb_build_object('undo', jsonb_build_object('before',jsonb_build_object('current',prior->'current','temporary',prior->'temporary'),'maximumVersion',max_version,'label',kind));
    end if;
  else raise exception 'Invalid survival command' using errcode='23514'; end if;
  next_state := jsonb_set(next_state,'{version}',to_jsonb(expected_version+1));
  insert into public.character_survival(slot_id,state,updated_by) values(target_slot_id,next_state,auth.uid())
  on conflict(slot_id) do update set state=excluded.state,updated_at=now(),updated_by=excluded.updated_by;
  return true;
end;
$$;
