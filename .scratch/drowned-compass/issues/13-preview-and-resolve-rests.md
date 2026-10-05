# 13 — Preview and resolve rests

**What to build:** A player can preview a Short Rest or Long Rest, review every proposed recovery change, exclude exceptions, and confirm one coherent update across health, resources, spell slots, and death saves.

**Blocked by:** 07 — Track Hit Points and survival; 10 — Track limited resources; 12 — Manage Character Spells and spell slots.

**Status:** resolved

**Delivery:** implementation and independent review complete; review-ready, pending separate human release approval.

- [x] Short Rest proposes restoring only resources tagged for Short Rest.
- [x] Long Rest proposes restoring Short Rest and Long Rest resources, spell slots, and current Hit Points while clearing death saves and preserving legacy Temporary Hit Points.
- [x] The preview explains every proposed change before any data is modified.
- [x] A player can exclude individual changes and confirm only the selected recovery actions.
- [x] Confirmed rest changes synchronize as one understandable operation and do not replace unrelated Character Record data.
- [x] Calculation and browser tests cover mixed recovery timings, exclusions, and cancellation.

## Ticket 13 scope reconciliation

Ticket 19 removed Temporary Hit Points from active Health controls. Rests preserve any legacy stored Temporary Hit Points and do not reintroduce controls. This supersedes the original Long Rest clearing requirement.

## Answer

Rest previews and one atomic conditional recovery command now span saved Health/death saves, limited resources and manually configured Magic slot levels. Per-change exclusions and cancellation precede mutation; stale selected-record or selected maximum-HP versions reject all recoveries and offer repreview. Persisted latest-command receipts make immediate network retries idempotent. Dirty drafts and unrelated independently versioned records are preserved.

Reviewed code/test head: `5d4c30ecff3f7cacfcbf644db50aed055a7d675a`, independent Standards0 / Spec0 (code review only). Validation: build/typecheck passed; domain248 tests; rollback-only local DB535 assertions /15files; focused laptop/Pixel7 browser26 tests (18 UI +8 adapter/error, four mocked Supabase HTTP cases); bundled fresh-storage production UI2 viewport journeys. Hosted release remains unperformed and requires separate approval, migration before merge, then deployment and hosted smoke. Full semantics, limitations, commands and release order: [Ticket13 delivery ledger](../ticket-13-delivery.md).
