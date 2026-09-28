import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Supabase mounts test SQL into the container, but not sibling migration files.
// Expand the actual pending migration into a rollback-only rehearsal at runtime.
const template = new URL('../supabase/tests/fixtures/derived_values_migration.sql.template', import.meta.url);
const migration = new URL('../supabase/migrations/20260928200000_calculate_and_override_derived_values.sql', import.meta.url);
const generated = new URL('../supabase/tests/database/derived_values_migration.generated.test.sql', import.meta.url);
writeFileSync(generated, readFileSync(template, 'utf8').replace(
  '-- __DERIVED_VALUES_MIGRATION__',
  () => readFileSync(migration, 'utf8'),
));
try {
  const result = spawnSync('supabase', ['test', 'db', ...process.argv.slice(2)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(generated, { force: true });
}
