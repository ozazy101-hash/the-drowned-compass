# Ticket 09 delivery — 2026-10-09

Accepted dependency base: `aca34d3166c4d4ae71101468fbeb97450a7c75b5` (assembled 04+05).
Merge into retained 09 branch: `8c9df795f412f5fc58586ebedd691530ef993c31`; no conflicts. Preserved reviewed pure source `1453bed52ae45caf05d1b7b0d250f3165cce11e5` and evidence `e004fdef5c475485bf7439b6d54ac47a57789347`.
Frozen full source: `aa3dd81d21f98eb8f95289854d7771942e7efcf0`.
Branch: `codex/map-reveal-masks-09`.
Managed worktree: `/Users/oscarpauwels/.codex/worktrees/map-reveal-masks-09/Dungeons&Dragons`.
Source and closure evidence are committed separately. Coordinator owns acceptance and dependent release.

## Result and module contract

Grid Map domain validates bounded cell masks, interpolated 1/2/4-square brush gestures, one-stroke undo groups, redo and whole-mask transitions. Whole-map uncover requires explicit confirmed intent; the module owns no UI prompt. Invalid/missing snapshots remain unavailable with zero visible cells. Accepted snapshots stay separate from draft cells, pending/error/conflict states and recoverable history. Pending edits are locked; failed responses preserve accepted visibility. The pure-phase independent P2 successful-response family guard was corrected and regression-tested before acceptance.

PartyContent adds one `commitMapRevealMask(intent)` command at its existing seam. Intent carries expected atomic presentation revision, family/mask identity and accepted geometry. Local/Supabase adapters validate semantic identity, normalized cell order, registration and canonical grid/placement/pixel dimensions; digest, artwork version ID, terrain and calibration do not substitute for geometry. Same request/same semantic command returns its accepted receipt, altered or cross-command request reuse is rejected. Conflicts return the authoritative accepted snapshot without replacing progress.

Retained progress is keyed by family and canonical geometry, independent of immutable artwork versions and session calibration. Choose and commit use one active presentation snapshot and shared transaction/revision lock. A uncovered -> B initially hidden -> compatible A restores accepted progress. New/incompatible geometry requires explicit new-map choice and starts hidden; earlier geometry retains its own progress. SQL commits retained mask plus active presentation atomically. No second presentation ledger or durable undo history was added. Existing map workspace observation invalidates accepted changes; React owns no polling or row choreography.

Deleting the domain would scatter gesture/history/recovery rules; deleting PartyContent persistence would scatter authority, receipts, concurrent acceptance and retained progress across callers. Arithmetic stays in-process without ports/factories. Existing Handout grants, private map metadata/bytes, immutable version history and Character subscriptions remain authoritative.

Production workshop controls, DM overlay and actual popup/flattened rendering are explicitly ticket10-owned. Browser evidence uses a labelled test-only canvas harness and real content seam; it is not a production UI delivery claim. No generation/provider/job orchestration or live AI claim belongs to09.

## Independent review and verification

A dedicated implementation writer and distinct independent reviewer were used. Reviewer examined exact frozen full source against accepted base, CONTEXT, ADRs, spec, ticket and repository Standards/depth.

- Standards/depth: PASS.
- Full09 Spec within accepted ownership: PASS; no actionable findings.
- Independently executed 17/17 mask/artwork domain tests, both TypeScript configurations, Vite production build and diff checks: PASS. Build output was placed in /private/tmp; existing chunk-size warning only.
- Writer final domain: 17/17 PASS; TypeScript and production build PASS.
- Writer SQL: 79/79 PASS, comprising36 mask command/policy tests,8 populated09-only migration rehearsal assertions and35 retained artwork regressions. Rollback fixtures restored exact postmigration schema/data baseline.
- Writer focused browser:6/6 PASS in36.8 seconds, local/Supabase flows on laptop/phone and genuine player/anonymous denial on both. Covers pointer/touch brushes, undo/redo, one explicit saved-stroke write/no per-sample or AI calls, reload, retained family progress, authoritative observation, two controllers with one genuine DM fixture, stale revision conflict, reordered semantic retry, cross-command ID rejection, and failed-save accepted retention/recoverable draft.

