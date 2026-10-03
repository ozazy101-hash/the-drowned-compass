# Inventory and equipment

The Character Page Inventory records player-authored equipment and notable magic items, their notes and display order, and directly corrected CP/SP/EP/GP/PP amounts. Items do not feed Armor Class, attacks, derived values or carrying capacity. Lower order numbers display first; stable IDs break ties. Currency accepts whole amounts from zero through 999,999,999 without conversion.

`inventory.ts` owns entry validation, conditional transitions, ordering and version-aware merging. `Inventory.tsx` owns drafts, focused saves, failure feedback and explicit conflict Retry. `App.tsx` only composes the section and merges incoming records. Removing the module would distribute validation and conflict rules into callers, so the interface keeps those rules together.

`PartyData.saveInventoryEntry` writes one item or denomination using its expected version. Both adapters return the accepted slot or a conflict containing current data. Local commands use the existing Party Web Lock and read committed IndexedDB snapshots. Existing localStorage Party data is imported once and remains mirrored for compatibility; BroadcastChannel delivers cross-tab notifications even if the mirror reaches its quota. Supabase maps independent rows and subscribes to inventory changes, including reload after reconnect. Tombstones preserve deletion versions so delayed snapshots cannot resurrect removed items. Unrelated Overview, Combat, Features and Story updates retain their own versions.

Migration `20261003150000_record_inventory.sql` adds a new table and membership-checked RPC without changing existing slots or records. Browser roles cannot write the table directly. The RPC locks the claimed slot, checks membership and versions, enforces immutable entry kinds, validates text/currency/order bounds, and records update metadata. Anonymous and non-member access is denied. The migration must precede a frontend release; no hosted migration or deployment is authorized by this ticket.

Verification exercises laptop and phone editing, ordering/removal, reload, simultaneous denomination corrections, stale drafts, failure/Retry and unchanged Armor Class. Adapter contracts cover equivalent write/conflict outcomes, persistence, errors and Supabase realtime catch-up. SQL rehearses the actual migration inside rollback-only transactions with grant, RLS, conditional-write and bound assertions. Exact final results are recorded in the local ticket.

## Local snapshot race

Stress verification reproduced an existing accepted-write loss in both remote main and this branch: Web Locks serialized callbacks, but localStorage snapshots across tabs could still discard earlier accepted field versions. A minimal two-writer loop failed on the baseline; the corrected adapter passed all six matched runs while the baseline failed three of six. The adapter now stores and reads its canonical snapshot through IndexedDB transactions, retaining the shared command lock. `local-party-data.spec.ts` preserves the two-tab 300-iteration regression; the existing cross-feature race now includes Inventory alongside Overview, resources and Combat for 100 iterations. No public PartyData interface changed for this repair.

## Final verification and integration

Repeated focused laptop/phone verification passed 78/78 cases; strengthened canonical reload and mirror-quota checks passed another 12/12. Build and whitespace checks pass, calculation/domain tests pass 132/132, and rollback-only SQL passes 240 assertions across nine files, including 36 Inventory assertions. The coordinator requested one combined full-suite run after peer integration rather than another standalone run here. Earlier full-run failures and the baseline comparison are recorded in the ticket.

When merging peer adapter commands, retain the shared `drowned-compass-party-write` lock and await both `readParty()` and `storeParty()` inside it. These local helpers now use committed asynchronous storage; new commands must not read the localStorage mirror as canonical state. Supabase writes remain independent RPCs.
