begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

select has_column('public', 'character_slots', 'claimed_at', 'claim timestamp exists');
select has_column('public', 'character_slots', 'player_name', 'responsible player exists');
select has_column('public', 'character_slots', 'character_name', 'character name exists');
select has_column('public', 'character_slots', 'strength', 'Ability Scores exist');
select has_column('public', 'character_slots', 'version', 'claim updates are versioned');
select results_eq(
  $$select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_slots'$$,
  array[1::bigint],
  'Character Slot updates are published for realtime clients'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'players@drowned-compass.test',
    '',
    now(),
    '{}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'dm@drowned-compass.test',
    '',
    now(),
    '{}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'outsider-claim@drowned-compass.test',
    '',
    now(),
    '{}',
    '{}',
    now(),
    now()
  );

set local role authenticated;
set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$
    update public.character_slots
    set
      claimed_at = now(),
      claimed_by = '20000000-0000-4000-8000-000000000001',
      player_name = 'Mara',
      character_name = 'Neris Vale',
      primary_class = 'Rogue',
      subclass = 'Thief',
      species = 'Human',
      background = 'Sailor',
      level = 3,
      strength = 9,
      dexterity = 17,
      constitution = 13,
      intelligence = 14,
      wisdom = 12,
      charisma = 11,
      version = 1,
      updated_at = now()
    where position = 1 and claimed_at is null
    returning character_name
  $$,
  array['Neris Vale'],
  'Player can claim an unclaimed Character Slot with complete setup data'
);
select results_eq(
  $$select player_name from public.character_slots where position = 1$$,
  array['Mara'],
  'The claim identifies the responsible player'
);
select results_eq(
  $$select strength from public.character_slots where position = 1$$,
  array[9],
  'The claim stores all supplied Ability Scores'
);
select throws_ok(
  $$
    update public.character_slots
    set
      claimed_at = now(),
      claimed_by = '20000000-0000-4000-8000-000000000001',
      player_name = 'Incomplete',
      character_name = 'No Scores',
      primary_class = 'Fighter',
      subclass = 'Champion',
      species = 'Human',
      background = 'Guard',
      level = 1,
      version = 1
    where position = 2
  $$,
  '23514',
  null,
  'Database rejects an incomplete claim'
);
select throws_ok(
  $$
    update public.character_slots
    set
      claimed_at = now(),
      claimed_by = '20000000-0000-4000-8000-000000000001',
      player_name = 'Invalid',
      character_name = 'Impossible Score',
      primary_class = 'Wizard',
      subclass = 'Evoker',
      species = 'Elf',
      background = 'Sage',
      level = 2,
      strength = 31,
      dexterity = 10,
      constitution = 10,
      intelligence = 18,
      wisdom = 12,
      charisma = 8,
      version = 1
    where position = 2
  $$,
  '23514',
  null,
  'Database rejects an invalid Ability Score'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000002';

select results_eq(
  $$update public.character_slots set player_name = 'Mara Quinn', version = 2 where position = 1 returning player_name$$,
  array['Mara Quinn'],
  'Dungeon Master can edit a Player claim without owning it'
);
select results_eq(
  $$select character_name from public.character_slots where position = 1$$,
  array['Neris Vale'],
  'Dungeon Master can read the claimed identity'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000003';

select results_eq(
  $$select count(*) from public.character_slots where claimed_at is not null$$,
  array[0::bigint],
  'Non-member cannot read claimed identities'
);
select results_eq(
  $$update public.character_slots set player_name = 'Intruder' where position = 1 returning position$$,
  array[]::integer[],
  'Non-member cannot edit a claimed Character Slot'
);

set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';

select results_eq(
  $$select player_name from public.character_slots where position = 1$$,
  array['Mara Quinn'],
  'The authorized cross-member edit is persisted'
);
select results_eq(
  $$select count(*) from public.character_slots where claimed_at is null$$,
  array[5::bigint],
  'Claiming preserves exactly six pre-created Character Slots'
);

set local role anon;
reset "request.jwt.claim.sub";

select throws_ok(
  $$select player_name from public.character_slots where position = 1$$,
  '42501',
  null,
  'Unauthenticated visitor cannot read a claimed identity'
);
select throws_ok(
  $$update public.character_slots set player_name = 'Anonymous' where position = 1$$,
  '42501',
  null,
  'Unauthenticated visitor cannot edit a claimed identity'
);

select * from finish();
rollback;
