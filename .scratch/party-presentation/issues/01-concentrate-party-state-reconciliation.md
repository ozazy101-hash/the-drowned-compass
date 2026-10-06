# 01 — Concentrate Party state reconciliation

**Status:** resolved

**Blocked by:** None

**Spec:** [Party content and presentation](../spec.md)

## What to build

Move the existing accepted-state reconciliation out of App.tsx without changing Character Record behavior. This is optional character-domain maintenance, not a prerequisite for the new content/display views.

## Module and interface

The Party-state module owns merging incoming saved/realtime state, feature versions and class projection. Its interface accepts current and incoming Party state and returns accepted state. App composes views and supplies results; it must not know the merge order of eight features. Reuse existing feature transitions internally; do not add a transport adapter for pure computation.

## Placement and reuse decision

This is an optional extraction within the existing Party domain, not a new application-state framework. Keep existing feature merge implementations and use a focused domain helper only to concentrate their orchestration. Do not move pure reconciliation into the Supabase adapter or fold private campaign content into the Party snapshot. The new Party Display does not read Character Records, so this refactor is not a prerequisite for Tickets 02–09. The user subsequently selected this cleanup as the first execution step; that ordering is now complete.

## Acceptance

- [x] Preserve newer local accepted field/feature values when an older realtime snapshot arrives, and accept genuinely newer state.
- [x] Use the same reconciliation for saved command results and realtime snapshots.
- [x] Retain current class projection, slot/claim handling, rest results and unrelated feature data.
- [x] Keep navigation, authentication, Character Page drafts and current UX unchanged.

## Verification and architecture review

Test reconciliation through its interface with delayed snapshots, newer accepted saves and cross-feature changes. Run relevant calculation tests, build and focused existing character browser journeys. Review must show that deleting this module would restore feature-merge knowledge to App, rather than merely remove forwarding code.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.

2026-10-06: User authorized implementing this cleanup first with implementation and independent review agents. Selected as the first execution step; Tickets 02–09 remain on hold until this ticket is verified and resolved.

### 2026-10-06 — Implementation and independent review complete

Extracted `reconcileParty` and `reconcilePartySlot` into `src/domain/party-state.ts`; App delegates without feature merge knowledge. Reused all existing feature rules. Standards/depth and Spec review both pass with zero findings/outstanding requirements. Full calculation/domain suite: 272/272, including 12 new interface tests; independent reviewer reran 12/12. Build passes. Focused laptop/phone browser journeys: 50/50. Database/schema checks are not applicable. No application deployment performed.

[Review, exact-source fingerprints and verification evidence](../verification/ticket01/review.md). Tickets 02–09 may now proceed in their existing dependency order, but implementation has not begun on them.
