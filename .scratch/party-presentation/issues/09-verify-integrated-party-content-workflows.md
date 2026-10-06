# 09 — Verify integrated Party content workflows

**Status:** ready-for-agent

**Blocked by:** 08

**Spec:** [Party content and presentation](../spec.md)

## What to build

Verify the combined Handout, Party Display and Grid Map work against the settled spec, address demonstrated integration defects and provide one integrated preview.

## Module and interface

Review the implemented modules as a whole: small interfaces must hide content authorization, accepted-state reconciliation, presentation coordination, map edits and calibration. This ticket is an integration gate, not permission for another general architecture rewrite or visual overhaul.

## Placement and reuse decision

In the integrated review, check the explicit reuse/placement decisions recorded in module-placement-review.md: shared authentication/client composition, one content lifecycle for Handouts and maps, map-domain editing, and calibrated mode inside Party Display. Ticket numbers represent delivery slices, not a mandate for nine public modules. Ticket 01 is an optional character-domain refactor and is outside this delivery gate unless separately scheduled.

## Acceptance

- [ ] Record exact reviewed heads and combined commit, local migration ordering, check commands/results and any remaining blockers.
- [ ] Run one combined calculation/data/database/browser regression with the repository-supported source/test transport; separately smoke-test the production artifact.
- [ ] Cross-feature journeys include ongoing Character Record edits while presenting Handouts/maps, upload replacement/withdrawal, independent PDF reading, copied map stages and no Character Record corruption.
- [ ] Usability: clear navigation, keyboard-accessible controls, readable contrast, phone/laptop layouts and useful loading/error feedback. Keep styles consistent and replaceable.
- [ ] Provide one integrated preview and concise use instructions covering extended displays, external artwork and calibration.
- [ ] Clearly label Party Data Backup file exclusions and deferred features.
- [ ] Follow docs/agents/ticket-delivery.md. Creating tickets or completing local checks does not itself authorize merging, hosted migrations or deployment.

## Verification and architecture review

Apply the review requirements in the spec to the combined implementation. Record standards and spec findings separately, including module depth with concrete evidence. Fix findings and repeat only affected checks or the combined gate when material changes justify it. Physical projector measurement is a documented manual check, not an invented automated result.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
