# 19 — Simplify Health controls

**What to build:** Replace the busy Hit Points and survival form with a compact Health area for current and maximum Hit Points, direct addition and subtraction, death saves, Heroic Inspiration, and manual Unconscious state.

**Blocked by:** 07 — Track Hit Points and survival.

**Status:** claimed

- [ ] Health shows Current / Max Hit Points clearly and retains a way to set an initially unknown Current value and correct a mistake. Maximum Hit Points remains editable through the existing Character Record field, without duplicate sources of truth.
- [ ] A visible − control subtracts one Current Hit Point per tap and a + control adds one per tap. An amount field allows a larger addition or subtraction. Current never falls below zero or rises above Maximum through these controls.
- [ ] The controls use direct, neutral add/subtract language instead of separate Apply Damage and Heal buttons. The underlying Health module owns arithmetic, validation, synchronization, and conflict handling.
- [ ] Temporary Hit Points are removed from this flow. A hidden Temporary Hit Point value must not absorb a subtraction or otherwise make the visible Current value appear unresponsive. Account for existing saved values and determine any required data migration or compatibility behavior before release; Ticket 07 has been deployed.
- [ ] Death-save successes and failures, Heroic Inspiration, and manual Unconscious controls remain available. Their accepted values continue to appear on the Party card where relevant.
- [ ] The compact layout works with keyboard and touch on laptop and phone. Focused calculation and browser tests cover one-point and entered-amount changes, zero/maximum bounds, initial Current setup, retained survival trackers, reload, and concurrent saves. Preserve relevant existing domain/database coverage and update browser expectations to match the new presentation.

## Comments

### 2026-10-03 — Player testing feedback

The player found the current Hit Points section too complicated. They chose a Health presentation with − / + controls, one point per tap plus an amount field for larger changes. They explicitly removed Temporary Hit Points from this flow and kept death saves, Heroic Inspiration, and manual Unconscious state. This ticket records the agreed scope; no application code changed during this discussion.


### 2026-10-05 — Implementation and focused verification

Implemented compact Health with Current / Max, direct one-point − / +, amount-based Add / Subtract, bounded initial setup/correction, retained death saves, Heroic Inspiration and manual Unconscious. Maximum remains in Character Record. Removed Temporary HP and recent undo from the compact flow and Temporary HP from Party cards. The original acceptance criteria above remain the agreed scope.

Build: `pnpm build` passed. Calculations: `pnpm test:calculations` passed 181/181. Focused browser: `pnpm test:e2e e2e/survival.spec.ts e2e/survival-adapters.spec.ts --workers=1` passed 12/12 in 1.0 minute (6 laptop, 6 phone). This includes keyboard activation, unknown/zero/maximum controls, amount validation, setup/correction, reload, trackers, retry, stale concurrent saves and both adapter contracts. Both screenshots inspected; viewport overflow assertions passed. `git diff --check` passed.

Database: `pnpm test:db` could not connect to localhost:54322 (ECONNREFUSED); no database assertions ran. `pnpm supabase:start` failed because `/Users/oscarpauwels/.docker/run/docker.sock` is missing. Added rollback-only direct RPC assertions for new commands and saved nonzero Temporary HP; execution remains pending coordinator's available local database.

Compatibility: existing Temporary HP and legacy undo snapshots are retained without destructive cleanup; new Health commands always ignore Temporary HP. Legacy deployed client commands remain supported under existing version guards. Forward migration `20261005190000_simplify_health_controls.sql` must be applied before frontend release. No hosted migration, merge or deployment performed. Full combined regression belongs to coordinator. Independent review found no blocking arithmetic/module issues; reviewable pending integration and database verification.
