# 03 — Softly claim a Character Slot

**What to build:** A player can select one of the six unclaimed Character Slots, complete the short two-step setup, and arrive on a newly initialized Character Page without creating a hard ownership restriction.

**Blocked by:** 02 — Enter the protected Party.

**Status:** resolved

- [x] Step one captures player name, character name, primary class, subclass, species, background, and level.
- [x] Step two captures all six Ability Scores and prevents incomplete or invalid scores from being submitted.
- [x] Completing setup marks the Character Slot as claimed and opens its Character Page.
- [x] The claim identifies the responsible player while every authenticated Party member retains editing access.
- [x] Another signed-in browser receives the claimed identity without reloading.

## Comments

- Added a two-step, responsive claim flow, claimed Party cards, and a focused initial Character Page while leaving Ticket 04 overview editing out of scope.
- Extended the Party data seam with an atomic claim operation and Party subscriptions. The in-memory adapter synchronizes local browser clients, while the Supabase adapter subscribes to published Character Slot updates.
- Added the versioned `20260922130000_claim_character_slots.sql` migration with complete-claim constraints, Ability Score and level validation, update metadata, and Realtime publication. Existing membership-based update policies remain unchanged, so a claim identifies responsibility without creating exclusive ownership.
- Reset the local Supabase database and applied both migrations from scratch. `pnpm test:db` passed 40 pgTAP assertions across two files, including Player claims, Dungeon Master edits to a Player claim, outsider denial, unauthenticated denial, validation constraints, and Realtime publication.
- `pnpm test:e2e` passed all 12 laptop and phone checks. Coverage includes incomplete and invalid Ability Scores, Character Page opening, responsive overflow checks, and a separate-browser-context claim update received without reload.
- `pnpm build` passes with the configured GitHub Pages base path. Hosted Supabase was not mutated; the new migration still needs to be applied through the normal hosted deployment path before live smoke testing.
