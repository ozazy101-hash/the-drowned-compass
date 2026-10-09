# 09 — Persist manual Reveal Masks

Type: task
Status: ready-for-agent
Blocked by: 04
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Implement cell-based Uncover/Hide,1/2/4-square brushes, whole-map actions, stroke undo/redo and DM overlay. Save accepted reveal progress per map family independently of artwork versions and physical calibration.

## Module and interface

Grid Map domain owns cell-mask validation and stroke history; PartyContent/local/Supabase adapters own accepted mask revisions and conflicts.

## Acceptance

- [ ] First presentation/new family starts fully hidden; coordinates and bounds match the Map Grid. Mask shape is validated client/server; invalid/missing state fails closed.
- [ ] A stroke is one undo action; undo/redo and whole-mask actions preserve valid dimensions. Confirm deliberate whole-map uncovering.
- [ ] Accepted progress survives reload. Expected revision detects two-DM conflicts; failed save cannot silently replace accepted mask or show unaccepted visibility on the display.
- [ ] Painting creates no AI requests or per-sample network writes. Clearly show pending/accepted/error/conflict states and preserve a recoverable local stroke.
- [ ] Mask storage/history has DM-only policies and does not add Party Library exposure. No automatic vision, freeform masks or named-section feature.

## Verification and review

Pure stroke/history/bounds tests, local/Supabase equivalence and concurrent-policy SQL; focused pointer/touch/undo/reload/conflict journey with owned fixture cleanup. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; no simulated output may stand in for live provider proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.
