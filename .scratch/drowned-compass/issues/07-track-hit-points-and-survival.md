# 07 — Track Hit Points and survival

**What to build:** A player can manage current, maximum, and optional Temporary Hit Points; apply damage and healing; correct mistakes; and track death saves and Heroic Inspiration while the Party Dashboard reflects survival state.

**Blocked by:** 06 — Read the Party at a glance.

**Status:** claimed

- [x] Apply Damage consumes Temporary Hit Points before current Hit Points and never produces negative Hit Points.
- [x] Heal restores current Hit Points without exceeding the maximum.
- [x] Current, maximum, and Temporary Hit Points remain directly editable for corrections and table rulings.
- [x] Temporary Hit Points stay visually quiet when zero and never behave as healing or increase maximum Hit Points.
- [x] A recent shared Hit Point action can be undone safely without replacing unrelated Character Record changes.
- [x] Death-save successes, failures, Heroic Inspiration, and unconscious state can be tracked and are visible where relevant on the Party Dashboard.
- [x] Calculation and browser tests cover damage overflow, healing caps, direct corrections, undo, and downed state.

## Comments

Claimed Ticket 07 in isolated managed worktree from remote main 8663b94. Survival commands, conditional health undo, and focused survival controls will use PartyData.

Implemented survival commands and persistence in `92e2091`, and Character Page/Party Dashboard UI in `60ff8b2`. Production build and 146 calculation tests pass. The database suite passes all 239 assertions across nine rollback-only fixtures; optional PL/pgSQL lint reports zero findings. Initial full browser regression passed 132/132 across laptop and phone. After touch-target/layout and validation refinements, all 14 focused survival/adapter cases passed; final 134-case full regression is queued behind the shared browser lock. No hosted migration, merge, or deployment performed.

Coordinator requested cancellation of the still-queued final full run on 2026-10-03 because the shared browser lane is saturated. It was cancelled before acquiring the lane or launching a browser; no final integrated full-suite case ran. The reviewable PR therefore carries explicit pending final integrated full-suite verification, backed by the completed 132/132 full run (6.5 minutes) before final styling/validation polish and 14/14 final focused cases (42 seconds). The ticket remains claimed pending integration review. Laptop and phone screenshots were inspected and neither viewport overflowed. Final build, 146 calculations, 239 database assertions, and zero SQL lint findings remain green.

Reviewable PR: [#14 — Track shared Hit Points and survival with safe undo](https://github.com/ozazy101-hash/the-drowned-compass/pull/14). Integration review and the final integrated full-browser gate remain pending; hosted migration and deployment require later authorization.
