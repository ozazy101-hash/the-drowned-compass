# 19 — Simplify Health controls

**What to build:** Replace the busy Hit Points and survival form with a compact Health area for current and maximum Hit Points, direct addition and subtraction, death saves, Heroic Inspiration, and manual Unconscious state.

**Blocked by:** 07 — Track Hit Points and survival.

**Status:** ready-for-agent

- [ ] Health shows Current / Max Hit Points clearly and retains a way to set an initially unknown Current value and correct a mistake. Maximum Hit Points remains editable through the existing Character Record field, without duplicate sources of truth.
- [ ] A visible − control subtracts one Current Hit Point per tap and a + control adds one per tap. An amount field allows a larger addition or subtraction. Current never falls below zero or rises above Maximum through these controls.
- [ ] The controls use direct, neutral add/subtract language instead of separate Apply Damage and Heal buttons. The underlying Health module owns arithmetic, validation, synchronization, and conflict handling.
- [ ] Temporary Hit Points are removed from this flow. A hidden Temporary Hit Point value must not absorb a subtraction or otherwise make the visible Current value appear unresponsive. Account for existing saved values and determine any required data migration or compatibility behavior before release; Ticket 07 has been deployed.
- [ ] Death-save successes and failures, Heroic Inspiration, and manual Unconscious controls remain available. Their accepted values continue to appear on the Party card where relevant.
- [ ] The compact layout works with keyboard and touch on laptop and phone. Focused calculation and browser tests cover one-point and entered-amount changes, zero/maximum bounds, initial Current setup, retained survival trackers, reload, and concurrent saves. Preserve relevant existing domain/database coverage and update browser expectations to match the new presentation.

## Comments

### 2026-10-03 — Player testing feedback

The player found the current Hit Points section too complicated. They chose a Health presentation with − / + controls, one point per tap plus an amount field for larger changes. They explicitly removed Temporary Hit Points from this flow and kept death saves, Heroic Inspiration, and manual Unconscious state. This ticket records the agreed scope; no application code changed during this discussion.
