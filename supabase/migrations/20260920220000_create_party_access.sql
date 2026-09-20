create table public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.party_members (
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('player', 'dungeon-master')),
  created_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table public.character_slots (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  position integer not null check (position between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (party_id, position)
);

alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.character_slots enable row level security;

revoke all on public.parties from anon, authenticated;
revoke all on public.party_members from anon, authenticated;
revoke all on public.character_slots from anon, authenticated;

grant select, update on public.parties to authenticated;
grant select on public.party_members to authenticated;
grant select, update on public.character_slots to authenticated;

create function public.is_party_member(target_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.party_members
    where party_id = target_party_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_party_member(uuid) from public;
grant execute on function public.is_party_member(uuid) to authenticated;

create policy "Members can read their Party"
on public.parties
for select
to authenticated
using ((select public.is_party_member(id)));

create policy "Members can update their Party"
on public.parties
for update
to authenticated
using ((select public.is_party_member(id)))
with check ((select public.is_party_member(id)));

create policy "Members can read their own membership"
on public.party_members
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read Character Slots"
on public.character_slots
for select
to authenticated
using ((select public.is_party_member(party_id)));

create policy "Members can update Character Slots"
on public.character_slots
for update
to authenticated
using ((select public.is_party_member(party_id)))
with check ((select public.is_party_member(party_id)));

insert into public.parties (id, name)
values ('00000000-0000-4000-8000-000000000001', 'The Drowned Compass');

insert into public.character_slots (party_id, position)
select
  '00000000-0000-4000-8000-000000000001',
  slot_position
from generate_series(1, 6) as slot_position;

insert into public.party_members (party_id, user_id, role)
select
  '00000000-0000-4000-8000-000000000001',
  id,
  case
    when lower(email) = 'dm@drowned-compass.test' then 'dungeon-master'
    else 'player'
  end
from auth.users
where lower(email) in (
  'players@drowned-compass.test',
  'dm@drowned-compass.test'
)
on conflict (party_id, user_id) do update set role = excluded.role;
