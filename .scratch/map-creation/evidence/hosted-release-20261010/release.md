# Hosted map artwork release — 2026-10-10

User authorized integration and deployment to main. Accepted Tickets03–12 were already integrated and pushed at `2a9ede93a61fb4b817b90e0476b5a6df89268bdf`. Older ticket branches contain original/superseded implementations of previously released features; they are not merged over the accepted map source.

GitHub Pages run [38034302483](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/38034302483) completed successfully for that exact source. Live site: https://ozazy101-hash.github.io/the-drowned-compass/ . No production source changes were made during this release.

## Hosted database

Linked project `qjiqnzujsuqoqaausrgy` was at20261007130000. Protected public/auth/storage schema and COPY-data exports were restored into a separate local database. All six pending migrations passed against that restored data. Original hosted maps/Handouts/storage objects were empty; no stored object bytes existed to hash. Restored migration fixtures previously proved legacy/shared-object scenarios; hosted role checks also proved shared-object grant retention.

Each reviewed migration was applied separately in dependency order with `db push --linked --skip-vault --yes`, no seeds/roles/vault changes. After each, every one of51 original tables was compared using ordered canonical JSON rows. Final50 tables are exactly unchanged, including all Character records, memberships and Auth records. The original storage bucket is unchanged; the sole intentional existing-table addition is the private generation bucket. Six new map tables and new RPC/policy definitions are additive. See preservation-summary.json, migration logs and final migration history. Original backups stay outside Git at the protected directory in backup-manifest.json; no private campaign rows, keys or authentication tokens are committed.

17 hosted SQL authority checks PASS using uniquely owned metadata fixtures in one rolled-back transaction: DM version/object access, fully hidden first presentation, obsolete reveal/withdraw rejection, browser trusted-registration denial, Player map/version/known-object/workspace/jobs denial, independent shared Handout grant and its withdrawal, anonymous version/workspace denial, disabled generation. Final inventory proves rollback cleanup and exact original preservation. This is SQL/RLS verification, not a fresh Player/anonymous browser session or actual uploaded-object/signed-URL journey.

## Server function and deployed smoke

Reviewed map-generation entrypoint deployed using Supabase API bundling with platform JWT verification ENABLED, plus its existing Auth validation. MAP_CONTROLLER_ORIGIN is the existing GitHub Pages origin. No paid provider key, fixture mode, quota or spending was configured. Automatic approval rejected --no-verify-jwt; default-JWT deployment succeeded and the existing hosted DM session successfully reached the authenticated application.

Live DM browser: Party/Character records rendered; Map Creation Workshop workspace and jobs loaded without the prior missing-RPC error; real function request returned generation-disabled, retained inputs, released busy UI and created zero jobs. Server unsafe settings count0/jobs0. Phone390x844 layout visually checked; viewport restored and smoke draft cleared. Unauthenticated direct function POST returned HTTP401. No real campaign map/Handout/Character mutation or upload was performed. Existing authenticated session is not fresh sign-in timing proof.

## Remaining enablement limits

Paid generation stays disabled, quota0/spend0. The deployed ordinary Edge function's authenticated control/disabled path works, but fresh PREPARE/FINALIZE supervisor/user-worker/loopback topology is NOT hosted-verified. Bundling the entrypoint alone is not a production worker deployment. No claim of working hosted image generation, universal cold CPU compliance, fresh-login timing or physical projector measurement is made. Prior3071ms/2608ms CPU failures and2035ms EarlyDrop/missing shutdown evidence remain limitations. Local full combined workflow/privacy acceptance remains separate from the narrower deployed smoke. Follow docs/release/map-artwork.md before provider enablement; do not relax bounds or submit paid tests automatically.

Rollback keeps private-map policies and records. Reverting to an old public-map frontend is unsafe. No hosted reset, down migration or data rollback occurred.
