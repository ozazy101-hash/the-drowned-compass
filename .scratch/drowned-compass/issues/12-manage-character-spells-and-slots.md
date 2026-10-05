# 12 — Manage Character Spells and spell slots

**What to build:** A player can add catalogue or Custom Spells to a Character Record, describe how each is available, and track manually configured spell slots during play.

**Blocked by:** 11 — Browse the SRD Spell Catalog.

**Status:** claimed

- [x] Selecting a Spell Catalog entry adds it to the Character Record without copying catalogue rules text into character-owned data.
- [x] Class filters guide selection and an unusual class choice produces a warning rather than a block.
- [x] Character Spells support Known, Prepared, Always Prepared, and item- or feature-granted states plus player notes.
- [x] A player can create, edit, and remove a character-scoped Custom Spell when the catalogue lacks one.
- [x] A player can enter maximum spell slots by level and spend, restore, or directly correct remaining slots.
- [x] Character Spell and spell-slot changes save independently and synchronize across browsers.

## Implementation evidence — 5 October 2026

Implemented in isolated branch `codex/ticket-12-character-spells` from main `e3dfe433f0a07a6a609d3206ba8e64bb99a20935`. Independent Standards/Spec review remains pending; this ticket remains claimed until the coordinator completes that loop.

- `CharacterMagic` exposes `updateMagic` commands for individually versioned spell associations/Custom Spells and spell-slot levels. Catalog associations store the pinned catalog ID, availability, source and notes; complete rules remain in the bundled catalog. Custom Spells remain scoped to a Character Record.
- Known, Prepared, Always Prepared, Item granted and Feature granted have explicit manual semantics. Guidance considers all active Character classes and warns without blocking. Slots are manually configured; counts never derive from class levels.
- CAS writes, retained tombstones and version-aware snapshot merging protect independent records, stale drafts and removals. Stale spend/restore retry explicitly reapplies its delta to reviewed accepted state; absolute corrections offer explicit replacement. Both adapters and Vite test transport use the same command seam.
- Build/typecheck passed; domain/calculation suite **217 passed** (24 new Magic cases); rollback-only local database suite **462 assertions across 14 files passed** (50 new Magic assertions). Existing featured-attacks and Health rehearsal substitutions remain intact.
- Focused browser run **50 passed**: 25 laptop and 25 Pixel 7, two workers, strict dev port 4432. Covers Magic UI/three adapter modes, catalogue and Custom Spell CRUD, availability/source/notes, class warning/multiclass guidance, manual slot bounds/correction/spend/restore, failures/removal retry, independent sessions, stale same-record drafts, remote deletion, rebased delta retry, pending acknowledgement, Combat preservation, complete rules/source links and pointer/keyboard/touch Rules Tooltips.
- Three updated legacy adapter fixture files have **26 checks pending**; their new Magic reads now return an empty Magic record set instead of unrelated Character Slot rows.
- Earlier failures were fixed: accessible availability naming; Light/Lightning test selection ambiguity; a true passive-effect draft-reset race after Saved (both editor reconciliations now run before paint keyed by record version). One earlier run was invalidated by mid-run Vite HMR from concurrent edits; the final passing run had no source edits during execution.

Release order after human approval: apply `20261005200000_manage_character_magic.sql` after all deployed prerequisites, then merge/build/deploy the matching application, then run hosted smoke. No hosted migration, merge, deployment or live Character edits have occurred. Local production preview and exact independent reviewed head are coordinator deliverables.
