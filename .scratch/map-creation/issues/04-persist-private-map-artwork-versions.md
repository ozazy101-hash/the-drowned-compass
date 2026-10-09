# 04 — Persist private Map Artwork Versions

Type: task
Status: ready-for-agent
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Introduce durable map families with immutable saved artwork versions, uploaded/generated/reference metadata and parent relationships. Retain existing Grid Map drawing/background support. Provide focused operations to create/list/read versions and select a saved source for later revisions without publishing it.

## Module and interface

Grid Map domain owns family/parent/registration relationships; PartyContent owns persistence, immutable files and accepted revision checks. Extend existing local/Supabase adapters.

## Acceptance

- [ ] New and old saved Grid Maps remain readable; preserve geometry, backgrounds, independent copies and accepted receipt semantics. Define migration/rehearsal and rollback plan without reset or deletion.
- [ ] Versions have stable IDs, map-family and parent identity, saved drawing/grid dimensions, artwork placement/registration, origin and request identity. Saved versions are not overwritten by edits.
- [ ] Accept valid references/uploads with existing image validation and proportional placement. Reference files and bytes remain DM-only; expired-session and known-path denial are tested.
- [ ] Branching from any retained saved version creates a new private result; unsaved edits are not silently included. Duplicate requests reconcile to the same accepted result.
- [ ] Failed storage/save leaves accepted versions intact; orphan cleanup respects every map/Handout reference. List pending/error/empty states are truthful.

## Verification and review

Domain family/parent invariants, local/Supabase equivalent outcomes, SQL policies/version/idempotency and laptop/phone upload/save/reload flow; retain original data baseline. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; no simulated output may stand in for live provider proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.
