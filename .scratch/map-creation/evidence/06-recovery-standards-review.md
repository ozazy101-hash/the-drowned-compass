# Ticket06 recovery independent Standards/depth review

Current final verdict: **Standards/depth PASS** at `ad7b06c0a613d5c5f6c09ec839ca4ff243b7aabb`; no unresolved actionable findings. Historical95c8 and5216FAIL verdicts and their corrections are preserved below. Fixed review base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`. Historical95c8FAIL is retained below, followed by final re-review.

Historical frozen-head verdict: **FAIL — P2 completed-CAS recovery bypass**, pending corrected source re-review.
Frozen source: `95c8b7a9a194b15b0a0b45a18afd16c099c0351a`.
Fixed review base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`.

Reviewed all seven changed source paths against AGENTS.md/referenced repository standards, the codebase-design skill, prior accepted module/interface contract,06-recovery-plan.md and the approved atomic-ceiling amendment. Prior review histories remain unchanged.

## Finding

**[P2] Reverify completed records returned by a successful preparation CAS.** `supabase/functions/map-generation/application.mjs:55`, `:64` and `:150`: legacy proof clamping can lose its CAS to a concurrent completion and return the newer completed record. The successful recoverPreparation path returns it directly, and output's non-awaiting branch snapshots it without finalize/reconcile. This skips the module's promised stored-object verification on completed recovery. Route that completed result through owned finalization/reconciliation before reporting completed, including the successful CAS path, and test both unchanged and tampered retained PNGs. This was independently noticed during Standards review and confirmed/reproduced by the distinct Spec reviewer (reported zero object reads and zero finalizations); see the separate recovery Spec finding. No test mutation/reproduction was performed by this reviewer. The writer is authorized to correct it; this historical verdict must not be represented as PASS for95c8.

## Depth and scope

Other reviewed changes preserve depth/locality: stage recovery and revision ownership remain within the server application; explicit same-job reads reuse a durably accepted candidate without provider resubmission. Failure handling mutates only the failing stage revision and re-authorizes before returning a newer state. Transient verifier HTTP/transport/incomplete-response classification remains internal and bounded, with no raw private payload in semantic errors, no new caller ledger/facade and no generic task engine. Immutable receipt+24h ceilings and legacy expiry clamping stay server-owned; earlier expiry is not extended. Cancellation with a definitive timely receipt releases only the concurrency slot, preserving cumulative quota/spend and terminal state.

Programmatic exact function comparisons confirm accepted140000/150000 migrations are byte-identical;160000 reserve changes only CREATE OR REPLACE plus the approved cancelled-receipt slot condition, and160000 complete is150000 exactly except the approved receipt+24h rejection. Authority, locking, tuple/object/proof checks, nullable-parent fix and presentation behavior remain unchanged.

## Independent verification and limits

- Application/verifier Node suite: **42 passed,0 failed,0 skipped**, independently executed. These passes do not cover the identified successful-CAS bypass.
- TypeScript/Vite production build: **PASS**; existing non-blocking import-extension/chunk warnings.
- Fixed base-to-source diff whitespace check and frozen source-directory equality after checks: **PASS**.
- Inspected writer rollback transcripts: recovery **12/12**, receipt ceiling **10/10**, both end ROLLBACK; these are writer SQL results, not reviewer-executedSQL. Parsed before/after JSON objects match exactly, including schema/data/table hashes (schema bbab91683ad25066ddbf24ac18482527f0f9747c524427d27dd5e5c2bc383ce5, data d179b9c136736dc896ad4896757e1c37119a181dd8098fc92152ffa14d7d4baf).

A fresh browser/Edge replay is **not required for this narrow Standards/depth delta**: worker topology, decoder, CPU/memory budgets and browser contract are unchanged; public application commands and the owned verifier adapter classify/recover stage failures, and real rollbackSQL covers changed persistence decisions. This does **not** establish that the07 observed CPUTime failure is fixed or that all fresh invocations meet2s. Actual hosted/runtime feasibility remains separately gated. No SQL/storage/browser/runtime lease, provider call, fixture or hosted state was touched by this reviewer. Only this new evidence file was written; source and prior evidence were preserved.

## Final corrected frozen-source re-review

