# 06 — Read the Party at a glance

**What to build:** The Party Dashboard becomes the Dungeon Master's useful six-character overview, presenting core identity and readiness information from real Character Records rather than placeholder cards.

**Blocked by:** 05 — Calculate and override Derived Values.

**Status:** resolved

- [x] Each claimed card shows character and player identity, primary class, subclass, total level, health, Armor Class, and compact Ability modifiers.
- [x] Each card shows Passive Perception and spell save DC when applicable.
- [x] Unclaimed Character Slots remain clearly distinct and available for setup.
- [x] Selecting any claimed card opens its Character Page; returning opens the Party Dashboard.
- [x] Phone cards prioritize identity, health, Armor Class, and critical state, while laptops show the richer summary across six readable cards.
- [x] State is communicated with text, icons, and numbers rather than colour alone.

## Answer

The Party Dashboard is live with six readable Character Slot cards, accepted Character Record summaries, keyboard-openable claimed cards, and honest health labels while current Hit Points remain untracked. The [implementation record](../../../docs/implementation/party-dashboard.md) describes its scope and verification.

## Comments

### Implementation — 2026-09-28

Implemented on `codex/ticket-06-party-dashboard`, starting from accepted main `da52f5af1f5520adedb34b8f79813907111fee7a` after fetching and verifying ancestry. Review PR: https://github.com/ozazy101-hash/the-drowned-compass/pull/5.

Claimed cards now show accepted identity, primary class/subclass/total level, maximum HP, Armor Class, all six effective Ability modifiers, Passive Perception and applicable spell save DC, including explicit zero overrides. Direct overrides have a visible text legend. Unclaimed slots retain setup; native card buttons open every Character Page, and Back returns to the Party Dashboard. Phone cards place identity/health/defences before secondary values, while laptops use three columns and two rows. Long names wrap without horizontal overflow.

Health is deliberately honest: current HP is not recorded on this branch, so the card states “Current HP unknown” alongside the actual maximum. Ticket 07 owns current/temporary HP and health actions. Focused card/CSS files and the read-only `playSummary` prop provide integration seams for Tickets 09/10 without replacing the card layout. See `docs/implementation/party-dashboard.md`.

New concurrency acceptance exposed a released numeric/text editor gap: a remote update could silently rebase an older unsaved draft. The small `EditableInput` guard now remembers the starting field version, like the released Derived Value editor. Its own accepted write or explicit Retry can advance that version; request/revision and snapshot guards remain in place. Acceptance proves failed saves, independent edits, remote same-field conflicts, retained drafts and explicit Retry.

### Verification — 2026-09-28

- `pnpm build` and `git diff --check`: passed.
- `pnpm test:calculations --workers=1`: 131 passed (28.3s); the calculation module is unchanged.
- `pnpm test:e2e --config=playwright.ticket06.local.config.ts e2e/party-summary.spec.ts --workers=1 --timeout=90000`: all four laptop acceptance cases passed. The first phone case exceeded the whole-test budget during setup; the remaining phone cases were deferred to the longer-budget run.
- `pnpm test:e2e --config=playwright.ticket06.local.config.ts e2e/party-summary.spec.ts --project=phone-chromium --workers=1 --timeout=180000`: all four phone acceptance cases passed (7.7m). Assertion timeouts were unchanged. Laptop and phone screenshots were visually inspected.
- `pnpm test:e2e --config=playwright.ticket06.local.config.ts e2e/supabase-party-data.spec.ts --workers=1 --timeout=180000`: all four Supabase adapter contract cases passed (4.4m), covering mapping, independent conditional writes/conflicts, reset and reconnect catch-up at both viewports.
- An earlier full 58-test attempt with `pnpm test:e2e --config=playwright.ticket06.local.config.ts --workers=1 --timeout=90000` was interrupted after five existing laptop cases passed and two existing two-session cases exceeded the whole-test budget; 51 cases did not run. One timeout was at `page.goto` before sign-in. This is not a passing full regression run; rerun it with coordinated browser capacity before integrated release.
- On 2026-10-02, a complete regression run passed 58/58 browser cases across laptop and phone at 180000ms with one worker on isolated port 4206. The previously intermittent Derived Values two-session case was missing a wait for the second browser to receive the first override; its synchronization assertion now confirms that accepted value before the second browser edits it. Both viewport cases and the complete suite passed after this test-only fix. The temporary port config was removed.
- Browser primary/secondary sessions follow the configured base URL and viewport. The shared fixture stubs only external Google Fonts CSS, using the existing local font fallbacks; application requests, assertions and save contracts are unchanged. Font delivery and hosted typography remain outside this local acceptance.
- Standards and Spec reviewers independently reported zero actionable findings, including an incremental review of the browser fixture.

No schema migration or adapter/transport changes were needed. The later release and live acceptance are recorded below.

### Release — 2026-10-02

[PR #5](https://github.com/ozazy101-hash/the-drowned-compass/pull/5) merged as `d01c23dde3ef9e87c4c8751004cef24f3ed99f06`. Ticket 06 had passed its complete 58/58 laptop-and-phone browser run, 131 calculation cases and production build. The dashboard then remained covered by the combined 120/120 browser suite before the Ticket 10 release. The [Pages deployment](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/36977242530) succeeded; signed-in live acceptance showed the claimed Character card, unclaimed slots and the accepted important-resource summary, which persisted after reload. Ticket 06 is resolved.

## Ticket17 prerequisite reconciliation

Core acceptance and deployment were confirmed by the coordinator before Ticket17 began. Accepted release history includes PR #24 (Ticket12), baseline `5c6c52d14a34ca3bf606963e863d705252124504`, and PR #25 (Ticket13), baseline `d66394f6998123486c7dede9466774a16cc3ab4e`. This reconciles the tracker with that trusted release evidence; it does not claim an independent hosted verification or perform a new deployment. See [Ticket17 delivery ledger](../ticket-17-delivery.md).
