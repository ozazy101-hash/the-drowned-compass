# 05 — Calculate and override Derived Values

**What to build:** The Character Page derives the small set of dependable 2024 values from player-entered information while allowing every result to be explicitly overridden and reset.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [x] Ability modifiers and proficiency bonus derive from Ability Scores and total level.
- [x] Saves and skills support none, proficient, and expertise states and display the correct modifiers.
- [x] Passive Perception, initiative, spell attack modifier, and spell save DC derive from their agreed inputs.
- [x] Every Derived Value can be overridden, and an override is visually distinguishable from a calculated result.
- [x] Resetting an override immediately returns the field to its calculated result.
- [x] Table-driven tests cover normal values, negative modifiers, proficiency thresholds, expertise, and overrides.

## Comments

- Claimed on 2026-09-28 in the isolated checkout on `codex/ticket-05-derived-values`, based on `7aeddbe35ea82229936c81ea1db99e828a1c158c`. Hosted migrations, production edits, and merge remain pending fresh release approval.
- Implemented a pure calculation seam for all 35 Derived Values with independent source inputs and overrides. Effective Ability modifiers, proficiency bonus, and Perception feed their dependents; final overrides do not change upstream values or each other. Zero remains an explicit override. Unset spellcasting Ability leaves spell calculations unknown, with independent optional overrides.
- Added responsive, keyboard-operable override controls with visible calculated/override/unsaved states, immediate reset previews, per-field save feedback, and Retry. Existing revision guards and version-aware snapshot merging now include independently versioned override entries.
- Added `20260928200000_calculate_and_override_derived_values.sql`: converts existing saving-throw boolean choices to none/proficient, supports expertise for saves and skills, validates numeric overrides and null resets, and retains membership-based RLS. Pure validator execution is explicitly granted to authenticated and denied to anonymous roles. Tightened skill validation to reject null and boolean states.
- Applied the migration only to the existing local Supabase stack without a reset or new stack. Applied the final skill-validator refinement locally from the same pending migration. `pnpm test:db` passes 111 assertions across five files, including a rollback-only rehearsal of the actual forward migration preserving true/false proficiency choices, per-field versions, claim, and update metadata; local database lint reports no schema errors. Hosted Supabase and production Character Records were not changed.
- `pnpm build` and all 131 table-driven calculation cases pass. `pnpm test:e2e --workers=1` passes 48/48 (24 laptop, 24 phone), including the adapter contract, keyboard activation, legacy data, invalid drafts, immediate reset previews, failure/retry, independent overrides, stale same-field conflicts, older acknowledgements, newer typing, and reconnect coverage.
- Rules and dependency semantics are recorded in [Derived Values implementation notes](../../../docs/implementation/derived-values.md). Formulas and skill mappings were checked against the official SRD 5.2.1; saving-throw expertise is the ticket's table extension. Release requires a coordinated hosted migration/frontend deployment and fresh signed-in acceptance approval.
- Implementation acceptance is verified locally. Status remains `claimed` while the review PR and approved hosted release are pending; the deployed ticket is not yet complete. No merge, hosted migration, production data edit, or Pages deployment was performed.
- Review handoff: [PR #3 — Ticket 05: calculate and override Derived Values](https://github.com/ozazy101-hash/the-drowned-compass/pull/3) is open against `main`. Local implementation is committed and pushed on `codex/ticket-05-derived-values`; approval is still required for merge and hosted release.
