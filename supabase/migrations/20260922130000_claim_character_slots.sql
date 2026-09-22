alter table public.character_slots
  add column claimed_at timestamptz,
  add column claimed_by uuid references auth.users (id),
  add column player_name text,
  add column character_name text,
  add column primary_class text,
  add column subclass text,
  add column species text,
  add column background text,
  add column level integer,
  add column strength integer,
  add column dexterity integer,
  add column constitution integer,
  add column intelligence integer,
  add column wisdom integer,
  add column charisma integer,
  add column version bigint not null default 0;

alter table public.character_slots
  add constraint character_slots_level_range
    check (level is null or level between 1 and 20),
  add constraint character_slots_strength_range
    check (strength is null or strength between 1 and 30),
  add constraint character_slots_dexterity_range
    check (dexterity is null or dexterity between 1 and 30),
  add constraint character_slots_constitution_range
    check (constitution is null or constitution between 1 and 30),
  add constraint character_slots_intelligence_range
    check (intelligence is null or intelligence between 1 and 30),
  add constraint character_slots_wisdom_range
    check (wisdom is null or wisdom between 1 and 30),
  add constraint character_slots_charisma_range
    check (charisma is null or charisma between 1 and 30),
  add constraint character_slots_nonnegative_version
    check (version >= 0),
  add constraint character_slots_claim_is_complete
    check (
      (
        claimed_at is null
        and claimed_by is null
        and player_name is null
        and character_name is null
        and primary_class is null
        and subclass is null
        and species is null
        and background is null
        and level is null
        and strength is null
        and dexterity is null
        and constitution is null
        and intelligence is null
        and wisdom is null
        and charisma is null
      )
      or
      (
        claimed_at is not null
        and claimed_by is not null
        and coalesce(length(trim(player_name)), 0) > 0
        and coalesce(length(trim(character_name)), 0) > 0
        and coalesce(length(trim(primary_class)), 0) > 0
        and coalesce(length(trim(subclass)), 0) > 0
        and coalesce(length(trim(species)), 0) > 0
        and coalesce(length(trim(background)), 0) > 0
        and level is not null
        and strength is not null
        and dexterity is not null
        and constitution is not null
        and intelligence is not null
        and wisdom is not null
        and charisma is not null
      )
    );

alter table public.character_slots replica identity full;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'character_slots'
  ) then
    alter publication supabase_realtime add table public.character_slots;
  end if;
end;
$$;
