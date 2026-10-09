# 08 — Revise selected areas and build later stages

Type: task
Status: ready-for-agent
Blocked by: 07
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Allow rectangle selection on a saved artwork version, text instructions and a new private area revision. Support changing scenery or adding a chamber within the fixed map extent, retaining the selected parent and earlier versions.

## Module and interface

Grid Map domain owns selections and version branching; generation backend owns mask/output conventions and compositing; workshop owns instruction/compare flow.

## Acceptance

- [ ] Rectangle selection, clear/reselect and image-coordinate mapping are correct under zoom/pan, touch and alignment transforms; reject empty/out-of-bounds regions.
- [ ] Use the selected saved parent artwork and explicit area; backend composites only the region. All unselected decoded pixels, canvas size, aspect ratio and registration are preserved exactly.
- [ ] Provider mask inversion/drift/output dimension failure cannot corrupt the source; changes within the selection still require visual comparison, with no exact-geometry claim.
- [ ] Whole-map retry and selected-area retry create/reconcile the intended job/version without overwriting source or display. Cancel/failure keeps both intact.
- [ ] Area addition creates a later saved stage inside the current extent; no enlarged-canvas outpainting. Compare before/after, select earlier versions and branch again.
- [ ] Live capability follows03; deterministic fixtures cover failures and exact unselected pixel preservation. Prototype tint overlays are not production output.

## Verification and review

Mask/compositing pixel evidence, selection transform/domain checks, bounded live region edit, SQL/job ownership and laptop/phone revision/branch/compare journey. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; no simulated output may stand in for live provider proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.