SQL/browser results were reviewed through test source and writer evidence; the reviewer did not independently run leased fixtures. Final candidate source content was frozen without edits; an empty source diff against the commit proves equality. Initial browser attempt2/6 passed; four harness-only strict status selector failures were fixed before final6/6 pass. Failed attempts are not counted as passes.

Commands:

```sh
node node_modules/@playwright/test/cli.js test --config=playwright.calculations.config.ts tests/map-reveal-mask.test.ts tests/map-artwork.test.ts --output=/private/tmp/map-mask-09-family-review
pnpm test:db supabase/tests/database/map_reveal_masks.test.sql supabase/tests/database/map_reveal_migration.generated.test.sql supabase/tests/database/map_artwork_versions.test.sql
node scripts/verify-map-reveal-local.mjs
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build
```

Screenshots remain under `/private/tmp/map-reveal-09-browser/`, `map-reveal-masks-supabase--f5a15-nflict-and-recoverable-save-{laptop,phone}-chromium/recoverable-mask.png`. Coordinator visually inspected both: labelled verification harness, readable save-error feedback and retained draft cells. They do not depict final production display controls.

## Migration, preservation and rollback

Additive migration: `supabase/migrations/20261009120000_manual_map_reveal_masks.sql`. Adds DM-only `party_map_reveal_masks`, canonical geometry/mask validation, active-snapshot guard, authorized atomic commit RPC and retained-progress restoration in choose. Reuses04 presentation receipts and locking; preserves05 privacy and independent explicit Handout grants. Valid preexisting accepted masks are retained exactly; malformed historical masks are not retained and existing snapshot validation stays unavailable/black. Privileged future writes also meet the mask check. The populated rollback-only rehearsal removes/recreates only09 objects inside its transaction;04/05 persistent schema was not replayed or downgraded.

Local09 migration applied once transactionally over already-applied04+05. No hosted migration, reset, main merge or deployment. Release migration order remains04 ->05 ->09, subject to the coordinator's full batch runbook. Preserve retained progress/history on client rollback; prefer forward correction. Before any separately authorized destructive schema rollback, export retained masks, presentations/receipts, map/version rows and storage manifest/bytes. No destructive down migration is supplied.

Before schema: `633e6521ceb6f1f75c42dbab0da7c45ae6282e83e86020adbef3757d35713ffa`.
Final schema: `ba650b37ea7d00807b93e382ac00fc90d80d2106fa9d2af09c4b2e9a8c236365`.
Before aggregate data: `8a9e58b138a136aa7608e3c72a9bdf8efbc8ca17752c6eef1bdff7b7fe675ed1`.
Final aggregate data: `8f3c16d65a18a10fa9bd9f0456b5563be390c155f687b7f21d931420838fb8ba`, including added empty mask table. Every original table hash is identical. Hash-only snapshots: `09-baseline-before.json` and `09-baseline-final.json`; no credentials or rows recorded.

## Cleanup and handoff

Unique Ticket09 fixture users and map family IDs; exact owned cleanup only. Initial failed run cleaned4 owned maps/2 users; final run cleaned6 owned maps/2 users. Existing data unchanged; new mask table empty. No storage bytes were created. No port4179 listener, verification lock, owned process or preview remains. All09 local SQL/storage/browser/4179 leases are explicitly released.

Ticket10 should consume the existing accepted snapshot and `commitMapRevealMask` command with domain draft feedback, integrate controls/overlay and safe flattened output, and retain its session/revision guards. This ticket does not release ticket10 or other dependents. Coordinator integration and ticket12 combined gate remain separate. No unresolved09 implementation blocker remains within accepted ownership.
