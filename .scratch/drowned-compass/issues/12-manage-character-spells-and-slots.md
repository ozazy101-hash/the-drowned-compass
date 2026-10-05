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
- Build/typecheck passed; domain/calculation suite **221 passed** (28 new Magic cases); rollback-only local database suite **470 assertions across 14 files passed** (58 new Magic assertions). Existing featured-attacks and Health rehearsal substitutions remain intact.
- Focused browser run **50 passed**: 25 laptop and 25 Pixel 7, two workers, strict dev port 4432. Covers Magic UI/three adapter modes, catalogue and Custom Spell CRUD, availability/source/notes, class warning/multiclass guidance, manual slot bounds/correction/spend/restore, failures/removal retry, independent sessions, stale same-record drafts, remote deletion, rebased delta retry, pending acknowledgement, Combat preservation, complete rules/source links and pointer/keyboard/touch Rules Tooltips.
- Three updated legacy adapter fixture files passed **26 additional checks**; their new Magic reads now return an empty Magic record set instead of unrelated Character Slot rows.
- Earlier failures were fixed: accessible availability naming; Light/Lightning test selection ambiguity; a true passive-effect draft-reset race after Saved (both editor reconciliations now run before paint keyed by record version). One earlier run was invalidated by mid-run Vite HMR from concurrent edits; the final passing run had no source edits during execution.

Release order after human approval: apply `20261005200000_manage_character_magic.sql` after all deployed prerequisites, then merge/build/deploy the matching application, then run hosted smoke. No hosted migration, merge, deployment or live Character edits have occurred. Local production preview and exact independent reviewed head are coordinator deliverables.

### Independent review fixes and final local verification

- Addressed the Standards P2: database name/source normalization now matches JavaScript `trim()` for the complete ECMAScript whitespace set, including NBSP and BOM. New domain and direct-RPC rollback cases reject NBSP-only names and granted sources and verify surrounding Unicode whitespace normalization.
- Magic control styles exclude inline Rules Tooltip triggers. Scoped Spell Catalog dark button/focus styles preserve selected highlighting and avoid broad application styling.
- After the review fix: build/typecheck passed, **221 domain tests passed**, and **470 rollback-only database assertions passed**. The **40 affected browser checks passed** (Magic UI/adapters, Spell Catalog and Rules Tooltips); after the catalog control theme change, **18 Magic UI/catalog checks passed** again. These reruns overlap the original browser matrix: **76 distinct browser checks passed overall, 38 laptop and 38 Pixel 7**, not a sum of repeat runs.
- No remaining local verification blockers. Independent final-head re-review, PR publication and the production-preview handoff remain with the coordinator. Hosted migration, PR merge, deployment and hosted smoke have not run.

### Standards follow-up — SQL vertical-tab escape

Replaced SQL `\v` trim-set escapes with explicit `\u000b`. Added domain U+000B and direct-RPC `chr(11)` regression cases verifying that actual vertical tabs are trimmed while ordinary leading/trailing lowercase `v` remains intact (`vRev`, `vWavev`). Build/typecheck passed again; **221 domain tests passed** and **470 rollback-only database assertions passed**. No rendered UI code changed in this follow-up; the previously passing 76 distinct browser cases remain the browser matrix. Final exact-head Standards re-review remains pending.

Coordinator production smoke: **2/2 passed**, one laptop and one Pixel 7, against the refreshed `6d0de5f` production preview on port 4434 using fresh localStorage contexts with no `partyTestId`. Catalog association, slot spending, reload persistence and no horizontal overflow passed; coordinator inspected production UI screenshots. The subsequent SQL escape/test-only fix leaves the production bundle unchanged. This is local production smoke; hosted smoke and release remain pending.
