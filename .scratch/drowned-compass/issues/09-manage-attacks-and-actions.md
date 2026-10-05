# 09 — Manage attacks and actions

**What to build:** A player can maintain the attacks and actions needed during play, designate a primary attack, and surface that concise attack summary on the Party Dashboard.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** resolved

- [x] The Combat area supports adding, editing, ordering, and removing attacks and actions.
- [x] An attack can record name, attack bonus or relevant Ability, range, damage, damage type, and player-entered notes.
- [x] One attack can be designated as primary and appears as a concise summary on the Party Dashboard.
- [x] Attack and action changes save independently and synchronize without replacing unrelated Combat data.
- [x] The attack-management journey is operable on phones, laptops, and keyboards.

## Comments

### 2026-09-28 — Implementation and review

Claimed on `codex/ticket-09-attacks-actions` from accepted main `da52f5af1f5520adedb34b8f79813907111fee7a`. [PR #6](https://github.com/ozazy101-hash/the-drowned-compass/pull/6) is a draft while final verification finishes.

Implemented a focused Combat section for independently addressed attacks/actions, player-entered values, Ability reminders, ordering, removal, a separately versioned primary selection and concise dashboard summary. Production/in-memory adapters and the shared Vite transport use conditional record commands. Draft starting versions, request/revision guards, explicit Retry, newest-version merging and removal tombstones preserve accepted shared state. The implementation/release and peer-integration seams are documented in `docs/implementation/attacks-and-actions.md`.

Standards and Spec reviews ran independently through the code-review skill. Their findings were fixed: creation preserves visible Saved feedback, every browser context uses the effective test-server URL, feedback uses typed statuses, and explicit labels preserve accessible naming and the existing field styling. Both reviews now report zero remaining findings.

`pnpm test:calculations`: 131 passed. Production build and `git diff --check` pass. The coordinator deliberately interrupted the final 68-case browser command to serialize shared-host verification: 11 passed, one interrupted and 56 not run (exit 130). The remaining 57 cases are queued through `/tmp/drowned-compass-with-browser-lock.py` with both viewport projects, one worker, port 4209 and a 180000ms whole-test budget; assertion timeouts are unchanged. The temporary port config is untracked. Earlier focused runs exposed wrapping-label selectors and whole-test timeouts; explicit labels corrected the selector issue and the affected phone/concurrency/delay journeys passed afterward. Final browser coverage is pending.

Database checks completed through `/tmp/drowned-compass-with-db-lock.py` against the existing local container using direct `docker exec` psql: 111 baseline/Derived Values assertions and 35 Combat migration assertions passed (146 total). All fixtures rolled back. An additional transaction expanded the actual Combat migration and ran `plpgsql_check_function_tb` for `update_character_combat_entry(uuid,jsonb)`: zero findings, then rollback. Preflight confirmed no peer DDL locks before each rehearsal. The direct runner was used because two `pnpm test:db` attempts timed out connecting through localhost. Earlier rehearsals rolled back after a peer DDL deadlock, temporary TAP parser failure and pgTAP query-format failure; corrected verification completed successfully. No persistent migration was applied.

Ticket 09 stays claimed while review/release is pending. No merge, hosted migration, production Character Record edit or Pages deployment has occurred. Hosted acceptance requires fresh release approval.

### 2026-09-29 — Final browser regression fix

The serialized remainder run completed 56 cases successfully and failed one laptop two-session case. A targeted three-run replay reproduced the failure once: its request trace showed old notes in the submitted payload after new notes were typed. The editor's passive clean hydration effect depended on fresh snapshot object identities and could overwrite typing before Save. Clean editors now display the accepted record directly, and first edits copy it into a local draft with the starting version. Ability selection and manual bonus clearing occur in one patch. Existing request/revision, conflict/Retry, creation Saved and remote-removal protections remain intact.

The corrected production build passes. Standards and Spec delta reviews report zero remaining findings. Targeted replay and final browser results are pending.

### 2026-09-29 — Verified review handoff

All five implementation criteria are verified locally. The final complete browser command passed **68 tests in 3.5 minutes**, exit 0, on laptop and phone Chromium with keyboard journeys. Playwright arguments were `test --config=playwright.ticket09.config.ts --workers=1 --timeout=180000`; execution used the shared browser-lock wrapper and a pinned arm64 pnpm/Vite runtime on port 4209. Assertion timeouts were unchanged. The temporary config and diagnostic specs were removed afterward.

The Combat hydration-race replay passed 3/3 after the fix. A subsequent full suite passed 67 cases and exposed a setup race in the existing Derived Values stale-draft test: the peer could edit before receiving the first accepted override. A controlled delayed snapshot reproduced a correctly rejected version-0 write. The test now waits for the peer's accepted +0 before creating the stale draft; both delayed-snapshot viewport probes passed, followed by the final 68/68 suite above. No Derived Values production behavior changed.

Final verification totals: production build/type-check passed; `git diff --check` passed; 131 calculation tests passed; 146 rollback-only database assertions passed (111 baseline/Derived Values +35 Combat); new RPC database lint returned zero findings. Every database fixture/lint transaction rolled back. Standards and Spec reviews have zero remaining findings, including the draft-race correction and test setup check.

[PR #6](https://github.com/ozazy101-hash/the-drowned-compass/pull/6) carries the review branch `codex/ticket-09-attacks-actions` and is attached to this task. Ticket 09 remains **claimed** until accepted release. Coordinating peer integration for Tickets 06/10 and hosted persistence/synchronization acceptance remain pending. Release requires approval, hosted migration `20260928220900_manage_attacks_and_actions.sql`, the reviewed frontend deployment and hosted checks. No merge, production Character Record edit, persistent local migration or hosted deployment occurred.

### 2026-10-02 — Hosted release acceptance

The user approved the Ticket 09 release and explicitly approved merging [PR #6](https://github.com/ozazy101-hash/the-drowned-compass/pull/6) into `main` with a merge commit. The exact reviewed migration `20260928220900_manage_attacks_and_actions.sql` (SHA-256 `7f83087223fbe610c87a399fa03059234b4f904320f04e425809649509100217`) was applied to hosted Supabase project `qjiqnzujsuqoqaausrgy` in one SQL Editor transaction and recorded in `supabase_migrations.schema_migrations` with its full source. Preflight found six Character Slots and no Combat tables or migration record. Postflight found six primary rows, zero active Combat entries, authenticated SELECT/RPC grants, anonymous denial, RLS enabled and both tables in Realtime.

PR #6 merged at `d9033ed382044549bb83f2302d5aef88848d5b72`. [GitHub Pages deployment](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/36940572192) completed successfully. Signed-in Dungeon Master and Player sessions used only the labelled Ticket 04 Test Character: an attack with a manual +0 bonus saved and appeared as the dashboard primary summary; the Player added an independent action, and both sessions saw the accepted records. The Player saved a same-attack edit while the Dungeon Master held a dirty draft. The Dungeon Master's stale save showed a conflict and kept its draft; explicit Retry saved it and the Player session converged. Move Up reordered the action. Both temporary records were removed, clearing the primary selection atomically. After refresh, Combat was empty and the dashboard had no primary summary. A hosted database check found zero active entries, two expected removal tombstones, zero selected primary attacks and the original single claimed Character Slot.

Ticket 09 is resolved. Tickets 06 and 10 remain separate review branches with shared-file merge conflicts to resolve during their integration; neither was included in this release.

## Answer

Players can independently save and synchronize attacks and actions, choose a primary attack, and see its concise Party Dashboard summary in the deployed app. Local verification, Standards/Spec review, hosted migration, GitHub Pages deployment, and signed-in two-session acceptance are complete. This is a shared tabletop reference, not a fight simulator.

## Ticket17 prerequisite reconciliation

Core acceptance and deployment were confirmed by the coordinator before Ticket17 began. Accepted release history includes PR #24 (Ticket12), baseline `5c6c52d14a34ca3bf606963e863d705252124504`, and PR #25 (Ticket13), baseline `d66394f6998123486c7dede9466774a16cc3ab4e`. This reconciles the tracker with that trusted release evidence; it does not claim an independent hosted verification or perform a new deployment. See [Ticket17 delivery ledger](../ticket-17-delivery.md).
