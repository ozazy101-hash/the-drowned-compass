-- Preserve existing boolean choices while adopting the ticket's three proficiency states.
alter table public.character_slots drop constraint character_slots_saving_throw_proficiencies_valid;
update public.character_slots set saving_throw_proficiencies = (
  select jsonb_object_agg(key, case when value = 'true'::jsonb then '"proficient"'::jsonb else '"none"'::jsonb end)
  from jsonb_each(saving_throw_proficiencies)
);
alter table public.character_slots alter column saving_throw_proficiencies set default
  '{"strength":"none","dexterity":"none","constitution":"none","intelligence":"none","wisdom":"none","charisma":"none"}'::jsonb;

create or replace function public.valid_saving_throw_proficiencies(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'object' then
    value ?& array['strength','dexterity','constitution','intelligence','wisdom','charisma']
    and not exists (select 1 from jsonb_each(value) as entry(key, item)
      where key <> all (array['strength','dexterity','constitution','intelligence','wisdom','charisma'])
        or jsonb_typeof(item) <> 'string' or (item #>> '{}') not in ('none','proficient','expertise'))
    else false end;
$$;
alter table public.character_slots add constraint character_slots_saving_throw_proficiencies_valid
  check (public.valid_saving_throw_proficiencies(saving_throw_proficiencies));

create or replace function public.valid_skill_proficiencies(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(value) = 'object' then value ?& array[
      'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
      'history', 'insight', 'intimidation', 'investigation', 'medicine',
      'nature', 'perception', 'performance', 'persuasion', 'religion',
      'sleightOfHand', 'stealth', 'survival'
    ]
    and not exists (
      select 1 from jsonb_each(value) as entry(key, item)
      where key <> all (array[
        'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
        'history', 'insight', 'intimidation', 'investigation', 'medicine',
        'nature', 'perception', 'performance', 'persuasion', 'religion',
        'sleightOfHand', 'stealth', 'survival'
      ]) or jsonb_typeof(item) <> 'string'
        or (item #>> '{}') not in ('none', 'proficient', 'expertise')
    ) else false end;
$$;

revoke all on function public.valid_skill_proficiencies(jsonb) from public, anon;
grant execute on function public.valid_skill_proficiencies(jsonb) to authenticated;

create function public.valid_derived_overrides(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) = 'object' then not exists (
    select 1 from jsonb_each(value) as entry(key, item)
    where key <> all (array['ability.strength', 'ability.dexterity', 'ability.constitution', 'ability.intelligence', 'ability.wisdom', 'ability.charisma', 'save.strength', 'save.dexterity', 'save.constitution', 'save.intelligence', 'save.wisdom', 'save.charisma', 'skill.acrobatics', 'skill.animalHandling', 'skill.arcana', 'skill.athletics', 'skill.deception', 'skill.history', 'skill.insight', 'skill.intimidation', 'skill.investigation', 'skill.medicine', 'skill.nature', 'skill.perception', 'skill.performance', 'skill.persuasion', 'skill.religion', 'skill.sleightOfHand', 'skill.stealth', 'skill.survival', 'proficiencyBonus', 'passivePerception', 'initiative', 'spellAttack', 'spellSaveDC'])
      or case when jsonb_typeof(item) = 'number' then
        (item #>> '{}')::numeric not between -999 and 999
        or trunc((item #>> '{}')::numeric) <> (item #>> '{}')::numeric
      else true end
  ) else false end;
$$;
revoke all on function public.valid_derived_overrides(jsonb) from public, anon;
grant execute on function public.valid_derived_overrides(jsonb) to authenticated;
revoke all on function public.valid_saving_throw_proficiencies(jsonb) from public, anon;
grant execute on function public.valid_saving_throw_proficiencies(jsonb) to authenticated;

alter table public.character_slots add column derived_overrides jsonb not null default '{}'::jsonb
  constraint character_slots_derived_overrides_valid check (public.valid_derived_overrides(derived_overrides));

create or replace function public.update_character_overview_field(
  target_slot_id uuid,
  target_field text,
  next_value jsonb,
  expected_version bigint
)
returns table (accepted boolean, current_version bigint)
language plpgsql
set search_path = ''
as $$
declare
  current_slot public.character_slots%rowtype;
  field_version bigint;
  number_value numeric;
  text_value text;
begin
  next_value := coalesce(next_value, 'null'::jsonb);
  select * into current_slot
  from public.character_slots
  where id = target_slot_id and claimed_at is not null
  for update;

  if not found then
    return query select false, 0::bigint;
    return;
  end if;

  field_version := coalesce((current_slot.overview_field_versions ->> target_field)::bigint, 0);
  if field_version <> expected_version then
    return query select false, field_version;
    return;
  end if;

  if target_field in (
    'playerName', 'characterName', 'primaryClass', 'subclass', 'species', 'background'
  ) then
    if jsonb_typeof(next_value) <> 'string' or length(trim(next_value #>> '{}')) = 0 then
      raise exception 'Identity values must be non-empty text' using errcode = '23514';
    end if;
    text_value := trim(next_value #>> '{}');
  elsif target_field = 'level'
    or target_field in ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')
    or target_field in ('armorClass', 'maxHitPoints', 'speed') then
    if jsonb_typeof(next_value) <> 'number' then
      raise exception 'Numeric overview values must be numbers' using errcode = '23514';
    end if;
    number_value := (next_value #>> '{}')::numeric;
    if trunc(number_value) <> number_value
      or (target_field = 'level' and number_value not between 1 and 20)
      or (target_field in ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma') and number_value not between 1 and 30)
      or (target_field = 'armorClass' and number_value not between 0 and 999)
      or (target_field = 'maxHitPoints' and number_value not between 1 and 9999)
      or (target_field = 'speed' and number_value not between 0 and 999) then
      raise exception 'Numeric overview value is out of range' using errcode = '23514';
    end if;
  elsif target_field like 'override.%' then
    -- Validate the key and value together using the CHECK validator's allowlist.
    -- A reset supplies zero only for validation; the write still removes the key.
    if not public.valid_derived_overrides(jsonb_build_object(
      substring(target_field from 10),
      case when next_value = 'null'::jsonb then '0'::jsonb else next_value end
    )) then
      raise exception 'Invalid Derived Value override' using errcode = '23514';
    end if;
  elsif target_field like 'save.%' then
    if substring(target_field from 6) not in ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')
      or jsonb_typeof(next_value) <> 'string'
      or (next_value #>> '{}') not in ('none', 'proficient', 'expertise') then
      raise exception 'Invalid saving throw proficiency' using errcode = '23514';
    end if;
  elsif target_field like 'skill.%' then
    if substring(target_field from 7) not in (
      'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception',
      'history', 'insight', 'intimidation', 'investigation', 'medicine',
      'nature', 'perception', 'performance', 'persuasion', 'religion',
      'sleightOfHand', 'stealth', 'survival'
    ) or jsonb_typeof(next_value) <> 'string'
      or (next_value #>> '{}') not in ('none', 'proficient', 'expertise') then
      raise exception 'Invalid skill proficiency' using errcode = '23514';
    end if;
  elsif target_field = 'spellcastingAbility' then
    if next_value <> 'null'::jsonb and (
      jsonb_typeof(next_value) <> 'string'
      or (next_value #>> '{}') not in ('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma')
    ) then
      raise exception 'Invalid spellcasting Ability' using errcode = '23514';
    end if;
  else
    raise exception 'Unknown Character Overview field' using errcode = '23514';
  end if;

  update public.character_slots
  set
    player_name = case when target_field = 'playerName' then text_value else player_name end,
    character_name = case when target_field = 'characterName' then text_value else character_name end,
    primary_class = case when target_field = 'primaryClass' then text_value else primary_class end,
    subclass = case when target_field = 'subclass' then text_value else subclass end,
    species = case when target_field = 'species' then text_value else species end,
    background = case when target_field = 'background' then text_value else background end,
    level = case when target_field = 'level' then number_value::integer else level end,
    strength = case when target_field = 'strength' then number_value::integer else strength end,
    dexterity = case when target_field = 'dexterity' then number_value::integer else dexterity end,
    constitution = case when target_field = 'constitution' then number_value::integer else constitution end,
    intelligence = case when target_field = 'intelligence' then number_value::integer else intelligence end,
    wisdom = case when target_field = 'wisdom' then number_value::integer else wisdom end,
    charisma = case when target_field = 'charisma' then number_value::integer else charisma end,
    saving_throw_proficiencies = case when target_field like 'save.%'
      then jsonb_set(saving_throw_proficiencies, array[substring(target_field from 6)], next_value)
      else saving_throw_proficiencies end,
    skill_proficiencies = case when target_field like 'skill.%'
      then jsonb_set(skill_proficiencies, array[substring(target_field from 7)], next_value)
      else skill_proficiencies end,
    armor_class = case when target_field = 'armorClass' then number_value::integer else armor_class end,
    max_hit_points = case when target_field = 'maxHitPoints' then number_value::integer else max_hit_points end,
    speed = case when target_field = 'speed' then number_value::integer else speed end,
    spellcasting_ability = case when target_field = 'spellcastingAbility'
      then nullif(next_value #>> '{}', '') else spellcasting_ability end,
    derived_overrides = case when target_field like 'override.%' then
      case when next_value = 'null'::jsonb then derived_overrides - substring(target_field from 10)
      else jsonb_set(derived_overrides, array[substring(target_field from 10)], next_value) end
      else derived_overrides end,
    overview_field_versions = jsonb_set(
      overview_field_versions,
      array[target_field],
      to_jsonb(field_version + 1)
    ),
    version = version + 1,
    updated_at = now(),
    updated_by = (select auth.uid())
  where id = target_slot_id;

  return query select true, field_version + 1;
end;
$$;

revoke all on function public.update_character_overview_field(uuid, text, jsonb, bigint) from public;
grant execute on function public.update_character_overview_field(uuid, text, jsonb, bigint) to authenticated;
