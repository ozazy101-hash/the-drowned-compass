import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Rehearse actual pending migrations inside rollback-only tests.
const rehearsals = [
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
    writeFileSync(output, readFileSync(template, 'utf8').replace(`-- ${marker}`, () => readFileSync(migration, 'utf8')));
    generated.push(output);
  }
  const result = spawnSync('supabase', ['test', 'db', ...process.argv.slice(2)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const output of generated) rmSync(output, { force: true });
}
