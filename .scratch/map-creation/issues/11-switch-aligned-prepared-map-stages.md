# 11 — Switch aligned Prepared Map Stages

Type: task
Status: ready-for-agent
Blocked by: 08, 10
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Let the DM build on any saved candidate and explicitly use a later stage without moving the already established geography. Retain accepted mask progress and calibrated placement only when registration is compatible.

## Module and interface

Party Display and map-viewport registration checks own compatibility; Grid Map family/version relationships and PartyContent own saved stage selection.

## Acceptance

- [ ] Same-family stage switch checks grid dimensions/distances and complete image registration; family identity alone does not prove alignment.
- [ ] Compatible stage switch retains calibrated square size, pan, background placement and accepted Reveal Mask. New chamber can remain hidden until uncovered.
- [ ] Incompatible selection leaves the current display intact, explains mismatch and offers explicit new-map setup starting fully hidden with calibration acknowledgement.
- [ ] Branching from an earlier version remains available; selected/currently displayed parent identities are distinct and visible.
- [ ] No automatic image fitting/rescaling after compatible switches. Extend actual imagery only within fixed canvas extent; keep unselected pixels fixed under08.
- [ ] Clear/reopen/session changes keep existing calibration lifecycle semantics and never accidentally reveal the whole stage.

## Verification and review

Registration/domain checks, image pixel/transform assertions and two-window calibrated stage/uncover/older-branch journey on laptop/phone. Actual physical projector measurement remains manual. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; no simulated output may stand in for live provider proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.
