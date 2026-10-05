-- Explicit projections prevent future columns or unknown nested keys from leaking.
create function public.party_backup_fields(value jsonb, allowed text[])
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb)
  from jsonb_each(coalesce(value,'{}'::jsonb)) e where e.key = any(allowed) and jsonb_typeof(e.value) in ('string','number','boolean','null');
$$;
revoke all on function public.party_backup_fields(jsonb,text[]) from public, anon, authenticated;

-- STABLE + one SELECT: membership, settings and every Character table use the
-- calling statement's MVCC snapshot. No browser-supplied role or cached Party.
create function public.export_party_data_snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare snapshot jsonb;
begin
  select jsonb_build_object('name', p.name, 'slots', coalesce((
    select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'character',case when s.claimed_at is null then null else jsonb_build_object(
      'playerName',s.player_name,'characterName',s.character_name,'primaryClass',s.primary_class,'subclass',s.subclass,'species',s.species,'background',s.background,'level',s.level,
      'abilityScores',jsonb_build_object('strength',s.strength,'dexterity',s.dexterity,'constitution',s.constitution,'intelligence',s.intelligence,'wisdom',s.wisdom,'charisma',s.charisma),
      'savingThrowProficiencies',public.party_backup_fields(s.saving_throw_proficiencies,array['strength','dexterity','constitution','intelligence','wisdom','charisma']),
      'skillProficiencies',public.party_backup_fields(s.skill_proficiencies,array['acrobatics','animalHandling','arcana','athletics','deception','history','insight','intimidation','investigation','medicine','nature','perception','performance','persuasion','religion','sleightOfHand','stealth','survival']),
      'armorClass',s.armor_class,'maxHitPoints',s.max_hit_points,'speed',s.speed,'spellcastingAbility',s.spellcasting_ability,
      'derivedOverrides',public.party_backup_fields(s.derived_overrides,array['ability.strength','ability.dexterity','ability.constitution','ability.intelligence','ability.wisdom','ability.charisma','save.strength','save.dexterity','save.constitution','save.intelligence','save.wisdom','save.charisma','skill.acrobatics','skill.animalHandling','skill.arcana','skill.athletics','skill.deception','skill.history','skill.insight','skill.intimidation','skill.investigation','skill.medicine','skill.nature','skill.perception','skill.performance','skill.persuasion','skill.religion','skill.sleightOfHand','skill.stealth','skill.survival','proficiencyBonus','passivePerception','initiative','spellAttack','spellSaveDC']),
      'fieldVersions',public.party_backup_fields(s.overview_field_versions,array['playerName','characterName','primaryClass','subclass','species','background','level','strength','dexterity','constitution','intelligence','wisdom','charisma','save.strength','save.dexterity','save.constitution','save.intelligence','save.wisdom','save.charisma','skill.acrobatics','skill.animalHandling','skill.arcana','skill.athletics','skill.deception','skill.history','skill.insight','skill.intimidation','skill.investigation','skill.medicine','skill.nature','skill.perception','skill.performance','skill.persuasion','skill.religion','skill.sleightOfHand','skill.stealth','skill.survival','armorClass','maxHitPoints','speed','spellcastingAbility','override.ability.strength','override.ability.dexterity','override.ability.constitution','override.ability.intelligence','override.ability.wisdom','override.ability.charisma','override.save.strength','override.save.dexterity','override.save.constitution','override.save.intelligence','override.save.wisdom','override.save.charisma','override.skill.acrobatics','override.skill.animalHandling','override.skill.arcana','override.skill.athletics','override.skill.deception','override.skill.history','override.skill.insight','override.skill.intimidation','override.skill.investigation','override.skill.medicine','override.skill.nature','override.skill.perception','override.skill.performance','override.skill.persuasion','override.skill.religion','override.skill.sleightOfHand','override.skill.stealth','override.skill.survival','override.proficiencyBonus','override.passivePerception','override.initiative','override.spellAttack','override.spellSaveDC']),
      'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.entry_id,'name',c.name,'level',c.level,'deleted',c.deleted,'version',c.version) order by c.entry_id collate "C") from public.character_classes c where c.slot_id=s.id),jsonb_build_array(jsonb_build_object('id','primary','name',s.primary_class,'level',s.level,'deleted',false,'version',1))),
      'survival',coalesce((select public.party_backup_fields(h.state,array['current','temporary','successes','failures','unconscious','inspiration','version']) || jsonb_build_object('undo',case when h.state->'undo' is null or h.state->'undo'='null'::jsonb then null else public.party_backup_fields(h.state->'undo',array['maximumVersion','label']) || jsonb_build_object('before',public.party_backup_fields(h.state->'undo'->'before',array['current','temporary'])) end) from public.character_survival h where h.slot_id=s.id),'{"current":null,"temporary":0,"successes":0,"failures":0,"unconscious":false,"inspiration":false,"version":0,"undo":null}'::jsonb),
      'limitedResources',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'current',r.current,'maximum',r.maximum,'recovery',r.recovery,'position',r.position,'important',r.important,'deleted',r.deleted,'version',r.version) order by r.id) from public.limited_resources r where r.slot_id=s.id),'[]'::jsonb),
      'conditions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'standard',c.standard,'label',c.label,'deleted',c.deleted,'version',c.version) order by c.id collate "C") from public.character_conditions c where c.slot_id=s.id),'[]'::jsonb),
      'magic',jsonb_build_object(
        'spells',coalesce((select jsonb_agg(public.party_backup_fields(m.state,array['catalogId','name','level','availability','source','notes','deleted']) || jsonb_build_object('id',m.id,'version',m.version) order by m.id collate "C") from public.character_magic m where m.slot_id=s.id and m.kind='spell'),'[]'::jsonb),
        'slots',coalesce((select jsonb_agg(public.party_backup_fields(m.state,array['level','maximum','remaining']) || jsonb_build_object('id',m.id,'version',m.version) order by (m.state->>'level')::integer) from public.character_magic m where m.slot_id=s.id and m.kind='slots'),'[]'::jsonb)),
      'inventory',coalesce((select jsonb_agg(jsonb_build_object('id',i.entry_id,'kind',i.kind,'title',i.title,'body',i.body,'rank',i.rank,'deleted',i.deleted,'version',i.version) order by i.entry_id collate "C") from public.character_inventory_entries i where i.slot_id=s.id),'[]'::jsonb),
      'textEntries',coalesce((select jsonb_agg(jsonb_build_object('id',t.entry_id,'kind',t.kind,'title',t.title,'body',t.body,'deleted',t.deleted,'version',t.version) order by t.entry_id collate "C") from public.character_text_entries t where t.slot_id=s.id),'[]'::jsonb),
      'combatEntries',jsonb_build_object(
        'entries',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'rank',e.rank,'version',e.version,'deleted',e.deleted,'details',public.party_backup_fields(e.details,array['kind','category','name','attackBonus','ability','range','damage','damageType','notes'])) order by e.id) from public.character_combat_entries e where e.slot_id=s.id),'[]'::jsonb),
        'primaryId',(select a.primary_id from public.character_primary_attacks a where a.slot_id=s.id),
        'featuredIds',coalesce((select to_jsonb(a.featured_ids) from public.character_primary_attacks a where a.slot_id=s.id),'[]'::jsonb),
        'primaryVersion',coalesce((select a.version from public.character_primary_attacks a where a.slot_id=s.id),0))
      ) end) order by s.position) from public.character_slots s where s.party_id=p.id),'[]'::jsonb))
  into snapshot from public.parties p
  where p.id='00000000-0000-4000-8000-000000000001'
    and exists(select 1 from public.party_members m where m.party_id=p.id and m.user_id=auth.uid() and m.role='dungeon-master');
  if snapshot is null then raise exception 'Dungeon Master access is required' using errcode='42501'; end if;
  return snapshot;
end;
$$;
revoke all on function public.export_party_data_snapshot() from public, anon, authenticated;
grant execute on function public.export_party_data_snapshot() to authenticated;
