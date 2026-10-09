# Ticket 04 delivery — 2026-10-09

Base: `0b596249f1598da1df102046c9e7823e66067983`.
Frozen source: `165650cd30fbeb91f658767aae78d05dde9cae07` (candidate `22142fd89581b2e62dc48aff877848c85948244b`).
Branch: `codex/map-artwork-04`.
Managed worktree: `/Users/oscarpauwels/.codex/worktrees/map-artwork-04/Dungeons&Dragons`.
Source remains frozen; this document and tracker closure are committed separately.

## Result and module handoff

Immutable Map Artwork Versions retain saved drawings, artwork/reference metadata and bytes, parent/family identity, request/job/origin identity and canonical placement. Existing editor saves/copies create retained accepted snapshots; branching reads a retained parent and rejects supplied draft geometry. Uploads receive fresh registration independent of content digest. Conservative legacy migration preserves receipts/current maps and independent copies. SQL uses immutable object identity; legacy local identical-byte copies retain compatibility only with matching canonical geometry. Modern uploads never use digest lineage.

Grid Map domain owns ancestry validation, registration compatibility and coherent hidden-default presentation validation. Existing PartyContent owns authorization, file ordering/cleanup, immutable source reads, accepted receipts, concurrency and authoritative observation through local and Supabase adapters. Its cohesive additions are readMapWorkspace, observeMapWorkspace, readMapVersion, openMapVersion, attachMapVersion and chooseMapPresentation. Removing these modules would spread their rules among callers. App, workshop and popup lifecycle were not changed. map-viewport delegates the single domain compatibility predicate.

Presentation is one atomic snapshot containing saved version, canonical geometry/registration, hidden-default mask and monotonic revision. Incompatible selection returns the previous accepted state unless explicit new-map setup is requested. Inspection/attachment never changes presentation. Semantic presentation retries normalize omitted/false newMap identically across adapters. Pre-RPC staging failure guard-cleans both request-owned artwork/reference paths; uncertain post-RPC outcomes remain reconciliation-first. Guards protect every accepted map/version/Handout reference.

Public attachment has no origin/job/inherited-registration assertion. Privileged SQL contract:

```text
attach_server_map_artwork_version(
 p_party uuid, p_family uuid, p_parent text, p_expected_version integer,
 p_request uuid, p_job uuid, p_origin text, p_title text,
 p_document jsonb, p_background jsonb, p_reference jsonb,
 p_instructions text, p_constrained boolean)
```

Execution is service_role-only with an auth.role guard. Background metadata uses x/y/width/height/pixelWidth/pixelHeight/mime/size/digest/object_id; incoming registration is ignored. SQL checks immutable same-family parent and canonical geometry, creates a new registration for arbitrary generation, and preserves lineage only for a privileged constrained revision. **06 must bind authorized party/request/job to its durable ledger and reconcile attachment receipts atomically; 08 must decode/composite and prove exact outside-region decoded-pixel preservation before constrained=true. SQL does not prove pixel preservation.** No provider/job engine or live generation claim is included in 04.

09 extends the accepted hidden mask and revision-checked transitions. 10 consumes one accepted snapshot. 05 still owns legacy map metadata visibility and obsolete reveal/withdraw/client command denial: 04 already denies current/historical/reference map byte grants except an independent explicit revealed-Handout grant.

## Verification

- Build: PASS (`pnpm build`).
- Focused domain: 14/14 PASS (`pnpm exec playwright test --config=playwright.calculations.config.ts tests/map-artwork.test.ts tests/map-stages.test.ts tests/grid-map-persistence.test.ts tests/map-viewport.test.ts`).
- Complete focused browser candidate: 26/26 PASS, laptop 13 and phone 13, local and genuine local Supabase adapters. Includes upload/draw/save/reload, accepted retries/conflicts, retained bytes and independent source selection. Earlier failed assertions were corrected and rerun; they are not included as passes.
- Final frozen-source affected browser: 6/6 PASS, laptop 3 and phone 3; both adapter workspace journeys include omitted/false/reordered semantic retries and actual unauthorized no-store requests; Supabase reference-storage 503 proves accepted versions/presentation survive and automatic pre-RPC cleanup.
- SQL: 62/62 PASS: fresh nonempty migration 10, authority/storage/server 35, historical stages 17. Tests use real local SQL/storage authority and rollback-only populated legacy rehearsal. Command: `pnpm test:db supabase/tests/database/map_artwork_migration.generated.test.sql supabase/tests/database/map_artwork_versions.test.sql supabase/tests/database/map_stages_migration.generated.test.sql`.
- Independent reviewer: Standards/depth PASS and Spec PASS on exact frozen source. Initial candidate had two P2 findings (semantic retry parity and staged-file compensation); final review confirmed both fixed, no remaining actionable findings. Reviewer independently ran 10/10 domain/viewport tests; those files are unchanged at final head. Writer-reported browser/SQL/build evidence and changed test source were reviewed, not misrepresented as reviewer-executed fixtures.

