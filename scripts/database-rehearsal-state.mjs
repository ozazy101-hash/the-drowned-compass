import {readFileSync} from 'node:fs';
// Historical migration fixtures require historical input, not an applied target.
// This explicit manifest runs ONLY inside each existing BEGIN/ROLLBACK fixture.
// Forward migrations and assertions remain unchanged. No persistent downgrade.
const tables=['character_rest_receipts','character_magic','character_conditions','character_inventory_entries','character_classes','character_survival','character_text_entries','limited_resources','character_primary_attacks','character_combat_entries'];
const functions=['update_character_overview_field_before_classes','resolve_character_rest','valid_character_magic','update_character_magic','update_character_condition','save_inventory_entry','initialize_character_class','guard_character_class_projection','edit_character_class','update_character_survival','save_character_text_entry','write_limited_resource','valid_combat_entry_details','update_character_combat_entry','party_backup_fields','export_party_data_snapshot'];
export function historicalCharacterState(name){
 if(['grid_maps','map_stages','handout_lifecycle'].includes(name))return '';
 if(!['backup','rests','character_magic','featured_attacks','survival','character_classes','inventory','conditions','derived_values','combat_entries','limited_resources','features_story'].includes(name))throw new Error('Unknown historical fixture '+name);
 const derived=readFileSync(new URL('../supabase/migrations/20260928200000_calculate_and_override_derived_values.sql',import.meta.url),'utf8');
 const marker='create or replace function public.update_character_overview_field(';
 if(!derived.includes(marker))throw new Error('Missing authoritative overview function marker');
 const overview=derived.slice(derived.indexOf(marker));
 return `\n-- Rollback-only explicit historical fixture preparation.\nlock table public.character_slots in access exclusive mode;\ndrop trigger if exists initialize_character_class on public.character_slots;\ndrop trigger if exists guard_character_class_projection on public.character_slots;\ndrop table if exists ${tables.map(t=>'public.'+t).join(',')} cascade;\ndo $fixture$ declare f record; begin for f in select oid::regprocedure as identity from pg_proc where pronamespace='public'::regnamespace and proname in (${functions.map(f=>"'"+f+"'").join(',')}) loop execute 'drop function '||f.identity||' cascade'; end loop; end $fixture$;\n${overview}\n`;
}
