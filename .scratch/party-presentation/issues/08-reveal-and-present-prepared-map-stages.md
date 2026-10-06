# 08 — Reveal and present prepared map stages

**Status:** ready-for-agent

**Blocked by:** 03, 06, 07

**Spec:** [Party content and presentation](../spec.md)

## What to build

Integrate saved Grid Maps with library visibility/presentation and support manually prepared stages using Save as copy.

## Module and interface

The content lifecycle coordinates map reveal/withdraw and presentation through focused capabilities, while the Grid Map module owns duplication of saved documents. Do not introduce an automatic version timeline or force Handout callers to understand map geometry. Document the chosen capability composition at the existing seam; avoid either a giant PartyData interface or wrappers added solely for folder structure.

## Placement and reuse decision

Extend the same content capability, Grid Map domain behavior and Party Display module built by earlier tickets. Save as copy belongs to map/content save semantics; reveal/withdraw belong to the established content lifecycle; preserved viewport belongs to the existing display. Do not add a stage manager, map-version repository, generic content orchestration facade or another visibility implementation. Backend commands may coordinate document and protected background references atomically behind the existing seam, while the shared UI consumes meaningful accepted outcomes.

## Acceptance

- [ ] Save as copy duplicates saved map geometry, canvas/grid dimensions and background placement into a new private map with independent identity.
- [ ] No unsaved changes are silently included; make the saved-versus-unsaved copy choice explicit to the DM.
- [ ] Copies remain usable if their source is changed/withdrawn; shared background references must respect access and file lifecycle.
- [ ] Reveal and present exposes the entire saved map; players can reopen revealed maps in the Party Library.
- [ ] Save on a revealed map updates its Library representation and active Party Display only after acceptance.
- [ ] Matching stage changes retain calibrated scale and position; visibly handle incompatible dimensions/registration without pretending they align.
- [ ] Earlier stages remain revealed until individually withdrawn. Withdrawal clears an active stage.
- [ ] No automatic partial reveal, secret rooms, tokens, Fog of War or version-history UI.

## Verification and architecture review

Verify copy independence, private initial visibility, save/reveal/withdraw conflicts and equivalent adapters. Real policy checks include copied backgrounds and unrevealed map content. A two-window plus Player browser journey presents stage 1, prepares stage 2 privately, reveals it, verifies identical grid placement and revisits stage 1. Build and focused regressions.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
