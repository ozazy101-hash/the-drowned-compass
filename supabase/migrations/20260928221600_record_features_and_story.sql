-- Each player-authored Feature or Story field is independently versioned.
-- Deletions are tombstones so delayed snapshots cannot resurrect removed Features.
create table public.character_text_entries (
  slot_id uuid not null references public.character_slots(id) on delete cascade,
  entry_id text not null,
  kind text not null check (kind in ('class','species','background','feat','appearance','personality','backstory','allies','notes')),
  title text not null check (length(title) <= 160),
  body text not null check (length(body) <= 20000),
  deleted boolean not null default false,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (slot_id, entry_id),
  constraint character_text_identity_valid check (
    (kind in ('class','species','background','feat') and entry_id ~ '^feature\.[0-9a-f-]{36}$' and length(trim(title)) > 0)
    or (kind in ('appearance','personality','backstory','allies','notes') and entry_id = 'story.' || kind and title = '' and not deleted)
  )
);
alter table public.character_text_entries enable row level security;
revoke all on public.character_text_entries from public, anon, authenticated;
grant select on public.character_text_entries to authenticated;
create policy "Members can read Features and Story"
on public.character_text_entries for select to authenticated
using (exists (select 1 from public.character_slots s where s.id = slot_id and public.is_party_member(s.party_id)));

-- RPC-only writes prevent clients from bypassing conditional versions or changing identity.
create function public.save_character_text_entry(
  target_slot_id uuid, target_entry_id text, target_kind text,
  next_title text, next_body text, next_deleted boolean, expected_version bigint
)
returns table (accepted boolean, current_version bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_slot public.character_slots%rowtype;
  current_entry public.character_text_entries%rowtype;
  prior_version bigint;
begin
  -- Lock an existing slot to serialize first inserts as well as subsequent writes.
  select * into target_slot from public.character_slots
  where id = target_slot_id and claimed_at is not null
    and public.is_party_member(party_id)
  for update;
  if not found then return query select false, 0::bigint; return; end if;

  select * into current_entry from public.character_text_entries
  where slot_id = target_slot_id and entry_id = target_entry_id;
  prior_version := coalesce(current_entry.version, 0);
  if expected_version is null or expected_version < 0 then
    raise exception 'Invalid record version' using errcode = '23514';
  end if;
  if prior_version <> expected_version then
    return query select false, prior_version; return;
  end if;
  if current_entry.kind is not null and current_entry.kind <> target_kind then
    raise exception 'A record kind cannot change' using errcode = '23514';
  end if;

  insert into public.character_text_entries(slot_id, entry_id, kind, title, body, deleted, version, updated_by)
  values (target_slot_id, target_entry_id, target_kind, next_title, next_body, next_deleted, prior_version + 1, auth.uid())
  on conflict (slot_id, entry_id) do update set
    title = excluded.title, body = excluded.body, deleted = excluded.deleted,
    version = excluded.version, updated_at = now(), updated_by = excluded.updated_by;
  return query select true, prior_version + 1;
end;
$$;
revoke all on function public.save_character_text_entry(uuid,text,text,text,text,boolean,bigint) from public, anon, authenticated;
grant execute on function public.save_character_text_entry(uuid,text,text,text,text,boolean,bigint) to authenticated;
alter publication supabase_realtime add table public.character_text_entries;
