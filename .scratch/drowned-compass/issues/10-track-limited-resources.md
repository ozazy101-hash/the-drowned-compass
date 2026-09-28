# 10 — Track limited resources

**What to build:** A player can create and use limited resources with current, maximum, and recovery timing values, and designate the most important resource for the Party Dashboard.

**Blocked by:** 04 — Edit and synchronize the Character Overview.

**Status:** claimed

- [ ] The Combat area supports adding, editing, ordering, spending, restoring, and removing limited resources.
- [ ] Every resource records current, maximum, and Short Rest, Long Rest, Dawn, or Manual recovery timing.
- [ ] Current values remain within valid bounds while allowing direct correction.
- [ ] One resource can be designated as important and appears on the Party Dashboard.
- [ ] Resource changes save independently, synchronize across browsers, and expose clear save failures.

## Implementation notes

- Claimed 2026-09-28 on `codex/ticket-10-limited-resources`, based on fetched `origin/main`; accepted commit `da52f5af1f5520adedb34b8f79813907111fee7a` verified as an ancestor.
- Implemented independent limited-resource records, composable Combat controls, four recovery timings, direct bounded correction, conditional spend/restore, ordering, importance handoff and dashboard summary. Both adapters and shared test transport implement the same record contract.
- Versioned tombstones and snapshot merging protect against delayed updates; resource drafts retain their starting version and newer typing through older acknowledgements. Failed/conflicting writes show Retry; remote removal permits copying/discarding a dirty draft.
- Production build passes. Browser and rollback-only migration/security verification are in progress. Shared local PostgreSQL host connectivity fails; an in-container rehearsal rolled back after a concurrent transaction caused a deadlock. No persistent or hosted migration has been applied.
- Integration and release details: `docs/implementation/limited-resources.md`. Status stays claimed while review/release is pending.
