# 21 — Browse the Combat Catalog and create editable Combat entries

**What to build:** Search SRD weapon templates and selected class combat abilities, inspect their rules references, and create editable attacks or Action references in a Character Record using the existing Combat save flow.

**Blocked by:** 09 — Manage attacks and actions; 18 — Feature multiple attacks on the Party Dashboard. Both are merged and deployed.

**Status:** claimed

- [x] Bundle all 38 SRD 5.2.1 weapon-table entries and an explicitly selected set of combat-related class abilities, with stable IDs and official source-page references.
- [x] Search by name and compose type, class, and inclusive class-level filters; explain that these guide selection rather than enforce character eligibility.
- [x] Weapon details show base dice, damage type, range, properties, mastery, and rule-source links. Ability details distinguish attack modifiers, Bonus Actions, Reactions, and other references.
- [x] Choosing a template creates an unsaved, editable draft. Weapon attack bonus remains blank and weapon damage uses base dice only. Class abilities create Action references and execute no effects.
- [x] Save, cancel, retry, shared updates, reload persistence, and featured attacks use the existing Combat flow without replacing unrelated data or drafts.
- [x] Custom attacks/actions remain available. Keyboard, laptop, and phone acceptance covers template selection and persistence.
- [x] Exact SRD attribution and adaptation disclosure remain accessible in About / Legal.

## Comments

### 2026-10-05 — Scope accepted

The user approved the first Combat Catalog proposal after discussing a future character-based calculation layer. This ticket implements the catalog and editable templates only. Automatic attack/damage calculations, proficiency inference, class eligibility enforcement, resource spending, and automatic feature application are deferred. The first catalog includes all weapons and 41 selected core-class abilities across the 12 SRD classes; it does not claim exhaustive class/subclass coverage. Missing material remains player-entered.

### 2026-10-05 — Verified review handoff

Production build/type check and `git diff --check` pass. Domain/calculation suite: 193/193. Focused Combat/catalog/adapter browser suite: 28/28 across laptop and Pixel 7. Final production-build catalog smoke: 4/4 across laptop and phone, including template editing, save/featured/reload, offline inspection and cancellation. Two-session class-reference acceptance confirms shared edits use the existing Combat path and do not execute Health effects.

Browser checks exposed missing precise filter accessible names; explicit labels fixed them before the clean 28-case run. Production visual review exposed dark result-button text on the selected background; scoped button colors corrected it before the final production smoke. The first production smoke attempt used the dev-only `partyTestId` transport and failed setup, so the completed smoke used isolated localStorage browser contexts. No backend/schema changes or hosted Character edits were made. Existing Vite bundle-size warning remains (766.19 kB JS, 194.77 kB gzip). Local review preview: http://127.0.0.1:4422/the-drowned-compass/ . Temporary verification configs, logs, and screenshots are retained in the coordinator workspace under `.scratch/drowned-compass/verification/ticket21/`. Ticket remains claimed until accepted release.
