# 03 — Reveal, replace and withdraw Handouts

**Status:** ready-for-agent

**Blocked by:** 02

**Spec:** [Party content and presentation](../spec.md)

## What to build

Complete the persistent Party Library and the DM lifecycle of uploaded Handouts.

## Module and interface

Extend the Handout module with cohesive reveal, replace and withdraw transitions. The interface returns accepted state or a meaningful authorization/conflict/failure result. Visibility, file lifecycle and synchronization stay inside the module/adapters. Replace retains visibility; avoid a draft/publish version interface or separate public database.

## Placement and reuse decision

Extend the content capability established in Ticket 02; do not create a second reveal/withdraw manager, a separate Player repository, or a new public file-lifecycle interface. The DM and Player Library are role-filtered views of that same module. Keep low-level protected file replacement and temporary URL handling inside its adapters. Existing FeaturesStory draft/error behavior is a reference for user-visible outcomes, not a reason to generalize its character text editor into a universal editor. Update the existing PartyBackupDownload explanatory text rather than introducing another backup module.

## Acceptance

- [ ] Players list, view and download only revealed Handouts; their own navigation is independent.
- [ ] Reveal persists across refresh and devices. Withdrawal retains private content and removes Party access/listing.
- [ ] Use Replace for everyone on revealed items; keep the existing file usable until replacement succeeds, without losing visibility or title.
- [ ] A failed/stale operation cannot silently undo a later reveal, withdrawal or replacement; surface retryable conflicts.
- [ ] Already obtained copies cannot be recalled; prevent fresh access after withdrawal subject to documented temporary URL/cache behavior.
- [ ] Clear invalid selected content and expose accepted content/visibility changes for later Party Display integration.
- [ ] Party Data Backup text explicitly excludes uploaded files; existing export format and character coverage remain intact.

## Verification and architecture review

Test lifecycle transitions, ordering/conflicts and equivalent adapters through the Handout interface. Database/storage checks must cover role denial and reveal/withdraw transitions. Focused two-session browser journeys verify independent Player reading, replacement failure and refresh persistence. Build and backup regression as affected.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