Browser runner: `MAP_TEST_CONFIG=playwright.map-artwork.config.ts MAP_FIXTURE_LABEL=Ticket04 node scripts/verify-saved-maps-local.mjs`; final affected rerun adds `--grep 'immutable artwork workspace|failed reference storage'`. Unique port 4174; no preexisting preview reused. Owned fixture users/maps/object names are UUIDs with Ticket04 labels. Complete browser cleanup removed 11 maps/19 objects; final affected cleanup removed 5 maps/9 objects. Credentials remain process-only and were not logged.

## Migration, preservation and rollback plan

Migration: `supabase/migrations/20261009100000_private_map_artwork_versions.sql`. Additive tables: party_map_artwork_versions, party_map_presentations, party_map_presentation_requests. Local migration was applied transactionally; later local hardening was applied as an incremental development delta. Fresh deployment/rehearsal must apply the whole committed migration once, not replay those development deltas. No hosted migration, main merge or deployment was performed.

Fresh nonempty rehearsal: `supabase/tests/fixtures/map_artwork_migration.sql.template`, generated by scripts/run-database-tests.mjs. Original maps, independent copies, receipts and object metadata survive migration. Historical map-stage policy preparation is confined to its rollback-only fixture. No database reset or persistent downgrade occurred.

Original schema hash before migration: `d552a2f296ead2dcd2dd737ac84369dcb7aa9bf79122c1d4a5f44f5df87796b7`.
Original aggregate data hash: `7637cb403b8684cfe37a4cce5641e2971ce9fb5cc1f0fc401d30a44111153d71`.
After migration/cleanup: schema `d37b16e44bb45b4cd05a33829a977c840a97fe381e71062da472f20239a80b70`; aggregate data `8a9e58b138a136aa7608e3c72a9bdf8efbc8ca17752c6eef1bdff7b7fe675ed1` includes the three added empty tables. Full comparison of every original table hash found zero changes (auth, Characters, parties/memberships, old maps/receipts, Handouts and storage). Baseline snapshots are `/private/tmp/map-artwork-04-baseline.json` and `/private/tmp/map-artwork-04-after-candidate.json`.

Prefer client rollback/forward correction while retaining additive rows/files. Before any separately authorized destructive schema rollback, export all three new tables, original maps/receipts, and the complete storage manifest/bytes; reconcile downstream jobs and preserve every Handout/map/version reference. Do not reset or delete retained history. No destructive down migration is supplied.

Local verification only; release/hosted changes require later authorization. Coordinator owns dependency acceptance and release. This ticket does not release dependents.

## Final frozen-head closure

Final source upload/save/reload browser checks: 4/4 PASS (local/Supabase, laptop/phone), 48.6 seconds, no source edits; owned cleanup 3 maps/3 objects. Frozen screenshots are in `/private/tmp/map-artwork-04-frozen-upload/`: `saved-maps-local-upload-ar-0788f-private-map-on-laptop-phone-laptop-chromium/saved-map-local.png`, `saved-maps-local-upload-ar-0788f-private-map-on-laptop-phone-phone-chromium/saved-map-local.png`, `saved-maps-supabase-upload-559ef-private-map-on-laptop-phone-laptop-chromium/saved-map-supabase.png`, and `saved-maps-supabase-upload-559ef-private-map-on-laptop-phone-phone-chromium/saved-map-supabase.png`. Coordinator visually inspected the Supabase laptop/phone screenshots: proportional artwork, saved drawing and responsive controls are readable.

Final full-table hash comparison: zero original tables changed; all three added tables empty after cleanup. Before/final hashes are committed alongside this file in `04-baseline-before.json` and `04-baseline-final.json` (hashes only, no credentials or row contents). No owned browser/process remains. SQL fixture/storage verification lease, browser lease and port4174 are explicitly released after final cleanup. No dependents are released by this ticket.
