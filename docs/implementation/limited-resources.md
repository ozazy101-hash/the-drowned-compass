# Limited resources (Ticket 10)

Combat contains the composable `CombatResources` section. Each resource records its name, current and maximum uses, recovery timing (Short Rest, Long Rest, Dawn, Manual), order, and optional dashboard importance. Current and maximum accept whole numbers including zero, with 0 ≤ current ≤ maximum ≤ 9999. Spend and restore change one use; direct correction permits changing both values together. Recovery timing is data for later rest proposals; this ticket applies no automatic rest actions.

`src/domain/limited-resources.ts` defines the record, validation, visible ordering, important-resource selection, and version-aware merging. `CharacterRecord.limitedResources` defaults to an empty collection. Each independently addressable record has its own conditional version. Edits retain the version at which typing began. An accepted remote edit cannot silently rebase a local draft; conflicts retain it until explicit Retry adopts the latest accepted record version. Older save acknowledgements preserve newer typing. Deleted records remain versioned tombstones so delayed snapshots cannot resurrect them. A remote removal leaves a dirty editor available to copy or discard its unsaved details.

The production table is membership-protected and read-only to browser roles outside the RPC. `write_limited_resource` locks the resource identity and Character Slot, checks Party membership and claim, checks the expected resource version, and writes only that resource. Important-resource handoff clears the previous designation and increments that record's version atomically. The unique partial index permits at most one important live resource per Character Slot. Spend/restore use the same conditional record writes: competing actions fail visibly rather than losing a use. Explicit action Retry reapplies its delta or focused patch to the latest accepted record; it never repeats an old absolute snapshot. Direct correction Retry retains the explicit draft. All localStorage Party mutations use the shared `drowned-compass-party-write` Web Lock for the same cross-tab contract; the shared Vite test transport serializes writes on the server.

## Integration seams

- Ticket 09 can add its attacks/actions component alongside `CombatResources` inside the Combat container. Navigation is a minimal additive activation of Overview and Combat; both section trees remain mounted to preserve drafts while switching sections.
- Ticket 06 can place `ImportantResourceSummary` in its dashboard layout or call `importantResource` for the record. The current dashboard uses the small summary span inside the existing selectable character card.
- Ticket 13 can select visible records by `recovery`, read `current`/`maximum`, and carry each record version into confirmed writes. Dawn and Manual remain separate timings. No rest preview or rest action ships here.
- Peer adapters must use the same `drowned-compass-party-write` Web Lock for every localStorage read/modify/store mutation, including new repeatable records. Different locks cannot protect a shared Party document.
- Party snapshots and acknowledgements must retain `mergeResources` alongside the existing Overview field-version merging. Supabase subscribes to resource INSERT/UPDATE events and reloads on reconnect.

## Local verification and release

The database runner expands the actual new migration into a rollback-only fixture. Tests assert existing slot/claim/data/version preservation, member access, explicit RPC grants, anonymous/non-member denial, bounds, independent records, conflicts, importance handoff, ordering, recovery timing and tombstones. No persistent local or hosted migration is needed for rehearsals.

Migration `20260928221000_track_limited_resources.sql` is additive. Deploy it before the new frontend reads `limited_resources`. Hosted migration, frontend release and live acceptance remain pending explicit approval for Ticket 10. The implementation does not modify hosted Character Records.

### Verified results

All 68 distinct browser cases passed (34 laptop, 34 phone): 14 laptop regressions completed before the coordinator requested cancellation, then the remaining 54 passed under the shared browser lock in 16.8 minutes. The temporary resume config omitted only completed laptop cases; both viewport projects and port 4210 were retained. The 18 new resource cases cover UI, keyboard use, persistence, bounds, ordering, recovery, importance, independent/same-record edits, action Retry, failures, typing/snapshot guards, adapter contracts, and cross-tab localStorage parity. Both layout screenshots were inspected; neither viewport overflowed horizontally. A final wording-only edit removed implementation terminology from the product explanation.

The actual migration plus strengthened fixture passed all 25 pgTAP assertions under the shared database lock and finished with `ROLLBACK`. The fixture establishes a known claim and nonzero Overview versions before capturing the preservation snapshot. The standard `pnpm test:db` host connection terminated twice, so the old 111-case baseline was not rerun successfully through that runner; only the new 25 assertions are claimed here. No persistent schema change was needed. Exact commands and earlier-run limitations are recorded in the ticket.

### Standards

No remaining documented-standard violations or actionable baseline smells. The initial save-feedback string inference was replaced with typed state.

### Spec

No remaining actionable findings. The initial Retry and localStorage concurrency findings were resolved and received focused re-review. Action Retry applies its delta/focused patch to the latest record; all local Party writes use the same lock.

Final review totals: Standards 0 remaining findings; Spec 0 remaining findings.
