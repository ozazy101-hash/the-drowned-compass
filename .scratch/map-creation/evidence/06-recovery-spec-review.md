# Ticket06 recovery delta — final independent Spec/security review

Fixed base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`.
Final frozen source: `ad7b06c0a613d5c5f6c09ec839ca4ff243b7aabb`.
Verdict: **PASS**. Both earlier recovered-completion findings are resolved. No remaining actionable Spec/security findings. Original95c8 and5216 FAIL checkpoints are retained below.

## Final independent checks

- `node --test supabase/functions/map-generation/application.test.mjs supabase/functions/map-generation/verifier.test.mjs`: **49passed,0failed,0skipped** (41application+8verifier).
- Reviewed the full recovery delta against46bd and both follow-ups. recoverPreparation now scopes its catch to PREPARE, gathers successful preparation, authorized newer-state reread and failure-transition CAS outcomes, and routes any completed result through finalize once outside that catch. Successful clamp CAS and late failure-transition CAS completion therefore cannot be snapshotted without same-stored-object verification. FINALIZE unavailability does not enter preparation recovery or execute an automatic second stage.
- Retained-PNG tests independently executed for read/output×valid/tampered legacy clamp races, plus failure-transition CAS completed valid/tampered/unavailable outcomes. Valid recovery stays one provider submission/one saved version; tampered stored output is rejected; unavailable completed verification records exactly one outer finalization attempt and returns bounded error. Ordinary reconcile avoids an extra completed verification after normalized recovery.
- Transient PREPARE preserves durable candidate and request; explicit recovery succeeds without provider resubmission. Newer proof/cancelled/failed/completed state is retained under original-revision CAS. Permanent validation remains failed. Fixed authoritative receipt+24h ceiling, earlier-proof retention, legacy clamping, post-verifier expiry and unchanged immutable FINALIZE read preserve accepted limits and stored bindings.
- Independently proved160000 reserve/complete replacement text matches the approved predecessor changes only (known timely receipt cancellation slot and receipt+24h binding rejection). Reconfirmed migration and both SQL fixtures are byte-identical to95c8 at final source. Authority, quotas/cumulative spending, unknown cancellation deadline hold, parent-null correction, canonical geometry and no implicit display selection remain unchanged.
- Assessed writer SQL evidence: **12/12 recovery +10/10 ceiling checks**, cleanTAP andROLLBACK; recorded before/after snapshots compare exactly equal. These are reviewed executions, not independently rerunSQL claims or persistent migration application.

## Runtime proportional decision and limits

Pure orchestration/verifier-adapter tests and exact SQL replacement checks are proportionate here; decoder, physical worker topology, resource budgets and image corpus remain unchanged. NoSQL/browser/storage/runtime lease is currently held, and no such mutation was performed. Retained07 CPUTime3071ms failure remains real; neither thisPASS nor49Node checks proves every fresh stage meets2s. A later leased integration journey may verify runtime recovery without increasing budgets or substituting simulated live/provider evidence.

No source edits, prior evidence edits, commits, agents, credentials, paid/new provider calls, hosted changes, resets or deployment. HEAD verified as final frozenSHA; this report is evidence-only and does not alter source equality. Distinct Standards/depth review remains separate.

## Retained review history

# Recovery re-review checkpoint —5216c9f

Fixed base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`.
Frozen source: `5216c9f022d8bbef6927ca71e53343e6287a951c`.
Verdict: **FAIL** — original successful-clamp bypass resolved, but the same recovered-completion invariant still has a failure-transition CAS bypass.

## P2 — Normalize completed results after every recovery CAS

Location: `supabase/functions/map-generation/application.mjs:71`, consumed by reconcile's new early completed return at133.

After PREPARE throws, owned reread may still match the stage's original revision. Another request can complete before the subsequent failure/recoverable-code CAS. That transition then returns its newer completed record. recoverPreparation returns it without finalization, and reconcile now immediately snapshots any completed record returned by recovery, assuming it was verified. Independent injected-port reproduction used a matching durable candidate digest and transient prepare error; the owned reread returned original awaiting revision3, then the failure transition returned concurrent completed revision5. The public read returned completed with **provisionalReads=0, finalizeCalls=0**.

Also, finalize(prepared) currently sits inside the prepare try/catch. A transient finalization error can enter the catch, reread a newer completed record and invoke finalize again in the same request. That unnecessary automatic second physical stage conflicts with the intended explicit recovery and bounded-work discipline. Keep the catch scoped to preparation, then normalize any completed result once outside it, including success, catch reread and catch transition outcomes. This addresses both hazards without changing CAS or authority ownership. Add tests for late failure-transition CAS completion (valid/tampered output) and transient completed finalization being attempted once.

