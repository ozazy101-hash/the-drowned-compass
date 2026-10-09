# Ticket 05 delivery — 2026-10-09

Accepted dependency base: `c6577fb3261213834d4741801541eefaec8ed706`.
Frozen source: `f960954f37eaa9adacebe8bdb7eb3c04fa640934`.
Branch: `codex/map-artwork-05`.
Managed worktree: `/Users/oscarpauwels/.codex/worktrees/map-artwork-ticket05/Dungeons&Dragons`.
Source and delivery evidence are separate commits; coordinator owns acceptance and dependent release.

## Result and module contract

Grid Maps stay DM-private in PartyContent and database authority. Party Library no longer mounts map views. Maps retain save and independent-copy intents, retained immutable versions, geometry, references and receipts. Map reveal/withdraw are removed from typed and runtime commands. The legacy SQL change command validates obsolete kinds before receipt lookup, so historical reveal retries cannot restore sharing. DM presentation no longer reveals a map. Existing Party Display session/epoch guards clear the display on session loss and reject late work.

PartyContent hides authorization, accepted persistence and protected bytes through its existing map workspace/read/open and save/copy intent interface. SavedMapLibrary consumes its authoritative workspace observation. No new facade, authentication factory or job ledger was added. Handout commands/subscription and explicit revealed-Handout object grants remain unchanged. Removing these rules would spread authorization and lifecycle decisions among callers; views only compose accepted results.

05 completes privacy for the available map/version/reference/job-identity/receipt metadata. There is no generation job ledger yet; 06 owns that server module and must keep it private. Full masked, flattened Party Display rendering and coherent accepted presentation consumption remain 10-owned under the orchestrator's accepted scope. 05 does not claim those later capabilities or live AI generation.

## Independent review

A distinct independent reviewer examined exact committed source `f960954f37eaa9adacebe8bdb7eb3c04fa640934` against the dependency base, CONTEXT, ADRs, spec, ticket and repository instructions.

- Standards/depth: PASS.
- Spec within accepted ticket 05 ownership: PASS.
- No actionable source findings.
- Independently executed `pnpm build`: PASS, and focused domain tests: 14/14 PASS. The reviewer used no SQL/browser fixture lease.

## Verification

- Writer build: PASS (`pnpm build`).
- Domain: 14/14 PASS (`pnpm exec playwright test --config=playwright.calculations.config.ts tests/map-artwork.test.ts tests/map-stages.test.ts tests/grid-map-persistence.test.ts tests/map-viewport.test.ts`).
- Final SQL: 186/186 PASS: populated privacy migration rehearsal 32, retained artwork versions 35, private Handouts 14, historical Grid Maps 78, artwork migration 10, prepared stages migration 17. Every rollback-only rehearsal restored its exact schema/data baseline.
- Focused browser coverage: all 24 cases have passing results on frozen source. Initial run 23/24 PASS; one laptop Supabase initial-save 5-second assertion failed while saving. The unchanged-source affected private-stage rerun passed 2/2 (laptop and phone).
- Extra Handout Present coverage: all 4 cases have passing results on frozen source. Local deterministic PDF display 2/2 PASS, genuine Supabase laptop display PASS; genuine phone first-canvas assertion timed out while presentation completed, then the unchanged-source phone rerun passed 1/1 (41.2 seconds). Failed attempts are not counted as passes.

Focused coverage includes genuine DM/player/anonymous current/historical/reference known-path byte checks; all five map metadata tables; obsolete RPC denial; mixed revealed-Handout grant with map metadata still denied; DM-private maps/copies/workspace; compatible calibration/pan; session-loss pending work; and Handout list/read/PDF/reveal/replace/withdraw/present on laptop and phone. Storage/authority results use genuine local Supabase, not simulated permissions.

Early browser attempts found an accidental local Handout-filter regression, corrected before source freeze. Chrome foreground controller scheduling was addressed only in test harnesses. Local GoTrue also timed out on one early PDF attempt; the final original real-auth PDF journey passed on both viewports. No production timeout or authentication fallback was introduced. The focused runner allows a 60-second test budget; individual assertions retain their existing bounds.

Commands:

