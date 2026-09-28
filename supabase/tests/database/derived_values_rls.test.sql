begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'players@drowned-compass.test', '', now(),
    '{}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'dm@drowned-compass.test', '', now(),
    '{}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'overview-outsider@drowned-compass.test', '', now(),
    '{}', '{}', now(), now()
  );

set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    update public.character_slots
    set claimed_at = now(),
      claimed_by = '30000000-0000-4000-8000-000000000001',
      player_name = 'Mara', character_name = 'Neris Vale',
      primary_class = 'Rogue', subclass = 'Thief', species = 'Human',
      background = 'Sailor', level = 3,
      strength = 9, dexterity = 17, constitution = 13,
      intelligence = 14, wisdom = 12, charisma = 11,
      version = 1, updated_at = now()
    where position = 1
    returning character_name
  $$,
  array['Neris Vale'],
  'Player can prepare a complete claimed Character Record'
);

select ok(has_function_privilege('authenticated', 'public.valid_derived_overrides(jsonb)', 'EXECUTE'), 'members can execute the override CHECK validator');
select ok(not has_function_privilege('anon', 'public.valid_derived_overrides(jsonb)', 'EXECUTE'), 'anonymous users cannot execute the validator');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.ability.wisdom', '0'::jsonb, 0)$$, array[true], 'Player saves a real zero override');
select results_eq($$select derived_overrides->'ability.wisdom' from public.character_slots where position=1$$, array['0'::jsonb], 'zero is persisted separately from Ability Score');
set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000002';
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.skill.perception', '-2'::jsonb, 0)$$, array[true], 'Dungeon Master independently saves a skill override');
select results_eq($$select derived_overrides, wisdom from public.character_slots where position=1$$, $$values ('{"ability.wisdom":0,"skill.perception":-2}'::jsonb,12)$$, 'independent overrides preserve each other and inputs');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.ability.wisdom', '4'::jsonb, 0)$$, array[false], 'stale same-override save is rejected');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.ability.wisdom', null, 1)$$, array[true], 'SQL null resets one override through the RPC');
select results_eq($$select derived_overrides from public.character_slots where position=1$$, array['{"skill.perception":-2}'::jsonb], 'reset removes only its own entry');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.skill.perception', 'null'::jsonb, 1)$$, array[true], 'JSON null also resets an override');
select results_eq($$select derived_overrides from public.character_slots where position=1$$, array['{}'::jsonb], 'no override remains after both resets');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'save.wisdom', '"expertise"'::jsonb, 0)$$, array[true], 'saving throws support the ticket expertise extension');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'skill.perception', '"expertise"'::jsonb, 0)$$, array[true], 'skills support expertise');
select results_eq($$select accepted from public.update_character_overview_field((select id from public.character_slots where position=1), 'spellcastingAbility', null, 0)$$, array[true], 'unset spellcasting Ability saves with SQL null');
select throws_ok($$select * from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.armorClass', '10'::jsonb, 0)$$, '23514', null, 'player-entered Armor Class cannot become an override');
select throws_ok($$select * from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.initiative', '1.5'::jsonb, 0)$$, '23514', null, 'fractional overrides are rejected');
select throws_ok($$select * from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.initiative', '"2"'::jsonb, 0)$$, '23514', null, 'numeric strings are rejected');
select throws_ok($$select * from public.update_character_overview_field((select id from public.character_slots where position=1), 'override.initiative', '1000'::jsonb, 0)$$, '23514', null, 'out of range overrides are rejected');
select throws_ok($$update public.character_slots set derived_overrides='{"initiative":null}'::jsonb where position=1$$, '23514', null, 'constraint rejects stored null overrides');
select throws_ok($$update public.character_slots set derived_overrides='{"unknown":0}'::jsonb where position=1$$, '23514', null, 'constraint rejects unknown override keys');
select throws_ok($$update public.character_slots set derived_overrides='[]'::jsonb where position=1$$, '23514', null, 'constraint rejects non-object overrides');
select throws_ok($$update public.character_slots set saving_throw_proficiencies=jsonb_set(saving_throw_proficiencies,'{wisdom}','null'::jsonb) where position=1$$, '23514', null, 'constraint rejects null proficiency');
select throws_ok($$select * from public.update_character_overview_field((select id from public.character_slots where position=1), 'save.wisdom', 'true'::jsonb, 1)$$, '23514', null, 'new saves require explicit proficiency states');
select throws_ok($$update public.character_slots set skill_proficiencies=jsonb_set(skill_proficiencies,'{perception}','null'::jsonb) where position=1$$, '23514', null, 'constraint rejects null skill proficiency');
select throws_ok($$update public.character_slots set skill_proficiencies=jsonb_set(skill_proficiencies,'{perception}','true'::jsonb) where position=1$$, '23514', null, 'constraint rejects boolean skill proficiency');
set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000003';
select results_eq($$select accepted from public.update_character_overview_field('00000000-0000-0000-0000-000000000001', 'override.initiative','10'::jsonb,0)$$, array[false], 'non-member cannot edit overrides through RPC');
select results_eq($$update public.character_slots set derived_overrides='{"initiative":10}'::jsonb returning id$$, array[]::uuid[], 'non-member cannot edit overrides directly');
set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000001';
select results_eq($$select derived_overrides from public.character_slots where position=1$$, array['{}'::jsonb], 'outsider attempts leave overrides unchanged');
set local role anon;
reset "request.jwt.claim.sub";
select throws_ok($$select * from public.update_character_overview_field('00000000-0000-0000-0000-000000000001','override.initiative','10'::jsonb,0)$$, '42501', null, 'anonymous users cannot call override RPC');
select * from finish();
rollback;
