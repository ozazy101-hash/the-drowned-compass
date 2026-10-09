import {localSettings,snapshot,acquireVerificationLock} from './local-verification.mjs';
import {historicalCharacterState} from './database-rehearsal-state.mjs';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Rehearse actual pending migrations inside rollback-only tests.
const rehearsals = [
  ['map_reveal', '20261009120000_manual_map_reveal_masks.sql', '__MAP_REVEAL_MIGRATION__'],
  ['map_privacy', '20261009110000_dm_private_grid_maps.sql', '__MAP_PRIVACY_MIGRATION__'],
  ['map_artwork', '20261009100000_private_map_artwork_versions.sql', '__MAP_ARTWORK_MIGRATION__'],
  ['map_stages', '20261007130000_prepared_map_stages.sql', '__MAP_STAGES_MIGRATION__'],
  ['grid_maps', '20261007120000_saved_grid_maps.sql', '__GRID_MAPS_MIGRATION__'],
  ['handout_lifecycle', '20261007110000_handout_lifecycle.sql', '__HANDOUT_LIFECYCLE_MIGRATION__'],
  ['backup', '20261006220000_download_party_data_backup.sql', '__BACKUP_MIGRATION__'],
  ['rests', '20261006210000_preview_and_resolve_rests.sql', '__RESTS_MIGRATION__'],
  ['character_magic', '20261005200000_manage_character_magic.sql', '__MAGIC_MIGRATION__'],
  ['featured_attacks', '20261005180000_feature_multiple_attacks.sql', '__FEATURED_ATTACKS_MIGRATION__'],
  ['survival', '20261003100700_track_hit_points_and_survival.sql', '__SURVIVAL_MIGRATION__'],
  ['character_classes', '20261003140000_support_multiclass_characters.sql', '__CHARACTER_CLASSES_MIGRATION__'],
  ['inventory', '20261003150000_record_inventory.sql', '__INVENTORY_MIGRATION__'],
  ['conditions', '20261003180000_track_character_conditions.sql', '__CONDITIONS_MIGRATION__'],
  ['derived_values', '20260928200000_calculate_and_override_derived_values.sql', '__DERIVED_VALUES_MIGRATION__'],
  ['combat_entries', '20260928220900_manage_attacks_and_actions.sql', '__COMBAT_ENTRIES_MIGRATION__'],
  ['limited_resources', '20260928221000_track_limited_resources.sql', '__LIMITED_RESOURCES_MIGRATION__'],
  ['features_story', '20260928221600_record_features_and_story.sql', '__FEATURES_STORY_MIGRATION__'],
];
const selected=process.argv.slice(2);
if(selected.some(path=>!/^supabase\/tests\/database\/[a-zA-Z0-9_.-]+\.test\.sql$/.test(path)))throw new Error('Only repository SQL test paths are allowed; remote database options are forbidden');
localSettings();
const release=acquireVerificationLock();
const baseline=snapshot();
const generated = [];
try {
  for (const [name, migrationFile, marker] of rehearsals) {
    const template = new URL(`../supabase/tests/fixtures/${name}_migration.sql.template`, import.meta.url);
    const migration = new URL(`../supabase/migrations/${migrationFile}`, import.meta.url);
    const output = new URL(`../supabase/tests/database/${name}_migration.generated.test.sql`, import.meta.url);
    const fixture=readFileSync(template,'utf8');
    if(!/^([\s]|--[^\n]*\n)*begin;/i.test(fixture)||!/\brollback;\s*$/i.test(fixture))throw new Error('Fixture must start BEGIN and end ROLLBACK: '+name);
    let source = fixture.replace('begin;', () => 'begin;'+(name==='map_reveal'?'':historicalCharacterState(name))).replace(`-- ${marker}`, () => readFileSync(migration, 'utf8'));
    if (name === 'map_privacy') source = source.replace('-- __LEGACY_MAP_COMMAND__', () => readFileSync(new URL('../supabase/migrations/20261007130000_prepared_map_stages.sql', import.meta.url), 'utf8').replace('create function public.change_party_grid_map', 'create or replace function public.change_party_grid_map'));
    if (name === 'handout_lifecycle') source = source.replace('-- __PRIVATE_HANDOUTS_MIGRATION__', () => readFileSync(new URL('../supabase/migrations/20261007100000_private_handouts.sql', import.meta.url), 'utf8'));
    if (name === 'backup') {
      for (const [marker, file] of [['COMBAT_ENTRIES', '20260928220900_manage_attacks_and_actions.sql'], ['LIMITED_RESOURCES', '20260928221000_track_limited_resources.sql'], ['FEATURES_STORY', '20260928221600_record_features_and_story.sql'], ['SURVIVAL', '20261003100700_track_hit_points_and_survival.sql'], ['CHARACTER_CLASSES', '20261003140000_support_multiclass_characters.sql'], ['INVENTORY', '20261003150000_record_inventory.sql'], ['CONDITIONS', '20261003180000_track_character_conditions.sql'], ['FEATURED_ATTACKS', '20261005180000_feature_multiple_attacks.sql'], ['HEALTH', '20261005190000_simplify_health_controls.sql'], ['MAGIC', '20261005200000_manage_character_magic.sql'], ['RESTS', '20261006210000_preview_and_resolve_rests.sql']]) source = source.replace(`-- __${marker}_MIGRATION__`, () => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    if (name === 'rests') {
      for (const [marker, file] of [['__SURVIVAL_MIGRATION__', '20261003100700_track_hit_points_and_survival.sql'], ['__LIMITED_RESOURCES_MIGRATION__', '20260928221000_track_limited_resources.sql'], ['__MAGIC_MIGRATION__', '20261005200000_manage_character_magic.sql']]) source = source.replace(`-- ${marker}`, () => readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    }
    if (name === 'featured_attacks') source = source.replace('-- __COMBAT_ENTRIES_MIGRATION__', () => readFileSync(new URL('../supabase/migrations/20260928220900_manage_attacks_and_actions.sql', import.meta.url), 'utf8'));
    source = source.replace('-- __HEALTH_MIGRATION__', () => readFileSync(new URL('../supabase/migrations/20261005190000_simplify_health_controls.sql', import.meta.url), 'utf8'));
    writeFileSync(output, source);
    generated.push(output);
  }
  const result = spawnSync('supabase', ['test', 'db', ...selected], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const output of generated) rmSync(output, { force: true });
  const after=snapshot();
  if(JSON.stringify(after)!==JSON.stringify(baseline))throw new Error('Rollback SQL changed schema/data baseline');
  console.log('Rollback exact schema/data baseline restored: '+JSON.stringify(after));
  release();
}
