# 09 — Manage attacks and actions

**What to build:** A player can maintain the attacks and actions needed during play, designate a primary attack, and surface that concise attack summary on the Party Dashboard.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [ ] The Combat area supports adding, editing, ordering, and removing attacks and actions.
- [ ] An attack can record name, attack bonus or relevant Ability, range, damage, damage type, and player-entered notes.
- [ ] One attack can be designated as primary and appears as a concise summary on the Party Dashboard.
- [ ] Attack and action changes save independently and synchronize without replacing unrelated Combat data.
- [ ] The attack-management journey is operable on phones, laptops, and keyboards.

## Comments

### 2026-09-28 — Implementation and review

Claimed on `codex/ticket-09-attacks-actions` from accepted main `da52f5af1f5520adedb34b8f79813907111fee7a`. [PR #6](https://github.com/ozazy101-hash/the-drowned-compass/pull/6) is a draft while final verification finishes.

Implemented a focused Combat section for independently addressed attacks/actions, player-entered values, Ability reminders, ordering, removal, a separately versioned primary selection and concise dashboard summary. Production/in-memory adapters and the shared Vite transport use conditional record commands. Draft starting versions, request/revision guards, explicit Retry, newest-version merging and removal tombstones preserve accepted shared state. The implementation/release and peer-integration seams are documented in `docs/implementation/attacks-and-actions.md`.

Standards and Spec reviews ran independently through the code-review skill. Their findings were fixed: creation preserves visible Saved feedback, every browser context uses the effective test-server URL, feedback uses typed statuses, and explicit labels preserve accessible naming and the existing field styling. Both reviews now report zero remaining findings.

`pnpm test:calculations`: 131 passed. Production build and `git diff --check` pass. The coordinator deliberately interrupted the final 68-case browser command to serialize shared-host verification: 11 passed, one interrupted and 56 not run (exit 130). The remaining 57 cases are queued through `/tmp/drowned-compass-with-browser-lock.py` with both viewport projects, one worker, port 4209 and a 180000ms whole-test budget; assertion timeouts are unchanged. The temporary port config is untracked. Earlier focused runs exposed wrapping-label selectors and whole-test timeouts; explicit labels corrected the selector issue and the affected phone/concurrency/delay journeys passed afterward. Final browser coverage is pending.

Database checks completed through `/tmp/drowned-compass-with-db-lock.py` against the existing local container using direct `docker exec` psql: 111 baseline/Derived Values assertions and 35 Combat migration assertions passed (146 total). All fixtures rolled back. An additional transaction expanded the actual Combat migration and ran `plpgsql_check_function_tb` for `update_character_combat_entry(uuid,jsonb)`: zero findings, then rollback. Preflight confirmed no peer DDL locks before each rehearsal. The direct runner was used because two `pnpm test:db` attempts timed out connecting through localhost. Earlier rehearsals rolled back after a peer DDL deadlock, temporary TAP parser failure and pgTAP query-format failure; corrected verification completed successfully. No persistent migration was applied.

Ticket 09 stays claimed while review/release is pending. No merge, hosted migration, production Character Record edit or Pages deployment has occurred. Hosted acceptance requires fresh release approval.
