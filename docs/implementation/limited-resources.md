# Limited resources (Ticket 10)

Combat contains the composable `CombatResources` section. Each resource records its name, current and maximum uses, recovery timing (Short Rest, Long Rest, Dawn, Manual), order, and optional dashboard importance. Current and maximum accept whole numbers including zero, with 0 ≤ current ≤ maximum ≤ 9999. Spend and restore change one use; direct correction permits changing both values together. Recovery timing is data for later rest proposals; this ticket applies no automatic rest actions.

`src/domain/limited-resources.ts` defines the record, validation, visible ordering, important-resource selection, and version-aware merging. `CharacterRecord.limitedResources` defaults to an empty collection. Each independently addressable record has its own conditional version. Edits retain the version at which typing began. An accepted remote edit cannot silently rebase a local draft; conflicts retain it until explicit Retry adopts the latest accepted record version. Older save acknowledgements preserve newer typing. Deleted records remain versioned tombstones so delayed snapshots cannot resurrect them. A remote removal leaves a dirty editor available to copy or discard its unsaved details.

The production table is membership-protected and read-only to browser roles outside the RPC. `write_limited_resource` locks the resource identity and Character Slot, checks Party membership and claim, checks the expected resource version, and writes only that resource. Important-resource handoff clears the previous designation and increments that record's version atomically. The unique partial index permits at most one important live resource per Character Slot. Spend/restore use the same conditional record writes: competing actions fail visibly rather than losing a use. Explicit action Retry reapplies its delta or focused patch to the latest accepted record; it never repeats an old absolute snapshot. Direct correction Retry retains the explicit draft. All localStorage Party mutations use the shared `drowned-compass-party-write` Web Lock for the same cross-tab contract; the shared Vite test transport serializes writes on the server.

## Integration seams

- Ticket 09's accepted attacks/actions component now sits alongside `CombatResources` in the Combat container. Both trees remain mounted while switching sections so unsaved drafts remain visible when the user returns.
- Ticket 06's accepted dashboard card now receives both the primary attack and important-resource summaries through its read-only `playSummary` prop. The card remains one keyboard target.
- Ticket 13 can select visible records by `recovery`, read `current`/`maximum`, and carry each record version into confirmed writes. Dawn and Manual remain separate timings. No rest preview or rest action ships here.
- Both local adapters now use the same `drowned-compass-party-write` Web Lock for every localStorage Party mutation. Different locks cannot protect a shared Party document.
- Party snapshots and acknowledgements retain `mergeResources` and `mergeCombatEntries` alongside Overview field-version merging. Supabase reads both independent collections and subscribes to their change events, reloading on reconnect.

## Local verification and release

The database runner expands the actual new migration into a rollback-only fixture. Tests assert existing slot/claim/data/version preservation, member access, explicit RPC grants, anonymous/non-member denial, bounds, independent records, conflicts, importance handoff, ordering, recovery timing and tombstones. No persistent local or hosted migration is needed for rehearsals.

Migration `20260928221000_track_limited_resources.sql` is additive. Deploy it before the new frontend reads `limited_resources`. Hosted migration, frontend release and live acceptance remain pending explicit approval for Ticket 10. The implementation does not modify hosted Character Records.

### Verified results

All 68 distinct browser cases passed (34 laptop, 34 phone): 14 laptop regressions completed before the coordinator requested cancellation, then the remaining 54 passed under the shared browser lock in 16.8 minutes. The temporary resume config omitted only completed laptop cases; both viewport projects and port 4210 were retained. The 18 new resource cases cover UI, keyboard use, persistence, bounds, ordering, recovery, importance, independent/same-record edits, action Retry, failures, typing/snapshot guards, adapter contracts, and cross-tab localStorage parity. Both layout screenshots were inspected; neither viewport overflowed horizontally. A final wording-only edit removed implementation terminology from the product explanation.

The actual migration plus strengthened fixture passed all 25 pgTAP assertions under the shared database lock and finished with `ROLLBACK` before peer integration. The fixture establishes a known claim and nonzero Overview versions before capturing the preservation snapshot. After Docker resumed on 2026-10-02, the standard `pnpm test:db` runner passed all 171 assertions across seven files with accepted Tickets 09 and 06. The later Ticket 16 merge passed all 204 assertions across eight files, including rollback-only rehearsals of both pending migrations. No persistent or hosted Ticket 10 schema change was made. The earlier timeout while Docker was paused is recorded in the ticket.

After merging accepted Tickets 09 and 06 from `main`, the complete integrated Playwright suite passed all 96 cases (48 laptop, 48 phone) on reserved port 4210 with one worker. This includes a new journey that saves an attack and important resource, shows both Party summaries, and retains both after reload. A strengthened cross-tab race of simultaneous Overview, resource and Combat writes then passed in both viewports. The production build and 131 calculation cases pass. The peer Supabase adapter fixture now recognizes the independent resource read. The shared localStorage lock also covers Combat entry writes so a simultaneous resource or Overview write cannot overwrite them.

Ticket 16 Features and Story was subsequently released. This branch now integrates that accepted main, preserving all four Character Record sections and their independent records. The Story adapter fixtures recognize the resource read, and a cross-feature browser journey saves a resource, action, Feature and Story field, then verifies them after reload. The combined production build and 131 calculation cases pass; the complete browser rerun is recorded in the ticket. Ticket 10's hosted migration and frontend release remain separate.

### Standards

No remaining documented-standard violations or actionable baseline smells. The initial save-feedback string inference was replaced with typed state.

### Spec

No remaining actionable findings. The initial Retry and localStorage concurrency findings were resolved and received focused re-review. Action Retry applies its delta/focused patch to the latest record; all local Party writes use the same lock.

Final review totals: Standards 0 remaining findings; Spec 0 remaining findings.
