# Ticket06 final independent Spec/security review

Frozen source: `52b7c3f6d5023fa01af3e2283fd2213453c0a1db`.
Exact dependency base: `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`.
Verdict: **PASS**. No remaining actionable Spec/security findings. Both earlier findings are resolved; review history is retained below.

## Independent verification at the final head

- `node --test supabase/functions/map-generation/application.test.mjs`: **16 passed,0failed,0skipped**.
- Independently reran both earlier counterexamples through injected ports with retained real PNG bytes and production decoder/verifier functions: expired source inspection made **0 provider calls**; expired running-job reconciliation made **0 receipt lookups** and **0 attachments**; late output stayed failed.
- New post-inspection guard reauthorizes the requester, requires the same running state/revision/submission token, rechecks authoritative parent binding and deadline before invoking the provider. Inspection expiry, cancellation and membership-loss tests all assert0calls/0attachments. These checks retain duplicate-submission ownership rather than creating another ledger.
- Timely provider receipt followed by output/reload beyond the original provider deadline remains supported by the passing application test. SQL stores its own timely `provider_finished_at`, permanently rejects expired running/uncertain transitions and rejects absent/late receipt timestamps during atomic attachment/recovery.
- Rechecked final production changes against earlier full committed-diff review: server authority, disabled/quota0/spend0 defaults, cumulative reservations, immutable provisional re-verification, private prepared proof, bounded1024 RGB/RGBA8 PNG profile, constrained04 tuple/geometry attachment, cancellation/recovery and no implicit display selection remain intact. Manual upload behavior and safe PartyContent observation remain preserved.

## Evidence limits

No source changes, commits,SQL/storage/browser fixture mutations, new agents, provider credentials or paid/live provider calls. SourceHEAD verified unchanged at final SHA. Distinct Standards/depth review is owned by the other reviewer. SQL50 and previous browser7 at051f158, plus actual Edge saved-reference journey1/1 at this head, are coordinator evidence; this reviewer did not rerun those leased checks. Hosted topology/authentication/billing enablement and final integrated gate remain separately documented delivery obligations, not claimed local successes.

## Resolved finding history

The original P1 late-result attachment finding and residual P2 expired-inspection submission finding follow with their original frozen-head verdicts. Neither remains open at the final source above.

# Previous re-review checkpoint —051f158

Frozen source: `051f1582ca12ffc62b080aa52453b4ed2a6771f2`.
Exact dependency base: `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`.
Verdict: **FAIL** — original late-result attachment P1 resolved; one remaining P2.

## P2 — Recheck expiration after source inspection before calling the provider

Location: `supabase/functions/map-generation/application.mjs:77–80`.

The initial queued check and SQL submission claim precede source storage reads and a fresh-worker source inspection. Either can consume the remaining deadline. After inspection, `Math.max(1, deadline-now())` converts an already expired deadline into a1ms provider wait but still invokes `provider.generate`, permitting a new potentially chargeable request after timeout. The response will fail safely and cannot attach, but this does not enforce the intended bounded submission lifecycle before the external call. Recheck expiration immediately before invoking the provider, preserve the reservation/result identity and return the terminal timeout outcome without a provider request.

Independent injected-port reproduction used retained real PNG bytes and production decode in an inspect adapter that advanced the application clock120001ms, with a120s job deadline. Outcome was `failed/provider-timeout`, but `providerCallsAfterDeadline=1`, `attaches=0`. No real provider call was made. Add a source-inspection-expiry test asserting provider calls0.

## Resolved P1 and independent verification

- Prior expired-running-job/read/reconcile counterexample now returns `failed/provider-timeout`, performs0 receipt lookups and0 attachments; later output remains failed.
- `node --test supabase/functions/map-generation/application.test.mjs`:13passed,0failed,0skipped. Includes timely receipt followed by client assembly/reload after provider deadline.
- SQL under the locked job rejects expired running/uncertain transitions to awaiting-client-output; `provider_finished_at` is assigned by SQL only on timely acceptance. Completion rejects missing/late receipt timestamps; later assembly of a timely accepted candidate is permitted. Cancellation CAS, proof expiry, immutable storage and original binding guards remain intact.
- Did not rerun leasedSQL/browser fixtures. Coordinator reportsSQL50/browser7/buildPASS; these are not independent rerun claims.
- No source edits, commits, provider credential use or paid/live calls. SourceHEAD stayed frozen.

The original reviewed history follows.

# Ticket06 independent Spec/security review — review history

Frozen source: `57334ba0c8d2ee307abc7e078b283857158d48a6`.
Exact dependency base: `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`.
Verdict: **FAIL** — one actionable finding.

## P1 — Reject provider results received after the job deadline

Location: `supabase/functions/map-generation/application.mjs:84–87` (candidate transition at64; corresponding SQL transition at87–89 and completion at100–117).

Ticket06 acceptance line24 says: “A cancelled/timed-out late result cannot publish or replace the selected display.” A read of a running job whose deadline has elapsed changes it to uncertain, then immediately invokes provider reconciliation and accepts any returned image. Candidate acceptance creates a fresh24h proof and output can subsequently attach. SQL only checks the deadline for queued→running, not running/uncertain→awaiting-client-output, and does not bind completion to an on-time accepted provider result.

Independent in-process reproduction used the real retained `added-chamber-raw.png` bytes, the production PNG decoder/prepare/finalize functions and an injected store/provider, with a running job deadline1second in the past. `read` returned `awaiting-client-output`, revision4, code `provider-timeout-unknown`; `output` returned `completed`, revision6, with exactly1 completion call. No database, browser, credentials or paid provider were used.

Required correction: prevent expired provider submissions/results from becoming publishable, including delayed source inspection, late response/reconciliation and SQL transition races. Preserve uncertain billing reservations and duplicate prevention as needed; cancellation and later client assembly of an already accepted on-time candidate are separate cases. Add meaningful application and SQL deadline/late-result coverage.

## Independently checked

- `node --test supabase/functions/map-generation/application.test.mjs`:11passed,0failed,0skipped.
- Reviewed committed diff and relevant context, ADR0005, spec,06/08 tickets, architecture review, accepted browser-verifier decision,04 attachment contract and06 module contract.
- Sole server-owned ledger, disabled/quota0/spend0 defaults, atomic submission token, cumulative reservations, cancellation CAS, immutable candidate/provisional storage, fresh bounded verifier stages, owned proof/object/digest bindings and04 atomic constrained attachment are present.
- Recovery re-reads/re-verifies the same stored provisional PNG. Attachment does not select the display. Manual upload handling remains unchanged.
- PartyContent workspace observation is satisfactory: existing `snapshotSubscription` polls complete authoritative snapshots every2seconds, handles read errors/stale delivery/disposal, and job reads use the safe semantic RPC. No raw proof read grant or React-owned timer is needed.
- Cleanup is internal, retains completed/referenced artwork and has durable pending inventory/acknowledgement. Hosted scheduling/enablement remains a documented later gate.

## Limits

Did not rerun leased local SQL/storage or browser checks, mutate source, commit, spawn agents, use provider credentials or make network provider requests. Reported SQL45/browser6/build passes are coordinator evidence, not independently rerun claims. This review is independent of the distinct Standards/depth reviewer. Source HEAD remained frozen during review.
