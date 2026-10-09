# 09 — Persist manual Reveal Masks

Type: task
Status: resolved
Blocked by: 04
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Implement cell-based Uncover/Hide,1/2/4-square brushes, whole-map actions, stroke undo/redo and DM overlay. Save accepted reveal progress per map family independently of artwork versions and physical calibration.

## Module and interface

Grid Map domain owns cell-mask validation and stroke history; PartyContent/local/Supabase adapters own accepted mask revisions and conflicts.

## Architecture constraints

Persist accepted Reveal Masks against the validated registration/dimension key defined in04. Commit stroke/undo intents with expected presentation revision, keeping artwork choice and mask coherent; return the accepted snapshot or conflict. Do not reinterpret a mask on unrelated geometry. Stroke history is controlled in the domain; listeners consume authoritative accepted observations. The in-process brush arithmetic needs no port/factory abstraction;10 composes the actual controls with the renderer.

## Acceptance

- [x] First presentation/new family starts fully hidden; coordinates and bounds match the Map Grid. Mask shape is validated client/server; invalid/missing state fails closed.
- [x] A stroke is one undo action; undo/redo and whole-mask actions preserve valid dimensions. Confirm deliberate whole-map uncovering.
- [x] Accepted progress survives reload. Expected revision detects two-DM conflicts; failed save cannot silently replace accepted mask or show unaccepted visibility on the display.
- [x] Painting creates no AI requests or per-sample network writes. Clearly show pending/accepted/error/conflict states and preserve a recoverable local stroke.
- [x] Mask storage/history has DM-only policies and does not add Party Library exposure. No automatic vision, freeform masks or named-section feature.

## Verification and review

Pure stroke/history/bounds tests, local/Supabase equivalence and concurrent-policy SQL; focused pointer/touch/undo/reload/conflict journey with owned fixture cleanup. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

2026-10-09: Orchestrator released pure domain phase on accepted04 base c6577fb3261213834d4741801541eefaec8ed706. Ownership limited to new mask domain and pure tests; persistence/shared files and SQL/browser remain awaiting05 handoff. Dedicated writer and distinct independent reviewer coordinated in codex/map-reveal-masks-09.

2026-10-09: Pure domain phase source 1453bed52ae45caf05d1b7b0d250f3165cce11e5 reviewed independently: Standards/depth PASS, pure-phase Spec PASS; 17/17 independently rerun focused tests. One P2 family-response guard fixed before final review. See ../evidence/09-domain-phase.md. Full ticket remains incomplete pending orchestrator05 shared-file/persistence handoff.

2026-10-09: Full persistence phase completed at frozen source aa3dd81d21f98eb8f95289854d7771942e7efcf0 against accepted04+05 aca34d3166c4d4ae71101468fbeb97450a7c75b5. Distinct independent Standards/depth PASS and full09 Spec PASS within accepted ownership.17/17 domain,79/79 SQL,6/6 focused laptop/phone browser checks and build pass; original table hashes unchanged, owned cleanup and leases released. See ../evidence/09-delivery.md. Controls/DM overlay/flattened production display remain ticket10 as explicitly coordinated;09 delivers their domain commands/persistence and labelled harness evidence. No hosted/main/deploy; coordinator owns dependent release.