```sh
pnpm test:db supabase/tests/database/map_privacy_migration.generated.test.sql supabase/tests/database/map_artwork_versions.test.sql supabase/tests/database/private_handouts.test.sql supabase/tests/database/grid_maps_migration.generated.test.sql supabase/tests/database/map_artwork_migration.generated.test.sql supabase/tests/database/map_stages_migration.generated.test.sql
MAP_TEST_CONFIG=playwright.map-privacy.config.ts MAP_FIXTURE_LABEL=Ticket05 node scripts/verify-saved-maps-local.mjs --grep 'real DM/player|private stages|two genuine Supabase sessions|lifecycle preserves|immutable artwork workspace|session loss|formerly revealed|private copy'
MAP_TEST_CONFIG=/private/tmp/playwright-map05-final.config.mts MAP_FIXTURE_LABEL=Ticket05 node scripts/verify-saved-maps-local.mjs --grep 'supabase: private stages|DM deterministic PDF|genuine Supabase display'
MAP_TEST_CONFIG=/private/tmp/playwright-map05-final.config.mts MAP_FIXTURE_LABEL=Ticket05 node scripts/verify-saved-maps-local.mjs --project=phone-chromium --grep 'genuine Supabase display'
```

The ephemeral final configuration reuses port 4175 and expands testMatch to the existing party-display suite; it changes no source. Main screenshots remain under `/private/tmp/map-artwork-05-browser/`, including `map-stages-local-private-s-13066--absent-from-Player-Library-{laptop,phone}-chromium/ticket08-local.png`. Coordinator visually inspected both local screenshots: responsive readable controls, maps labelled Private and only Present actions. Subsequent Playwright runs cleared some ephemeral screenshot directories; missing images are not cited as evidence.

## Migration, preservation and signed links

Migration: `supabase/migrations/20261009110000_dm_private_grid_maps.sql`. It changes revealed current-map visibility to private, adds the private-only constraint, replaces map-read policy with DM-only access, and retires SQL sharing kinds while preserving copy semantics. 04's storage policy continues to deny map-only current/historical/reference bytes and preserve an independent explicit revealed-Handout grant. No retained receipt, version, background object or Character row is rewritten/deleted by 05.

The local migration was applied once over already-applied 04. Historical fixture changes restore earlier policy/constraint state only inside BEGIN/ROLLBACK. The populated pre-05 rehearsal verifies normalized map equality excluding the intentional visibility conversion; all other map fields, independent copies, receipts, versions, storage objects and Character data remain exact. The persistent local database had no map rows before 05, so all original table hashes are unchanged after owned fixture cleanup.

Before schema: `d37b16e44bb45b4cd05a33829a977c840a97fe381e71062da472f20239a80b70`.
Final schema: `633e6521ceb6f1f75c42dbab0da7c45ae6282e83e86020adbef3757d35713ffa`.
Before/final aggregate data: `8a9e58b138a136aa7608e3c72a9bdf8efbc8ca17752c6eef1bdff7b7fe675ed1`.
Hash-only snapshots: [before](05-baseline-before.json), [final](05-baseline-final.json). Zero original table hashes changed; 04's three additive tables are empty after cleanup.

The application uses authenticated storage downloads; no application-minted signed links were found. Policy migration does not retroactively revoke independently minted provider signed URLs: any such link may remain usable until its original configured expiry. No original expiry can be inferred from this repository. Already obtained copies also cannot be recalled. Hosted release should document this limitation rather than delete shared objects or rotate credentials without separate authorization.

Prefer forward policy/client correction while retaining immutable history. Before any separately authorized rollback, export map/version/receipt/presentation tables and storage manifest/bytes. Restoring the old sharing policy would reopen player access and requires explicit release review; do not reset the database or delete retained rows/files. No destructive down migration is supplied.

## Cleanup and handoff

Unique Ticket05 fixture IDs, users and object paths were used. Cleanup targets exact owned users/party rows and objects, including owned Handouts whose tests use fixed titles, never global title matching. Main final run cleaned 11 maps, 5 Handouts and 21 image objects; final affected/display run cleaned 5 maps, 3 Handouts and 7 objects; last phone rerun cleaned 1 map, 2 Handouts and 2 objects. Earlier failed-run cleanup was reconciled against the original table baseline.

Final full hash comparison found no original table changes. Port 4175 has no listener, the local verification lock is absent, and no owned fixture/process/preview remains. **All ticket 05 SQL/storage/browser/port 4175 leases are explicitly released.** Shared PartyContent/adapters/SQL/browser ownership is ready for coordinator handoff; this ticket does not release dependents itself.

No hosted migration, main merge or deployment was performed. No unresolved ticket 05 implementation blocker remains. Coordinator integration and later combined gate remain separate.
