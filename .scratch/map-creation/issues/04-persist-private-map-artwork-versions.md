# 04 — Persist private Map Artwork Versions

Type: task
Status: resolved
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Introduce durable map families with immutable saved artwork versions, uploaded/generated/reference metadata and parent relationships. Retain existing Grid Map drawing/background support. Provide focused operations to create/list/read versions and select a saved source for later revisions without publishing it.

## Module and interface

Grid Map domain owns family/parent/registration relationships; PartyContent owns persistence, immutable files and accepted revision checks. Extend existing local/Supabase adapters.

## Architecture constraints

Define workspace read/observe and accepted map intent results within the existing PartyContent capability; no parallel auth factory, table repositories or forwarding map facade. Establish the atomic presentation record shape (saved selected version, registration, mask identity and revision), with a hidden default that09 extends. Separate image digest from trusted geometry registration. Arbitrary artwork gets new registration; constrained server-validated revisions may inherit it. Keep canonical pixel/grid/placement dimensions; legacy migration is conservative. Specify authoritative map observation separate from Handout and Character subscriptions. UI loading/error states are consumed in07, rather than a new workshop implementation here.

## Acceptance

- [x] New and old saved Grid Maps remain readable; preserve geometry, backgrounds, independent copies and accepted receipt semantics. Define migration/rehearsal and rollback plan without reset or deletion.
- [x] Versions have stable IDs, map-family and parent identity, saved drawing/grid dimensions, artwork placement/registration, origin and request identity. Saved versions are not overwritten by edits.
- [x] Accept valid references/uploads with existing image validation and proportional placement. Reference files and bytes remain DM-only; expired-session and known-path denial are tested.
- [x] Branching from any retained saved version creates a new private result; unsaved edits are not silently included. Duplicate requests reconcile to the same accepted result.
- [x] Failed storage/save leaves accepted versions intact; orphan cleanup respects every map/Handout reference. List pending/error/empty states are truthful.

## Verification and review

Domain family/parent invariants, local/Supabase equivalent outcomes, SQL policies/version/idempotency and laptop/phone upload/save/reload flow; retain original data baseline. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

2026-10-09: Released exact base 0b596249. Module: Grid Map domain validates retained family/parent geometry and registration compatibility; PartyContent owns immutable versions/files, requests and atomic presentation. Interface: workspace read/observe, immutable source read, attach accepted parent/upload, revision-guarded presentation choice. Drafts never implicitly branch; uploaded artwork establishes fresh registration; source digest is integrity only. SQL and local transactions hide storage ordering, receipts, authorization and hidden defaults.

## Answer

2026-10-09: Implemented private immutable versions, retained sources/references, idempotent branching and atomic hidden-default presentation within existing PartyContent. Source `165650cd30fbeb91f658767aae78d05dde9cae07`; distinct independent Standards/depth PASS and Spec PASS, no remaining actionable findings. Build, domain14, SQL62, browser26 plus final affected6 and frozen upload4 passed. Original table hashes unchanged; fixtures cleaned. [Delivery evidence, migration/rollback and downstream contracts](../evidence/04-delivery.md). Local migration only; hosted migration, merge and deployment unperformed. Coordinator owns acceptance and dependent release.
