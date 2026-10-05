-- Text trimming matches ECMAScript String.prototype.trim, including Unicode spaces and BOM.
-- Character-scoped spell associations and independently addressed slot levels.
create function public.valid_character_magic(record_kind text, record_id text, value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare catalog_id text;
begin
  if value is null or jsonb_typeof(value) <> 'object' then return false; end if;
  if record_kind = 'spell' then
    if (select array_agg(k order by k) from jsonb_object_keys(value) k) <> array['availability','catalogId','deleted','level','name','notes','source']
      or jsonb_typeof(value->'catalogId') not in ('null','string')
      or jsonb_typeof(value->'name') is distinct from 'string'
      or jsonb_typeof(value->'level') is distinct from 'number'
      or (value->>'level') !~ '^[0-9]$'
      or jsonb_typeof(value->'availability') is distinct from 'string'
      or value->>'availability' not in ('Known','Prepared','Always Prepared','Item granted','Feature granted')
      or jsonb_typeof(value->'source') is distinct from 'string' or length(value->>'source') > 240
      or value->>'source' <> btrim(value->>'source', E' \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff')
      or jsonb_typeof(value->'notes') is distinct from 'string' or length(value->>'notes') > 10000
      or jsonb_typeof(value->'deleted') is distinct from 'boolean' then return false; end if;
    if value->>'availability' in ('Item granted','Feature granted') and length(value->>'source') = 0 then return false; end if;
    catalog_id := value->>'catalogId';
    if catalog_id is not null then
      return catalog_id = record_id and value->>'name' = '' and value->>'level' = '0' and catalog_id in ('srd-5.2.1:acid-arrow','srd-5.2.1:acid-splash','srd-5.2.1:aid','srd-5.2.1:alarm','srd-5.2.1:alter-self','srd-5.2.1:animal-friendship','srd-5.2.1:animal-messenger','srd-5.2.1:animal-shapes','srd-5.2.1:animate-dead','srd-5.2.1:animate-objects','srd-5.2.1:antilife-shell','srd-5.2.1:antimagic-field','srd-5.2.1:antipathy-sympathy','srd-5.2.1:arcane-eye','srd-5.2.1:arcane-hand','srd-5.2.1:arcane-lock','srd-5.2.1:arcane-sword','srd-5.2.1:arcanist-s-magic-aura','srd-5.2.1:astral-projection','srd-5.2.1:augury','srd-5.2.1:aura-of-life','srd-5.2.1:awaken','srd-5.2.1:bane','srd-5.2.1:banishment','srd-5.2.1:barkskin','srd-5.2.1:beacon-of-hope','srd-5.2.1:befuddlement','srd-5.2.1:bestow-curse','srd-5.2.1:black-tentacles','srd-5.2.1:blade-barrier','srd-5.2.1:bless','srd-5.2.1:blight','srd-5.2.1:blindness-deafness','srd-5.2.1:blink','srd-5.2.1:blur','srd-5.2.1:burning-hands','srd-5.2.1:call-lightning','srd-5.2.1:calm-emotions','srd-5.2.1:chain-lightning','srd-5.2.1:charm-monster','srd-5.2.1:charm-person','srd-5.2.1:chill-touch','srd-5.2.1:chromatic-orb','srd-5.2.1:circle-of-death','srd-5.2.1:clairvoyance','srd-5.2.1:clone','srd-5.2.1:cloudkill','srd-5.2.1:color-spray','srd-5.2.1:command','srd-5.2.1:commune','srd-5.2.1:commune-with-nature','srd-5.2.1:comprehend-languages','srd-5.2.1:compulsion','srd-5.2.1:cone-of-cold','srd-5.2.1:confusion','srd-5.2.1:conjure-animals','srd-5.2.1:conjure-celestial','srd-5.2.1:conjure-elemental','srd-5.2.1:conjure-fey','srd-5.2.1:conjure-minor-elementals','srd-5.2.1:conjure-woodland-beings','srd-5.2.1:contact-other-plane','srd-5.2.1:contagion','srd-5.2.1:contingency','srd-5.2.1:continual-flame','srd-5.2.1:control-water','srd-5.2.1:control-weather','srd-5.2.1:counterspell','srd-5.2.1:create-food-and-water','srd-5.2.1:create-or-destroy-water','srd-5.2.1:create-undead','srd-5.2.1:creation','srd-5.2.1:cure-wounds','srd-5.2.1:dancing-lights','srd-5.2.1:darkness','srd-5.2.1:darkvision','srd-5.2.1:daylight','srd-5.2.1:death-ward','srd-5.2.1:delayed-blast-fireball','srd-5.2.1:demiplane','srd-5.2.1:detect-evil-and-good','srd-5.2.1:detect-magic','srd-5.2.1:detect-poison-and-disease','srd-5.2.1:detect-thoughts','srd-5.2.1:dimension-door','srd-5.2.1:disguise-self','srd-5.2.1:disintegrate','srd-5.2.1:dispel-evil-and-good','srd-5.2.1:dispel-magic','srd-5.2.1:dissonant-whispers','srd-5.2.1:divination','srd-5.2.1:divine-favor','srd-5.2.1:divine-smite','srd-5.2.1:divine-word','srd-5.2.1:dominate-beast','srd-5.2.1:dominate-monster','srd-5.2.1:dominate-person','srd-5.2.1:dragon-s-breath','srd-5.2.1:dream','srd-5.2.1:druidcraft','srd-5.2.1:earthquake','srd-5.2.1:eldritch-blast','srd-5.2.1:elementalism','srd-5.2.1:enhance-ability','srd-5.2.1:enlarge-reduce','srd-5.2.1:ensnaring-strike','srd-5.2.1:entangle','srd-5.2.1:enthrall','srd-5.2.1:etherealness','srd-5.2.1:expeditious-retreat','srd-5.2.1:eyebite','srd-5.2.1:fabricate','srd-5.2.1:faerie-fire','srd-5.2.1:faithful-hound','srd-5.2.1:false-life','srd-5.2.1:fear','srd-5.2.1:feather-fall','srd-5.2.1:find-familiar','srd-5.2.1:find-steed','srd-5.2.1:find-the-path','srd-5.2.1:find-traps','srd-5.2.1:finger-of-death','srd-5.2.1:fireball','srd-5.2.1:fire-bolt','srd-5.2.1:fire-shield','srd-5.2.1:fire-storm','srd-5.2.1:flame-blade','srd-5.2.1:flame-strike','srd-5.2.1:flaming-sphere','srd-5.2.1:flesh-to-stone','srd-5.2.1:floating-disk','srd-5.2.1:fly','srd-5.2.1:fog-cloud','srd-5.2.1:forbiddance','srd-5.2.1:forcecage','srd-5.2.1:foresight','srd-5.2.1:freedom-of-movement','srd-5.2.1:freezing-sphere','srd-5.2.1:gaseous-form','srd-5.2.1:gate','srd-5.2.1:geas','srd-5.2.1:gentle-repose','srd-5.2.1:giant-insect','srd-5.2.1:glibness','srd-5.2.1:globe-of-invulnerability','srd-5.2.1:glyph-of-warding','srd-5.2.1:goodberry','srd-5.2.1:grease','srd-5.2.1:greater-invisibility','srd-5.2.1:greater-restoration','srd-5.2.1:guardian-of-faith','srd-5.2.1:guards-and-wards','srd-5.2.1:guidance','srd-5.2.1:guiding-bolt','srd-5.2.1:gust-of-wind','srd-5.2.1:hallow','srd-5.2.1:hallucinatory-terrain','srd-5.2.1:harm','srd-5.2.1:haste','srd-5.2.1:heal','srd-5.2.1:healing-word','srd-5.2.1:heat-metal','srd-5.2.1:hellish-rebuke','srd-5.2.1:heroes-feast','srd-5.2.1:heroism','srd-5.2.1:hex','srd-5.2.1:hideous-laughter','srd-5.2.1:hold-monster','srd-5.2.1:hold-person','srd-5.2.1:holy-aura','srd-5.2.1:hunter-s-mark','srd-5.2.1:hypnotic-pattern','srd-5.2.1:ice-knife','srd-5.2.1:ice-storm','srd-5.2.1:identify','srd-5.2.1:illusory-script','srd-5.2.1:imprisonment','srd-5.2.1:incendiary-cloud','srd-5.2.1:inflict-wounds','srd-5.2.1:insect-plague','srd-5.2.1:instant-summons','srd-5.2.1:irresistible-dance','srd-5.2.1:invisibility','srd-5.2.1:jump','srd-5.2.1:knock','srd-5.2.1:legend-lore','srd-5.2.1:lesser-restoration','srd-5.2.1:levitate','srd-5.2.1:light','srd-5.2.1:lightning-bolt','srd-5.2.1:locate-animals-or-plants','srd-5.2.1:locate-creature','srd-5.2.1:locate-object','srd-5.2.1:longstrider','srd-5.2.1:mage-armor','srd-5.2.1:mage-hand','srd-5.2.1:magic-circle','srd-5.2.1:magic-jar','srd-5.2.1:magic-missile','srd-5.2.1:magic-mouth','srd-5.2.1:magic-weapon','srd-5.2.1:magnificent-mansion','srd-5.2.1:major-image','srd-5.2.1:mass-cure-wounds','srd-5.2.1:mass-heal','srd-5.2.1:mass-healing-word','srd-5.2.1:mass-suggestion','srd-5.2.1:maze','srd-5.2.1:meld-into-stone','srd-5.2.1:mending','srd-5.2.1:message','srd-5.2.1:meteor-swarm','srd-5.2.1:mind-blank','srd-5.2.1:mind-spike','srd-5.2.1:minor-illusion','srd-5.2.1:mirage-arcane','srd-5.2.1:mirror-image','srd-5.2.1:mislead','srd-5.2.1:misty-step','srd-5.2.1:modify-memory','srd-5.2.1:moonbeam','srd-5.2.1:move-earth','srd-5.2.1:nondetection','srd-5.2.1:passwall','srd-5.2.1:pass-without-trace','srd-5.2.1:phantasmal-force','srd-5.2.1:phantasmal-killer','srd-5.2.1:phantom-steed','srd-5.2.1:planar-ally','srd-5.2.1:planar-binding','srd-5.2.1:plane-shift','srd-5.2.1:plant-growth','srd-5.2.1:poison-spray','srd-5.2.1:polymorph','srd-5.2.1:power-word-heal','srd-5.2.1:power-word-kill','srd-5.2.1:power-word-stun','srd-5.2.1:prayer-of-healing','srd-5.2.1:prestidigitation','srd-5.2.1:prismatic-spray','srd-5.2.1:prismatic-wall','srd-5.2.1:private-sanctum','srd-5.2.1:produce-flame','srd-5.2.1:programmed-illusion','srd-5.2.1:project-image','srd-5.2.1:protection-from-energy','srd-5.2.1:protection-from-evil-and-good','srd-5.2.1:protection-from-poison','srd-5.2.1:purify-food-and-drink','srd-5.2.1:raise-dead','srd-5.2.1:ray-of-enfeeblement','srd-5.2.1:ray-of-frost','srd-5.2.1:regenerate','srd-5.2.1:ray-of-sickness','srd-5.2.1:reincarnate','srd-5.2.1:remove-curse','srd-5.2.1:resilient-sphere','srd-5.2.1:resistance','srd-5.2.1:resurrection','srd-5.2.1:reverse-gravity','srd-5.2.1:revivify','srd-5.2.1:rope-trick','srd-5.2.1:sacred-flame','srd-5.2.1:sanctuary','srd-5.2.1:scorching-ray','srd-5.2.1:scrying','srd-5.2.1:searing-smite','srd-5.2.1:secret-chest','srd-5.2.1:see-invisibility','srd-5.2.1:seeming','srd-5.2.1:sending','srd-5.2.1:sequester','srd-5.2.1:shapechange','srd-5.2.1:shatter','srd-5.2.1:shield','srd-5.2.1:shield-of-faith','srd-5.2.1:shillelagh','srd-5.2.1:shining-smite','srd-5.2.1:shocking-grasp','srd-5.2.1:silence','srd-5.2.1:silent-image','srd-5.2.1:simulacrum','srd-5.2.1:sleep','srd-5.2.1:sleet-storm','srd-5.2.1:slow','srd-5.2.1:sorcerous-burst','srd-5.2.1:spare-the-dying','srd-5.2.1:speak-with-animals','srd-5.2.1:speak-with-dead','srd-5.2.1:speak-with-plants','srd-5.2.1:spider-climb','srd-5.2.1:spike-growth','srd-5.2.1:spirit-guardians','srd-5.2.1:spiritual-weapon','srd-5.2.1:starry-wisp','srd-5.2.1:stinking-cloud','srd-5.2.1:stone-shape','srd-5.2.1:stoneskin','srd-5.2.1:storm-of-vengeance','srd-5.2.1:suggestion','srd-5.2.1:summon-dragon','srd-5.2.1:sunbeam','srd-5.2.1:sunburst','srd-5.2.1:symbol','srd-5.2.1:telekinesis','srd-5.2.1:telepathic-bond','srd-5.2.1:teleport','srd-5.2.1:teleportation-circle','srd-5.2.1:thaumaturgy','srd-5.2.1:thunderwave','srd-5.2.1:time-stop','srd-5.2.1:tiny-hut','srd-5.2.1:tongues','srd-5.2.1:transport-via-plants','srd-5.2.1:tree-stride','srd-5.2.1:true-polymorph','srd-5.2.1:true-resurrection','srd-5.2.1:true-seeing','srd-5.2.1:true-strike','srd-5.2.1:tsunami','srd-5.2.1:unseen-servant','srd-5.2.1:vampiric-touch','srd-5.2.1:vicious-mockery','srd-5.2.1:vitriolic-sphere','srd-5.2.1:wall-of-fire','srd-5.2.1:wall-of-force','srd-5.2.1:wall-of-ice','srd-5.2.1:wall-of-stone','srd-5.2.1:wall-of-thorns','srd-5.2.1:warding-bond','srd-5.2.1:water-breathing','srd-5.2.1:water-walk','srd-5.2.1:web','srd-5.2.1:weird','srd-5.2.1:wind-walk','srd-5.2.1:wind-wall','srd-5.2.1:wish','srd-5.2.1:word-of-recall','srd-5.2.1:zone-of-truth');
    end if;
    return record_id ~ '^custom\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and length(value->>'name') between 1 and 120 and value->>'name' = btrim(value->>'name', E' \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff');
  elsif record_kind = 'slots' then
    return (select array_agg(k order by k) from jsonb_object_keys(value) k) = array['level','maximum','remaining']
      and jsonb_typeof(value->'level') = 'number' and (value->>'level') ~ '^[1-9]$'
      and record_id = 'slots.' || (value->>'level')
      and jsonb_typeof(value->'maximum') = 'number' and (value->>'maximum') ~ '^[0-9]{1,2}$'
      and jsonb_typeof(value->'remaining') = 'number' and (value->>'remaining') ~ '^[0-9]{1,2}$'
      and (value->>'remaining')::numeric <= (value->>'maximum')::numeric;
  end if;
  return false;
end;
$$;
create table public.character_magic (
  slot_id uuid not null references public.character_slots(id) on delete cascade,
  id text not null,
  kind text not null,
  state jsonb not null,
  version bigint not null check (version between 1 and 9007199254740991),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (slot_id, id),
  check (public.valid_character_magic(kind,id,state) is true)
);
alter table public.character_magic enable row level security;
revoke all on public.character_magic from public, anon, authenticated;
grant select on public.character_magic to authenticated;
create policy "Members read Character Magic" on public.character_magic for select to authenticated
using (exists(select 1 from public.character_slots s where s.id = slot_id and public.is_party_member(s.party_id)));

create function public.update_character_magic(target_slot_id uuid, command jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  prior public.character_magic%rowtype;
  expected bigint;
  record_id text;
  record_kind text;
  next_state jsonb;
  remaining integer;
  maximum integer;
begin
  perform 1 from public.character_slots where id = target_slot_id and claimed_at is not null and public.is_party_member(party_id) for update;
  if not found then return false; end if;
  if command is null or jsonb_typeof(command) <> 'object'
    or jsonb_typeof(command->'expectedVersion') is distinct from 'number'
    or (command->>'expectedVersion') !~ '^[0-9]+$'
    or (command->>'expectedVersion')::numeric >= 9007199254740991
    or jsonb_typeof(command->'kind') is distinct from 'string' then
    raise exception 'Invalid Magic command' using errcode = '23514';
  end if;
  expected := (command->>'expectedVersion')::bigint;
  record_kind := command->>'kind';
  if record_kind = 'spell' then
    if jsonb_typeof(command->'spell') is distinct from 'object' or jsonb_typeof(command->'spell'->'id') is distinct from 'string' then raise exception 'Invalid spell' using errcode = '23514'; end if;
    if jsonb_typeof(command->'spell'->'name') is distinct from 'string' or jsonb_typeof(command->'spell'->'source') is distinct from 'string' then raise exception 'Invalid spell text' using errcode = '23514'; end if;
    record_id := command->'spell'->>'id';
    next_state := (command->'spell') - 'id';
    next_state := jsonb_set(jsonb_set(next_state,'{name}',to_jsonb(btrim(next_state->>'name', E' \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'))),'{source}',to_jsonb(btrim(next_state->>'source', E' \t\n\r\f\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff')));
    if public.valid_character_magic(record_kind,record_id,next_state) is distinct from true or length(command->'spell'->>'name') > 120 or length(command->'spell'->>'source') > 240 then raise exception 'Invalid Character Spell' using errcode = '23514'; end if;
  elsif record_kind = 'slots' then
    if jsonb_typeof(command->'level') is distinct from 'number' or (command->>'level') !~ '^[1-9]$' or command->>'action' not in ('configure','spend','restore') or not (command ? 'action') then raise exception 'Invalid slot command' using errcode = '23514'; end if;
    record_id := 'slots.' || (command->>'level');
    if command->>'action' = 'configure' then
      next_state := jsonb_build_object('level',command->'level','maximum',command->'maximum','remaining',command->'remaining');
      if public.valid_character_magic(record_kind,record_id,next_state) is distinct from true then raise exception 'Invalid spell slot bounds' using errcode = '23514'; end if;
    end if;
  else raise exception 'Invalid Magic kind' using errcode = '23514'; end if;
  select * into prior from public.character_magic where slot_id=target_slot_id and id=record_id;
  if coalesce(prior.version,0) <> expected then return false; end if;
  if record_kind = 'spell' then
    if prior.id is not null and prior.state->'catalogId' is distinct from next_state->'catalogId' then raise exception 'Spell identity cannot change' using errcode = '23514'; end if;
    if prior.id is null and (next_state->>'deleted')::boolean then return false; end if;
  else
    if command->>'action' = 'configure' then
      next_state := jsonb_build_object('level',command->'level','maximum',command->'maximum','remaining',command->'remaining');
    else
      maximum := coalesce((prior.state->>'maximum')::integer,0);
      remaining := coalesce((prior.state->>'remaining')::integer,0) + case when command->>'action' = 'spend' then -1 else 1 end;
      next_state := jsonb_build_object('level',command->'level','maximum',maximum,'remaining',remaining);
    end if;
    if public.valid_character_magic(record_kind,record_id,next_state) is distinct from true then raise exception 'Invalid spell slot bounds' using errcode = '23514'; end if;
  end if;
  insert into public.character_magic(slot_id,id,kind,state,version,updated_by)
    values(target_slot_id,record_id,record_kind,next_state,expected+1,auth.uid())
    on conflict(slot_id,id) do update set state=excluded.state,version=excluded.version,updated_at=now(),updated_by=excluded.updated_by;
  return true;
end;
$$;
revoke all on function public.valid_character_magic(text,text,jsonb) from public, anon, authenticated;
revoke all on function public.update_character_magic(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.update_character_magic(uuid,jsonb) to authenticated;
alter publication supabase_realtime add table public.character_magic;
