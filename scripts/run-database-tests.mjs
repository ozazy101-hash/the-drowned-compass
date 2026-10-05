import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Rehearse actual pending migrations inside rollback-only tests.
const rehearsals = [
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
const generated = [];
try {
  for (const [name, migrationFile, marker] of rehearsals) {
    const template = new URL(`../supabase/tests/fixtures/${name}_migration.sql.template`, import.meta.url);
    const migration = new URL(`../supabase/migrations/${migrationFile}`, import.meta.url);
    const output = new URL(`../supabase/tests/database/${name}_migration.generated.test.sql`, import.meta.url);
    let source = readFileSync(template, 'utf8').replace(`-- ${marker}`, () => readFileSync(migration, 'utf8'));
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
  const result = spawnSync('supabase', ['test', 'db', ...process.argv.slice(2)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const output of generated) rmSync(output, { force: true });
}
