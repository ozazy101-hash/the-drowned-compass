# Ticket06 independent Standards/depth review

Final verdict: **PASS**. No actionable Standards/depth findings at `52b7c3f6d5023fa01af3e2283fd2213453c0a1db`.

Historical initial review follows; its PASS covers `57334ba0c8d2ee307abc7e078b283857158d48a6` only and does not replace the final re-review below.

Exact base: `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`.
Frozen committed source: `57334ba0c8d2ee307abc7e078b283857158d48a6`.

Reviewed the exact base-to-source diff (22 files) against AGENTS.md and its issue-tracker, triage, domain, module-design and ticket-delivery instructions; CONTEXT.md; relevant ADR0001/0003/0004/0005; codebase-design skill; updated spec/ticket06; architecture review; accepted bounded verifier decision; and pre-coding module contract. Confirmed HEAD equals the frozen source and no source-directory working-tree differences exist. Evidence/issue changes were excluded from the reviewed source.

## Depth and locality

The generation application owns one semantic execute/handle interface, with injected durable SQL/storage, provider and bounded-verifier implementations. Request identity, submission claims, reconciliation, provider deadlines, cancellation, private proof creation, provisional storage identity and atomic completion remain within this module. Deleting it would spread these rules into callers; it earns its depth. Provider request/credential/mask conventions remain internal. SQL reinforces party authority, serialized usage/concurrency reservations, state transitions, immutable-object retention and accepted attachment tuple checks.

PartyContent adds cohesive generation intent and immutable assembly-input operations at the existing owned transport seam, without a client job/usage/proof ledger or redundant forwarding facade. Workspace jobs remain behind its existing read/observation mechanism, which owns invalidation epochs, disposal and two-second polling. App.tsx, PartyData and workshop/display files receive no scattered orchestration. Local browser generation is explicitly disabled, with an intentionally labelled server fixture variation. Server-only imports and credential configuration do not enter the client graph; generated client bundle inspection found no provider implementation, provider model, service adapter or private verifier nonce header.

PREPARE/FINALIZE remain separate fresh bounded workers; production verifier has no unbounded same-worker decode fallback. Browser assembly is untrusted and preflight alone cannot attach. Finalization and recovery re-read the canonical stored provisional object and independently verify it; the SQL transaction rechecks cancellation, proof/object bindings and accepting receipt. Bounded PNG support remains separated from unchanged general manual JPEG/WebP support. Hosted runtime and live/billing enablement are explicitly unverified later gates.

## Independent checks

- Application seam tests: **11 passed, 0 failed, 0 skipped** (`node --test supabase/functions/map-generation/application.test.mjs`). Cover DM/player/anonymous commands, duplicate claims, uncertain reconciliation, cancellation races, immutable-object recovery/tamper, constrained registration/pixel preservation, stale/expired/invalid outputs, write failure, provider deadline and same-candidate retry.
- TypeScript/Vite build: **PASS** (`pnpm build`). Initial restricted run could not write tsbuildinfo; the authorized isolated-worktree rerun passed. Existing Vite extension/chunk-size warnings remain non-blocking.
- Exact committed diff whitespace check: **PASS** (`git diff --check BASE SOURCE`).
- Exact source equality after checks: **PASS** (frozen HEAD and source diff clean).
- SQL/storage and browser tests were inspected, not re-run: these leases belong to the coordinator. Their reported counts are not represented as independently executed evidence here. No SQL, browser, provider calls or fixtures were touched by this reviewer.

This review covers Standards/depth only. A distinct reviewer supplies the Spec verdict.

## Final frozen-source re-review

Exact final source: `051f1582ca12ffc62b080aa52453b4ed2a6771f2`.
Exact unchanged base: `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`.
Verdict: **Standards/depth PASS**, no actionable findings.

Re-reviewed the final full base-to-source file set and the complete change since the historical reviewed head. The distinct Spec reviewer had found a provider-deadline issue at the historical head; the new source corrects that issue without moving rules into callers or changing the PartyContent interface. The server application rejects queued/unknown/running receipts past the original deadline. SQL independently rejects expired running/uncertain transitions, records the accepted provider timestamp within the server ledger and requires that timestamp no later than the original deadline during atomic completion/recovery. A timely receipt enters the existing awaiting-client-output state; its independently bounded24h proof/assembly window remains available after120s. No browser deadline, client receipt flag or second ledger grants acceptance. Cancelled/failed terminal transitions remain final and reservations are retained. Fixture provider variation exercises unknown submission and receipt lookup at the same internal seam, without exposing provider choice to workshop callers.

Independent checks on this final source:

- Application seam suite: **13 passed, 0 failed, 0 skipped**. This includes the revised permanent-timeout test and new late unknown receipt rejection and timely receipt/assembly recovery tests.
- TypeScript/Vite production build: **PASS**; same non-blocking Vite warnings as the historical run.
- Full base-to-final committed diff whitespace check: **PASS**.
- HEAD equals the final frozen SHA and source paths remain unchanged after checks: **PASS**.
- Inspected final SQL deadline/receipt tests and browser late-receipt fixture journey. Coordinator reports SQL50/50 and actualEdge browser7/7 with owned baseline restoration; these are not represented as independently executed checks by this reviewer. SQL/browser leases and fixtures remain untouched.

Historical source and this final source both pass Standards/depth; only the final head includes the accepted deadline correction. The distinct Spec review remains separate. Hosted deployment, live enablement and paid calls remain outside this local review.

## Final source-inspection guard re-review

Exact final source: `52b7c3f6d5023fa01af3e2283fd2213453c0a1db`.
Exact unchanged base: `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`.
Verdict: **Standards/depth PASS**, no actionable findings.

Reviewed the full final source and exact delta from `051f1582ca12ffc62b080aa52453b4ed2a6771f2`. The pre-provider guard remains hidden within the server application, without caller ordering requirements or interface expansion. After fresh source inspection, an authorized durable job read must still return the same running revision and unique submission token. Current authoritative bindings and the original deadline are checked before invoking the internal provider. Expired inspection, cancellation or membership loss prevents submission. Prior permanent receipt-deadline and atomic timestamp checks remain intact, independent of the24h assembly/proof window. Source inspection error handling preserves saved content with bounded unsupported-format feedback.

Independent checks:

- Application seam suite: **16 passed, 0 failed, 0 skipped**, including source-inspection deadline/cancellation/membership guards with zero provider calls and no proof/version attachment.
- Full base-to-final committed diff whitespace check: **PASS**.
- Frozen HEAD and source-directory equality: **PASS**.
- Browser/type/source transport is unchanged apart from verification harness additions; the preceding independently passing TypeScript/Vite production build remains applicable. No broader test repetition was necessary for this server guard change.
- Inspected the added genuine saved-artwork reference browser journey across fresh inspection, preparation, output and reload; coordinator reports its focused actualEdge run **1/1 PASS**, preserving both saved versions and display state with exact baseline cleanup. SQL is unchanged since the independently inspected prior50-test suite; prior browser7 evidence is retained. SQL/browser counts are coordinator evidence and were not independently re-run here.

This final re-review supersedes historical source verdicts for the current final head. No SQL/browser fixtures or leases, credentials, paid calls or hosted state were touched. Distinct Spec review remains separate.
