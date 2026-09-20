begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_table('public', 'parties', 'parties table exists');
select has_table('public', 'party_members', 'party_members table exists');
select has_table('public', 'character_slots', 'character_slots table exists');

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
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'rls-player@example.test',
    '',
    now(),
    '{}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rls-dm@example.test',
    '',
    now(),
    '{}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'rls-outsider@example.test',
    '',
    now(),
    '{}',
    '{}',
    now(),
    now()
  );

insert into public.party_members (party_id, user_id, role)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'player'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'dungeon-master'
  );

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';

select results_eq(
  'select count(*) from public.parties',
  array[1::bigint],
  'Player can read the Party'
);
select results_eq(
  'select count(*) from public.character_slots',
  array[6::bigint],
  'Player can read all six Character Slots'
);
select lives_ok(
  $$update public.character_slots set updated_at = now() where position = 1$$,
  'Player can update a Character Slot'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';

select lives_ok(
  $$update public.parties set updated_at = now()$$,
  'Dungeon Master can update the Party'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000003';

select results_eq(
  'select count(*) from public.parties',
  array[0::bigint],
  'Non-member cannot read the Party'
);
select results_eq(
  $$update public.character_slots set updated_at = now() returning position$$,
  array[]::integer[],
  'Non-member cannot update Character Slots'
);

set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000001';

select throws_ok(
  $$insert into public.character_slots (party_id, position) values ('00000000-0000-4000-8000-000000000001', 7)$$,
  '42501',
  null,
  'Browser member cannot create a Character Slot'
);
select throws_ok(
  $$delete from public.character_slots where position = 1$$,
  '42501',
  null,
  'Browser member cannot delete a Character Slot'
);

set local role anon;
reset "request.jwt.claim.sub";

select throws_ok(
  'select count(*) from public.parties',
  '42501',
  null,
  'Unauthenticated visitor cannot read the Party'
);
select throws_ok(
  'select count(*) from public.character_slots',
  '42501',
  null,
  'Unauthenticated visitor cannot read Character Slots'
);

select * from finish();
rollback;