Source: `5216c9f022d8bbef6927ca71e53343e6287a951c`.
Fixed base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`.
Initial re-review assessment: historical successful-prepare P2 resolved. Overall5216 verdict subsequently **FAIL** after the additional recovery-transition CAS finding below; the earlier passing checks do not constitute acceptance.

Re-reviewed all seven final changed source paths and the exact95c8-to5216 correction. Successful recoverPreparation now independently finalizes a completed result returned by prepare/CAS; output's non-awaiting completed return also finalizes it. Both paths therefore re-read/check the immutable stored provisional object and enforce current authoritative binding and absolute receipt/proof ceilings before projecting completed. Normal reconcile returns the completed outcome already verified by recoverPreparation instead of finalizing that successful result twice. Existing completed reads still take ordinary finalization; cancelled/legitimately failed results stay terminal and older stages cannot overwrite newer state.

The fix remains inside the existing deep server module and adds no caller ordering requirement, client ledger, facade, SQL row exposure or external interface. Four new retained-real-PNG regressions exercise legacy-expiry clamp CAS loss for read/output with valid/tampered output. Valid cases reverify and return completed; swapped/tampered stored bytes reject without another provider call or duplicate attachment. All previously reviewed recovery/classification/ceiling and exact migration-scope constraints remain unchanged.

Independent final checks:

- Node application/verifier suite: **46 passed,0 failed,0 skipped**, including all four corrected completed-CAS PNG cases.
- TypeScript/Vite production build: **PASS**, existing non-blocking warnings unchanged.
- Fixed-base-to-final diff whitespace check, final frozen HEAD and source equality after checks: **PASS**.
-95c8-to5216 changed only application/application tests; migration, verifier and rollbackSQL test sources are byte-identical to the previously reviewed versions. SQL12/12 and10/10 rollback transcripts and exact parsed baseline equality remain applicable writer evidence, not reviewer-executedSQL.

Runtime proportionality decision remains unchanged: **no fresh browser/Edge runtime replay is necessary for this narrow Standards/depth delta**. Public application/owned-adapter checks cover the revised outcome, CAS and error classification; decoder/topology/resource budgets and browser contract are unchanged. The07 observed CPUTime failure remains unresolved as runtime evidence; this verdict does not claim every invocation satisfies2s or that the runtime failure has been repaired. No SQL/storage/browser/runtime lease or fixture, hosted change, paid call or source mutation was performed by the reviewer. Historical95c8FAIL and other earlier review evidence are preserved.

### Additional5216 finding confirmed before delivery

**[P2] Normalize every completed recovery result outside the prepare-only catch.** The recovery error path authorizes/read-checks an unchanged revision, then calls transition using that revision. If another command completes between the read and this transition, CAS returns that newer completed record. This return bypasses finalize, and reconcile's completed early return snapshots it as though recoverPreparation had already verified it. The distinct Spec reviewer reproduced this second bypass. In addition, placing successful completed finalization inside the prepare catch can immediately repeat a transient FINALIZE failure through the catch's completed branch. Finalization should be outside the prepare-only catch and run once for any completed record emerging from successful preparation, recovery return or recovery mutation. Add retained-PNG valid/tampered regressions for catch-transition CAS loss and a transientFINALIZE call-count1 check.

This further finding leaves5216unaccepted despite46/46Node/build/diff/source-equality checks. The writer is authorized to correct it and another exact-head independent re-review is required. No additional source or fixture mutation was performed by this reviewer.

## Final normalization re-review — ad7b06c

Exact source: `ad7b06c0a613d5c5f6c09ec839ca4ff243b7aabb`.
Fixed review base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`.
Verdict: **Standards/depth PASS**. Both completed-CAS P2 findings are resolved; no new actionable findings.

Re-reviewed the full final base delta and5216-to-ad7b correction. recoverPreparation collects the result from successful preparation, authorized newer-state read, or the stage-revision failure transition, then normalizes every completed result through finalize outside the prepare-only catch. A CAS loss at either successful proof/clamp transition or failure transition therefore independently reads and verifies the same stored provisional output before returning completed. FINALIZE errors propagate without being caught as preparation errors or immediately repeated. Normal reconcile recognizes the completed result already normalized by recoverPreparation and does not duplicate successful verification. Direct output preparation's completed return remains independently finalized. Existing genuinely failed/cancelled states and newer proof/provisional/result are preserved.

Three additional real retained-PNG regressions exercise failure-transition CAS loss with valid, swapped/tampered and unavailable FINALIZE outcomes. They establish one outer FINALIZE attempt, one provider submission and one accepted version, with tampered bytes rejected before raster verification and transient unavailability propagated without an immediate retry. All four successful-clamp read/output valid/tampered tests remain in the passing suite. These exercise observable accepted outcomes through the existing application interface; no caller ledger, facade, SQL authority, provider workflow or new state was introduced.

Final independent checks:

- Application/verifier Node suite: **49 passed,0 failed,0 skipped**.
- TypeScript/Vite production build: **PASS**; same existing non-blocking warnings.
- Fixed-base-to-final diff whitespace check, frozen HEAD and source equality after checks: **PASS**.
- Migration/verifier/rollbackSQL sources are unchanged from95c8. Exact approved160000 function comparisons and prior140000/150000 byte equality remain valid. Reviewed writer SQL12/12 and10/10 rollback transcripts and parsed before/after schema/data/table baseline equality remain applicable; no reviewerSQL execution is claimed.

Runtime decision: **a fresh browser/Edge replay is unnecessary for this narrow Standards/depth correction**. The revised logic is application result normalization and owned-adapter failure handling, covered by retained-image interface tests; decoder, Edge lifecycle/topology, limits and browser transport are unchanged. This review does not establish that07's observed CPUTime failure is fixed or that every invocation meets2s. Existing runtime/hosted enablement gates remain separate. No SQL/storage/browser/runtime lease, fixture, paid call, hosted action, source edit or previous evidence-file mutation was performed; only this review's history was appended/updated.
