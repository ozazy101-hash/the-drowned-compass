# 04 — Open and control the Party Display

**Status:** ready-for-agent

**Blocked by:** 03

**Spec:** [Party content and presentation](../spec.md)

## What to build

Deliver a separate player-safe window suitable for an extended TV/projector desktop, controlled from the DM laptop.

## Module and interface

A presentation module owns the selected revealed content, PDF page, viewport and display lifecycle. Its interface expresses present, clear and viewport/page changes; feature views must not coordinate storage reads, subscriptions or cross-window messages themselves. Hide transport inside justified adapters/internal seams. Do not send the DM library or private drafts to the display, and do not reload all Character Records for presentation updates.

## Placement and reuse decision

Build one focused presentation feature module for window lifecycle, selection, page and viewport coordination. Reuse the existing authenticated content capability for authorization, reveal, open and updates; the display receives only the currently selected revealed content. In-process/BroadcastChannel/window-message details are internal seams unless real alternative transports justify an external adapter interface. The initial extended-display feature does not require a new server-side presentation repository. Do not create a separate authentication module, generic media-viewer framework or duplicate content visibility state. Keep page/image rendering internal and design viewport state so Ticket 07 adds calibrated behavior to this same module.

Party Display is independent of Party/CharacterRecord snapshots. Use existing App/main navigation/composition and content-specific subscriptions; Ticket 01 is not a blocker.

## Acceptance

- [ ] Open the window via a user gesture; handle blocked popups, closed windows and reopening with actionable feedback.
- [ ] Reveal and present is a cohesive command for private content; failed reveal cannot display private content.
- [ ] Show images and a DM-selected PDF page; DM controls zoom/pan, Fit to screen and Clear display.
- [ ] Players independently read full PDFs without following TV page/viewport changes.
- [ ] Replacement updates active content; withdrawal clears it. Sign-out/session loss clears sensitive display state.
- [ ] Online-first operation retains an already rendered item during interruption where possible and reconciles visibility on reconnection; do not claim offline sync.
- [ ] No DM navigation, private titles or editing controls appear in the Party Display.
- [ ] Use a PDF renderer capable of deterministic page selection/view control; native-browser viewer differences must not become caller obligations.

## Verification and architecture review

Test presentation transitions through its interface and browser behavior across two windows: private reveal failure, PDF navigation, withdrawal, replacement, disconnect/reconnect and window reopen. Verify unauthorized presentation writes in the backend if shared state is persisted. Build, focused desktop/phone control journeys and relevant character regression; do not depend on owning a physical TV.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