## Re-review checks

- Independently ran application+verifier tests: **46passed,0failed,0skipped**. All4 retained-PNG successful-clamp read/output×valid/tampered regressions pass.
- Reviewed95c8→5216 two-file delta; successful recoverPreparation and output clamp completion routes now finalize, resolving that original reproduction.
- SQL remains identical to the previous reviewed delta, with approved reserve condition and single completion-ceiling change; prior12+10SQLtranscripts/baseline assessment remain applicable.
- No source edits orSQL/storage/browser/runtime/provider activity. Runtime proportional decision below remains applicable: orchestration pure tests are appropriate; actual retainedCPU failure remains a limitation, not fixed runtime proof.

Previous frozen-head failure and full scope/security assessment follow unchanged.

# Ticket06 recovery delta — independent Spec/security review

Fixed base: `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`.
Frozen source: `95c8b7a9a194b15b0a0b45a18afd16c099c0351a`.
Verdict: **FAIL** — one actionable P2. Earlier06 review/evidence files are unchanged.

## P2 — Verify a completed receipt returned by a successful PREPARE CAS race

Locations: `supabase/functions/map-generation/application.mjs:64` and `:150` (submit consumes recoverPreparation at124).

PREPARE's legacy-expiry clamp invokes a CAS transition. If another request completes before that transition, the SQL adapter returns the newer completed record. On a successful prepare return, recoverPreparation returns that completed record directly, allowing submit to snapshot it; output similarly snapshots any non-awaiting record returned by prepare. These branches bypass the required stored provisional reread/verification before reporting recovered completion. The new failure-catch path correctly finalizes completed records, so the invariant differs between successful and failing recovery.

Independent injected-port reproduction: start awaiting-client-output with legacy proof expiry above receipt+24h; make its clamp transition return a newer completed record with provisional metadata, and configure readObject to reject an immutable-object mismatch. The output command nevertheless returned ok:true/completed with **storedObjectReads=0, finalizeCalls=0**. No SQL/storage/browser/provider use was involved. This demonstrates a bypass of the explicitly required re-verification, not a claim that storage tamper occurred in07.

Correction: ensure every completed record recovered from the preparation/CAS result path is routed through finalize/reconciliation before snapshotting, preserving its same stored object, owned proof and receipt binding. Add retained-PNG valid/tampered completed-clamp race coverage for both submit/preparation recovery and output. Also retain CAS guards for a newer state returned by a failure transition; do not mutate terminal/newer records.

## Independent checks and satisfactory areas

- `node --test supabase/functions/map-generation/application.test.mjs supabase/functions/map-generation/verifier.test.mjs`: **42passed,0failed,0skipped**.
- Reviewed the7-file frozen diff, recovery plan and approved atomic ceiling amendment. Transient PREPARE keeps accepted candidate/request, explicit same-request recovery does not resubmit, failed-stage mutations use original CAS revision, permanent rejection stays failed and transient FINALIZE retains proof/object. Fixed receipt ceiling, legacy CAS clamping and post-verifier checks are present.
- Independently extracted160000 functions and proved exact text equality with the accepted predecessors after only the approved substitutions: reserve's known-receipt cancelled-slot condition, and150000 completion's receipt+24h<=now binding guard. Prior migrations, DM/service authority, party locks, quotas/spend reservations, unknown cancellation hold, immutable attachment/parent checks and no-display-selection behavior remain unchanged.
- Reviewed writer SQL tests/transcripts: recovery12/12 and receipt ceiling10/10TAP checks, no not-ok entries, both end inROLLBACK. Independently compared recorded recovery-before/after JSON snapshots for exact equality. These are assessed writer executions, not independent SQL reruns or persistent migration application.

## Runtime decision and limits

Pure tests and exact SQL replacement checks are proportionate to this orchestration/error-classification delta: decoder, worker runtime/resource budgets, source corpus and topology are unchanged. No runtime lease is currently held. Retained07 CPUTime failure3071ms and later476ms invocation remain real evidence/limitations; this correction does not establish that every fresh stage meets2s, nor prove the concurrency hypothesis in07's observed failure. Do not relabel fixture tests as live provider/runtime proof. Subsequent leased integration can verify recovery behavior against actual runtime without weakening budgets.

No source edits, prior evidence edits, commits, agents, SQL/storage/browser/runtime mutations, paid/new provider calls, credentials, hosted changes, reset or deployment. SourceHEAD verified as the frozen SHA. Distinct Standards/depth review remains separate.
