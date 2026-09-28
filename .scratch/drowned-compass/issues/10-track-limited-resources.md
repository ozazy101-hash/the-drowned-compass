# 10 — Track limited resources

**What to build:** A player can create and use limited resources with current, maximum, and recovery timing values, and designate the most important resource for the Party Dashboard.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [x] The Combat area supports adding, editing, ordering, spending, restoring, and removing limited resources.
- [x] Every resource records current, maximum, and Short Rest, Long Rest, Dawn, or Manual recovery timing.
- [x] Current values remain within valid bounds while allowing direct correction.
- [x] One resource can be designated as important and appears on the Party Dashboard.
- [x] Resource changes save independently, synchronize across browsers, and expose clear save failures.

## Implementation notes

- Claimed 2026-09-28 on `codex/ticket-10-limited-resources`, based on fetched `origin/main`; accepted commit `da52f5af1f5520adedb34b8f79813907111fee7a` verified as an ancestor.
- Implemented independent limited-resource records, composable Combat controls, four recovery timings, direct bounded correction, conditional spend/restore, ordering, importance handoff and dashboard summary. Both adapters and shared test transport implement the same record contract.
- Versioned tombstones and snapshot merging protect against delayed updates; resource drafts retain their starting version and newer typing through older acknowledgements. Failed/conflicting writes show Retry; remote removal permits copying/discarding a dirty draft.
- Local acceptance is verified: all 68 browser cases passed across the preserved 14 laptop cases and the shared-lane 54-case completion run. The strengthened actual-migration fixture passed 25 database assertions and rolled back. Production build and diff whitespace checks passed. The standard database runner could not connect through the host; in-container SQL supplied the new migration/security verification. No persistent or hosted migration has been applied.
- Integration and release details: `docs/implementation/limited-resources.md`. Status stays claimed while review/release is pending.

## Verification and review

- Browser command: `python3 /tmp/drowned-compass-with-browser-lock.py -- pnpm exec playwright test --config playwright.ticket10.config.ts --workers=1 --timeout=300000` — 54 passed (16.8 minutes). The task-local config resumed the remaining cases after the coordinator requested cancellation; it excluded only the 14 completed laptop checks from the interrupted full run and retained the complete phone project. All 68 distinct cases are verified (34 laptop, 34 phone), including 18 new resource cases. Assertion timeouts were unchanged; port 4210 and `reuseExistingServer=false` were used. Temporary port/resume settings are excluded from the PR.
- Database command: `python3 /tmp/drowned-compass-with-db-lock.py -- zsh -c 'docker exec -i supabase_db_the-drowned-compass psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < /tmp/ticket10-resource-rehearsal.sql'` — all 25 assertions passed, `ROLLBACK` and lane release confirmed. The generated SQL embeds the actual migration and the fixture, with a transaction-local five-second lock timeout. It seeds a known claim, zero override, and nonzero versions before migration.
- Earlier unwrapped/browser runs included budget/reload failures and were superseded; the full interrupted run had one obsolete Combat-disabled assertion (corrected) and one coordinator-requested interruption. Neither is counted as a passing case.
- `pnpm test:db` twice failed with a host connection termination; the existing 111 assertions were not rerun successfully via that runner. Initial in-container rehearsal attempts exposed shared-transaction contention and a missing session search path; both were resolved before the final wrapped 25/25 run.
- Independent code-review Standards and Spec re-reviews report no remaining findings after fixing action Retry intent, serializing all localStorage Party mutations, and typing save feedback.
- Hosted migration, release, and live acceptance remain pending fresh Ticket 10 approval; ticket remains claimed. Peer integration is documented in `docs/implementation/limited-resources.md`.

## Review PR

[PR #8 — Track limited resources in Combat](https://github.com/ozazy101-hash/the-drowned-compass/pull/8) is open against `main` from `codex/ticket-10-limited-resources` and attached to this task. Hosted migration/release remain pending approval. No peer changes were imported, and the shared verification lanes were released after the final commands exited.
