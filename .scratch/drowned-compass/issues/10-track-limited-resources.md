# 10 — Track limited resources

**What to build:** A player can create and use limited resources with current, maximum, and recovery timing values, and designate the most important resource for the Party Dashboard.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** resolved

- [x] The Combat area supports adding, editing, ordering, spending, restoring, and removing limited resources.
- [x] Every resource records current, maximum, and Short Rest, Long Rest, Dawn, or Manual recovery timing.
- [x] Current values remain within valid bounds while allowing direct correction.
- [x] One resource can be designated as important and appears on the Party Dashboard.
- [x] Resource changes save independently, synchronize across browsers, and expose clear save failures.

## Answer

Limited resources are live in Combat. Players can track bounded uses and recovery timing, designate one important resource for the Party Dashboard, and save independent versioned records with visible conflict recovery. See [the implementation record](../../../docs/implementation/limited-resources.md).

## Implementation notes

- Claimed 2026-09-28 on `codex/ticket-10-limited-resources`, based on fetched `origin/main`; accepted commit `da52f5af1f5520adedb34b8f79813907111fee7a` verified as an ancestor.
- Implemented independent limited-resource records, composable Combat controls, four recovery timings, direct bounded correction, conditional spend/restore, ordering, importance handoff and dashboard summary. Both adapters and shared test transport implement the same record contract.
- Versioned tombstones and snapshot merging protect against delayed updates; resource drafts retain their starting version and newer typing through older acknowledgements. Failed/conflicting writes show Retry; remote removal permits copying/discarding a dirty draft.
- Local acceptance is verified: all 68 browser cases passed across the preserved 14 laptop cases and the shared-lane 54-case completion run. The strengthened actual-migration fixture passed 25 database assertions and rolled back. Production build and diff whitespace checks passed. The standard database runner could not connect through the host; in-container SQL supplied the new migration/security verification. No persistent or hosted migration has been applied.
- Integration and release details: `docs/implementation/limited-resources.md`. Status stays claimed while review/release is pending.
- On 2026-10-02, merged accepted `main` (Ticket 09 attacks/actions and Ticket 06 Party Dashboard) into this branch. Combat now composes both sections; the dashboard card shows both the primary attack and important resource. Supabase reads/subscribes to both collections, and all localStorage Party writers share one Web Lock. The full integrated browser suite passed 96/96 (48 laptop, 48 phone); `pnpm test:calculations` passed 131/131 and the production build passed. The additional three-way cross-tab write race passed in both viewports. Ticket 16 remains an open peer PR and was not imported.
- Retried `pnpm test:db` under the shared database lock and with the required sandbox access. It timed out connecting to `127.0.0.1` because Docker Desktop reports its engine manually paused. The previous 25/25 rollback-only migration rehearsal remains valid for Ticket 10 alone; the combined migration suite is pending a resumed local engine. No database reset or persistent migration occurred.
- Docker resumed on 2026-10-02. The standard shared-lock `pnpm test:db` run passed 171/171 across seven files with accepted Tickets 09 and 06. After Ticket 16 merged into `main`, this branch integrated its Features and Story work; the combined rollback-only suite passed 204/204 across eight files. The full combined browser suite passed 120/120 (60 laptop, 60 phone), including a cross-feature resource, action, Feature and Story persistence journey. The production build and 131 calculation cases pass. Temporary browser configuration was removed. Ticket 10's hosted migration and release remain pending separate approval.
- The linked hosted dry run with `--include-all --skip-vault` selected only `20260928221000_track_limited_resources.sql` (no seeds or roles). `--include-all` is needed because Ticket 16's later-numbered migration has already shipped. This was a dry run; Ticket 10 remains unapplied to the hosted database.

## Verification and review

- Browser command: `python3 /tmp/drowned-compass-with-browser-lock.py -- pnpm exec playwright test --config playwright.ticket10.config.ts --workers=1 --timeout=300000` — 54 passed (16.8 minutes). The task-local config resumed the remaining cases after the coordinator requested cancellation; it excluded only the 14 completed laptop checks from the interrupted full run and retained the complete phone project. All 68 distinct cases are verified (34 laptop, 34 phone), including 18 new resource cases. Assertion timeouts were unchanged; port 4210 and `reuseExistingServer=false` were used. Temporary port/resume settings are excluded from the PR.
- Database command: `python3 /tmp/drowned-compass-with-db-lock.py -- zsh -c 'docker exec -i supabase_db_the-drowned-compass psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < /tmp/ticket10-resource-rehearsal.sql'` — all 25 assertions passed, `ROLLBACK` and lane release confirmed. The generated SQL embeds the actual migration and the fixture, with a transaction-local five-second lock timeout. It seeds a known claim, zero override, and nonzero versions before migration.
- Earlier unwrapped/browser runs included budget/reload failures and were superseded; the full interrupted run had one obsolete Combat-disabled assertion (corrected) and one coordinator-requested interruption. Neither is counted as a passing case.
- `pnpm test:db` twice failed with a host connection termination; the existing 111 assertions were not rerun successfully via that runner. Initial in-container rehearsal attempts exposed shared-transaction contention and a missing session search path; both were resolved before the final wrapped 25/25 run.
- Independent code-review Standards and Spec re-reviews report no remaining findings after fixing action Retry intent, serializing all localStorage Party mutations, and typing save feedback.
- Hosted migration, Pages release, and live acceptance completed on 2026-10-02; see the release record below. Peer integration is documented in `docs/implementation/limited-resources.md`.

## Review PR

[PR #8 — Track limited resources in Combat](https://github.com/ozazy101-hash/the-drowned-compass/pull/8) merged into `main` as `9941e382a5564e177c1f9109c0bac99bf780935d`, integrating accepted Tickets 09, 06 and 16.

## Comments

2026-10-02 release: The user authorized merging Ticket 10 after the combined 204/204 database assertions, 120/120 browser cases, 131/131 calculation cases and production build passed. A fresh hosted dry run selected only `20260928221000_track_limited_resources.sql` (no seeds or roles). That migration was applied with `--include-all --skip-vault`; the postflight migration list matches locally and remotely. PR #8 merged, and the [Pages run](https://github.com/ozazy101-hash/the-drowned-compass/actions/runs/36977242530) succeeded. In a signed-in session on the existing Ticket 04 test character, a temporary resource was saved, marked important, spent from 2/2 to 1/2, shown on the Party card and verified after reload. It was then removed; the Party card cleared after reload. Ticket 10 is resolved.
