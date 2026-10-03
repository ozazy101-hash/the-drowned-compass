# 08 — Track Conditions with Rules Tooltips

**What to build:** A player can add and remove standard SRD Conditions or character-specific Custom Conditions, while every standard term provides an accessible contextual explanation and the Dungeon Master sees active Conditions on the Party Dashboard.

**Blocked by:** 06 — Read the Party at a glance.

**Status:** claimed

**Agent:** Ticket 08 — isolated `codex/ticket-08-conditions` worktree.

- [x] A searchable selector adds standard SRD Conditions to a Character Record and prevents accidental duplicates.
- [x] A player can add, label, and remove a Custom Condition without promoting it into the standard catalogue.
- [x] Active Conditions appear prominently on the Character Page and Party Dashboard and synchronize across browsers.
- [x] Standard Conditions expose Rules Tooltips through hover, keyboard focus, and mobile tap.
- [x] Linked game terms inside an explanation can open their own explanation without creating a keyboard or touch trap.
- [x] Tooltip tests verify accessible naming, focus return, dismissal, and nested-term interaction.

## Comments

### Implementation — 2026-10-03

- Claimed only Ticket 08 in the isolated managed worktree `ticket-08-conditions`, on `codex/ticket-08-conditions`, starting at remote main `8663b943121b77514b2dc31a662850e98680ae0c` (deep-module guidance included).
- Implemented the compact Conditions command/transition module, independently versioned associations and tombstones, both PartyData adapters, shared test transport, Character Page editing and dashboard Rules References.
- Checked all 15 SRD Condition summaries against the official SRD 5.2.1 PDF. Retained exact licensing attribution and source links; Custom Conditions remain Character-scoped.
- Reusable Rules Tooltip supports hover, focus and tap, nested reference navigation, exact originating-link focus return, dismissal and Tab exit. UI controls match the theme; the standard selector collapses to preserve phone navigation. Custom Condition acknowledgements preserve newer typing.
- Production build passed. All 142 domain/calculation cases passed. All 239 database assertions passed across nine files, including 35 Conditions migration/security/conditional-write checks in rollback-only transactions.
- Initial browser checks found an incorrect heading assertion and a realtime attribute assertion, both corrected. A superseded full run was stopped during refinements; its results are not claimed as final validation. The coordinator requested focused final laptop/phone Conditions/Tooltip/adapter verification and explicitly deferred integrated full-suite verification because the shared browser lane is saturated.
- No hosted migration, deployment or merge is authorized or performed. Status remains claimed pending PR review and later integration/release.

### Final focused verification — 2026-10-03

- `python3 /tmp/drowned-compass-with-browser-lock.py -- pnpm exec playwright test e2e/conditions.spec.ts e2e/conditions-adapters.spec.ts --config playwright.ticket08.config.ts --workers=1` — **22/22 passed**, 54.2 seconds, 11 laptop and 11 phone. Includes search, duplicates, custom naming/removal/reload, same-Character scoped state, keyboard/touch/hover, exact repeated-term focus return, dismissal and Tab exit, two browsers with independent Overview changes, failed save/Retry, pending-save typing, local/shared/Supabase adapter outcomes, RPC errors and realtime reconnect.
- `pnpm test:calculations` — **142/142 passed**, including 11 new Conditions domain cases.
- `python3 /tmp/drowned-compass-with-db-lock.py -- pnpm test:db` — **239/239 assertions passed**, nine files, including 35 rollback-only Conditions checks.
- `pnpm build` and `git diff --check` — passed. Laptop and phone tooltip screenshots visually inspected. Temporary port configuration removed after verification.
- **Pending:** integrated full browser regression, explicitly deferred by the coordinator due to shared lane saturation; PR review, later authorized hosted migration and release. No merge or hosted change performed.

See [implementation and verification record](../../../docs/implementation/conditions-and-rules-tooltips.md).
