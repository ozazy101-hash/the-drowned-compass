# 04 — Edit and synchronize the Character Overview

**What to build:** A Party member can open a claimed Character Page and maintain its core Overview information with field-level saving, visible status, realtime updates, and understandable failure behaviour.

**Blocked by:** 03 — Softly claim a Character Slot.

**Status:** resolved

- [x] The Character Page exposes Overview, Combat, Magic, Inventory, Features, and Story navigation while making Overview functional.
- [x] Identity, Ability Scores, saving-throw proficiency, skill proficiency, Armor Class, maximum Hit Points, speed, and spellcasting Ability can be edited.
- [x] Changes show Saving and Saved feedback and persist at field or focused-record granularity.
- [x] Two browsers editing different fields preserve both accepted changes and receive realtime updates.
- [x] Two browsers editing the same field show the latest accepted value consistently.
- [x] A disconnected or rejected save remains visibly unsaved and offers a safe retry path.
- [x] The editing journey is keyboard operable and usable at phone and laptop widths.

## Comments

- Claimed on 2026-09-22 for implementation on `codex/ticket-04-character-overview`, based on the manually accepted Ticket 03 commit `5bd5a5c`.
- Added the complete responsive Overview editor and section navigation while leaving Combat, Magic, Inventory, Features, and Story intentionally inactive for their later tickets. Every field exposes an independent save state; failed or stale writes retain the draft and offer Retry.
- Extended both Party data adapters with narrow conditional field updates. Per-field versions allow unrelated edits to commute, reject stale same-field writes, and let realtime clients converge without weakening the soft-claim access model.
- Added `20260922200000_edit_character_overview.sql` with validated Overview columns, update actor/version metadata, and the RLS-governed `update_character_overview_field` function. The existing Character Slot Realtime publication remains in use.
- Reset local Supabase and applied all migrations from scratch. `pnpm test:db` passed 68 pgTAP assertions across three files, and database lint reported no schema errors.
- Browser coverage passes 10/10 at the laptop viewport and 10/10 at the phone viewport, including keyboard editing, all six Ability Scores, Saving/Saved feedback, rejected-save retry, persistence, responsive overflow, different-field concurrency, and same-field latest-accepted convergence.
- `pnpm build` passes with the configured GitHub Pages base path. Hosted Supabase was not mutated; the new Ticket 04 migration still needs its normal hosted deployment followed by a live two-session smoke test.
- Release follow-up on 2026-09-28: the linked hosted database migration list confirms all three versions are applied, including Ticket 04. PR #1 targets `main` and includes the accepted Tickets 01–03 foundations.
- Pre-merge review reproduced two timing bugs with deterministic browser tests: an earlier save completion discarded newer typing, and an older save-result snapshot replaced newer realtime field versions. Draft/request guards and version-aware save-result merging fix these paths. Pending checkbox/select choices now retain their drafts through conflicts and allow safe Retry.
- A real Supabase-adapter contract test with mocked HTTP and realtime transport reproduced missed edits after reconnect. Reloading on `SUBSCRIBED` now catches up and suppresses callbacks after unsubscribe.
- The expanded browser suite passes 30/30 (15 laptop, 15 phone) with one worker. Hosted deployment and signed-in live acceptance remain the final release checks.
