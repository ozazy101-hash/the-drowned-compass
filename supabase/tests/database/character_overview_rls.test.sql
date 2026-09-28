begin;

create extension if not exists pgtap with schema extensions;

select plan(34);

select ok(has_function_privilege('authenticated', 'public.valid_saving_throw_proficiencies(jsonb)', 'EXECUTE'),
  'authenticated writes can execute saving throw validation');
select ok(has_function_privilege('authenticated', 'public.valid_skill_proficiencies(jsonb)', 'EXECUTE'),
  'authenticated writes can execute skill validation');
select ok(has_function_privilege('authenticated', 'public.valid_overview_field_versions(jsonb)', 'EXECUTE'),
  'authenticated writes can execute per-field version validation');
select ok(not has_function_privilege('anon', 'public.valid_saving_throw_proficiencies(jsonb)', 'EXECUTE'),
  'anonymous users are not granted saving throw validation');
select ok(not has_function_privilege('anon', 'public.valid_skill_proficiencies(jsonb)', 'EXECUTE'),
  'anonymous users are not granted skill validation');
select ok(not has_function_privilege('anon', 'public.valid_overview_field_versions(jsonb)', 'EXECUTE'),
  'anonymous users are not granted per-field version validation');

select has_column('public', 'character_slots', 'saving_throw_proficiencies', 'saving throw proficiency data exists');
select has_column('public', 'character_slots', 'skill_proficiencies', 'skill proficiency data exists');
select has_column('public', 'character_slots', 'armor_class', 'Armor Class exists');
select has_column('public', 'character_slots', 'max_hit_points', 'maximum Hit Points exist');
select has_column('public', 'character_slots', 'speed', 'speed exists');
select has_column('public', 'character_slots', 'spellcasting_ability', 'spellcasting Ability exists');
select has_column('public', 'character_slots', 'overview_field_versions', 'per-field versions exist');
select has_column('public', 'character_slots', 'updated_by', 'overview update actor metadata exists');
select has_function(
  'public',
  'update_character_overview_field',
  array['uuid', 'text', 'jsonb', 'bigint'],
  'narrow conditional overview update function exists'
);
select results_eq(
  $$select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_slots'$$,
  array[1::bigint],
  'Character Overview updates remain published for realtime clients'
);

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

select results_eq(
  $$select accepted, current_version from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'characterName', to_jsonb('Neris Stormwake'::text), 0
  )$$,
  $$values (true, 1::bigint)$$,
  'Player can conditionally save one identity field'
);
select results_eq(
  $$select character_name from public.character_slots where position = 1$$,
  array['Neris Stormwake'],
  'identity field save is persisted'
);

set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000002';
select results_eq(
  $$select accepted from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'armorClass', to_jsonb(16), 0
  )$$,
  array[true],
  'Dungeon Master can edit a Player Character Record without owning its claim'
);

set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000001';
select results_eq(
  $$select accepted from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'strength', to_jsonb(10), 0
  )$$,
  array[true],
  'a different field retains its independent expected version'
);
select results_eq(
  $$select armor_class, strength from public.character_slots where position = 1$$,
  $$values (16, 10)$$,
  'different-field edits are both preserved'
);

select results_eq(
  $$select accepted, current_version from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'strength', to_jsonb(8), 0
  )$$,
  $$values (false, 1::bigint)$$,
  'a stale same-field write is rejected with the current version'
);
select results_eq(
  $$select strength from public.character_slots where position = 1$$,
  array[10],
  'a rejected stale write does not replace the accepted value'
);
select results_eq(
  $$select accepted, current_version from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'strength', to_jsonb(8), 1
  )$$,
  $$values (true, 2::bigint)$$,
  'the same-field edit can safely retry against the current version'
);
select results_eq(
  $$select strength from public.character_slots where position = 1$$,
  array[8],
  'the latest accepted same-field value wins'
);

select results_eq(
  $$select accepted from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'save.wisdom', '"proficient"'::jsonb, 0
  )$$,
  array[true],
  'saving throw proficiency saves independently'
);
select results_eq(
  $$select accepted from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'skill.perception', to_jsonb('expertise'::text), 0
  )$$,
  array[true],
  'skill proficiency saves independently'
);
select results_eq(
  $$select saving_throw_proficiencies->>'wisdom', skill_proficiencies->>'perception'
    from public.character_slots where position = 1$$,
  $$values ('proficient', 'expertise')$$,
  'proficiency changes are persisted without replacing one another'
);

select throws_ok(
  $$select * from public.update_character_overview_field(
    (select id from public.character_slots where position = 1),
    'skill.perception', to_jsonb('mastery'::text), 1
  )$$,
  '23514',
  null,
  'database function rejects an invalid proficiency value'
);
select throws_ok(
  $$update public.character_slots set skill_proficiencies = '{}'::jsonb where position = 1$$,
  '23514',
  null,
  'database constraint rejects incomplete skill proficiency data'
);

set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000003';
select results_eq(
  $$select accepted, current_version from public.update_character_overview_field(
    '00000000-0000-0000-0000-000000000001', 'armorClass', to_jsonb(99), 0
  )$$,
  $$values (false, 0::bigint)$$,
  'a non-member cannot reach a Character Record through the update function'
);

set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000001';
select results_eq(
  $$select armor_class from public.character_slots where position = 1$$,
  array[16],
  'the outsider attempt leaves accepted Party data unchanged'
);

set local role anon;
reset "request.jwt.claim.sub";
select throws_ok(
  $$select * from public.update_character_overview_field(
    '00000000-0000-0000-0000-000000000001', 'armorClass', to_jsonb(99), 0
  )$$,
  '42501',
  null,
  'an unauthenticated visitor cannot call the update function'
);

select * from finish();
rollback;
