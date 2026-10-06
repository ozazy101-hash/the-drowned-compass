# 13 — Preview and resolve rests

**What to build:** A player can preview a Short Rest or Long Rest, review every proposed recovery change, exclude exceptions, and confirm one coherent update across health, resources, spell slots, and death saves.

**Blocked by:** 07 — Track Hit Points and survival; 10 — Track limited resources; 12 — Manage Character Spells and spell slots.

**Status:** ready-for-agent

- [ ] Short Rest proposes restoring only resources tagged for Short Rest.
- [ ] Long Rest proposes restoring Short Rest and Long Rest resources, spell slots, and current Hit Points while clearing Temporary Hit Points and death saves.
- [ ] The preview explains every proposed change before any data is modified.
- [ ] A player can exclude individual changes and confirm only the selected recovery actions.
- [ ] Confirmed rest changes synchronize as one understandable operation and do not replace unrelated Character Record data.
- [ ] Calculation and browser tests cover mixed recovery timings, exclusions, and cancellation.
