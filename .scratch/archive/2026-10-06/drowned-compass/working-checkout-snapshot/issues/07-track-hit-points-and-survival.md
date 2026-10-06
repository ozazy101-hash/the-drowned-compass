# 07 — Track Hit Points and survival

**What to build:** A player can manage current, maximum, and optional Temporary Hit Points; apply damage and healing; correct mistakes; and track death saves and Heroic Inspiration while the Party Dashboard reflects survival state.

**Blocked by:** 06 — Read the Party at a glance.

**Status:** ready-for-agent

- [ ] Apply Damage consumes Temporary Hit Points before current Hit Points and never produces negative Hit Points.
- [ ] Heal restores current Hit Points without exceeding the maximum.
- [ ] Current, maximum, and Temporary Hit Points remain directly editable for corrections and table rulings.
- [ ] Temporary Hit Points stay visually quiet when zero and never behave as healing or increase maximum Hit Points.
- [ ] A recent shared Hit Point action can be undone safely without replacing unrelated Character Record changes.
- [ ] Death-save successes, failures, Heroic Inspiration, and unconscious state can be tracked and are visible where relevant on the Party Dashboard.
- [ ] Calculation and browser tests cover damage overflow, healing caps, direct corrections, undo, and downed state.
