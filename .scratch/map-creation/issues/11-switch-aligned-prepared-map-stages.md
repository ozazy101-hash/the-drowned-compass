# 11 — Switch aligned Prepared Map Stages

Type: task
Status: resolved
Blocked by: 08, 10
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Let the DM build on any saved candidate and explicitly use a later stage without moving the already established geography. Retain accepted mask progress and calibrated placement only when registration is compatible.

## Module and interface

Party Display and map-viewport registration checks own compatibility; Grid Map family/version relationships and PartyContent own saved stage selection.

## Architecture constraints

Use the single domain compatibility predicate backed by04 registration lineage; content persistence decides compatible mask retention atomically, Party Display retains session-local pan/calibration. Different image checksum does not automatically invalidate a proven constrained revision; equal size/family does not automatically validate a whole generated image. Do not add another stage capability, generation pipeline, snapshot assembler or viewport algorithm.

## Acceptance

- [x] Same-family stage switch checks grid dimensions/distances and complete image registration; family identity alone does not prove alignment.
- [x] Compatible stage switch retains calibrated square size, pan, background placement and accepted Reveal Mask. New chamber can remain hidden until uncovered.
- [x] Incompatible selection leaves the current display intact, explains mismatch and offers explicit new-map setup starting fully hidden with calibration acknowledgement.
- [x] Branching from an earlier version remains available; selected/currently displayed parent identities are distinct and visible.
- [x] No automatic image fitting/rescaling after compatible switches. Extend actual imagery only within fixed canvas extent; keep unselected pixels fixed under08.
- [x] Clear/reopen/session changes keep existing calibration lifecycle semantics and never accidentally reveal the whole stage.

## Verification and review

Registration/domain checks, image pixel/transform assertions and two-window calibrated stage/uncover/older-branch journey on laptop/phone. Actual physical projector measurement remains manual. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

2026-10-10: Completed at frozen source `c83f29a3098e24c329da73302ea03ccc708e1b05` with distinct Standards/depth PASS and Spec PASS; build, domain27/27, genuine local laptop/phone2/2 and shared lifecycle24/24 (2 separate genuine tests skipped in fixture mode). See [11-delivery](../evidence/11-delivery.md) for exact profiles, baseline restoration, fixture limits and lease closure. Physical projector measurement remains manual; no hosted migration/merge/deployment. Coordinator owns acceptance and ticket12 release.
