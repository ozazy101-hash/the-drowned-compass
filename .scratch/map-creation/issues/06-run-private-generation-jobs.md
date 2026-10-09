# 06 — Run private AI generation jobs

Type: task
Status: resolved
Blocked by: 03, 04
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Implement server-side DM-authorized generation, reference illustration and image-edit jobs using03’s selected provider contract. Attach completed output as a new private version through04. Add progress, reconciliation, retry/cancellation and configured usage controls.

## Module and interface

Generation module hides provider mechanics and output validation; PartyContent exposes authorized accepted jobs/results to workshop callers. Use live and fixture adapters at the same seam.

## Architecture constraints

The server generation application alone owns durable job/usage state, reconciliation, cancellation and private-version attachment. PartyContent's owned transport adapter returns accepted outcomes; React and content adapters do not recreate the ledger. Inject the provider port internally and keep request/credential/mask encoding inside its adapter. Use atomic attachment/receipt decisions so retry after output upload cannot create another version. Expose bounded semantic failures and status, not raw provider/storage payloads.

## Acceptance

- [x] No provider secret appears in browser bundle, responses, logs or shared storage. Verify party ownership on submission, job queries and output attachment.
- [x] Enforce03 concurrency/quota/spending and timeout configuration server-side. No provider request on page load; repeated request IDs and polling do not duplicate known submissions.
- [x] Handle queued/running/completed/failed/cancelled outcomes; uncertain submission reconciles before resubmission. A cancelled/timed-out late result cannot publish or replace the selected display.
- [x] Validate decoded image dimensions/type/size; failed provider or file writes leave saved maps unchanged and return useful retry feedback.
- [x] Durable job/result mapping survives controller reload; cleanup cannot remove referenced immutable artwork. Local fixtures are explicitly labelled and never mistaken for live evidence.

## Verification and review

Adapter/job-state and usage-control checks, genuine DM/player denial, duplicate/uncertain-request cases; a bounded live happy-path check using03 configuration and fixture-based failure coverage. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

2026-10-09: Released after accepted03 staged verification and accepted04/05/09 integration. Implement the accepted bounded verification decision in spec.md. Own the sole durable job/proof ledger, generation/provider/storage transport and PartyContent semantic job commands. Exclusive local SQL/storage fixture lease and focused browser port4176; preserve original baselines and clean only owned fixtures. Coordinator retains preview4186/4196. 07/08/10 remain dependency-gated. Defaults disabled/quota0/spend0, concurrency1, provider120s/orphan24h. No new paid calls, hosted migration/deployment or main merge. Independent frozen-head Standards/depth and Spec reviews required.

## Answer

2026-10-09: LOCAL implementation complete at source `52b7c3f6d5023fa01af3e2283fd2213453c0a1db`, exact base `5e87f5739777cb7090fa66bf5700c0fcc05a49c0`. Sole server ledger/provider/storage/verifier ownership and semantic PartyContent seam implemented. Fresh bounded immutable PNG verification, atomic04 attachment/recovery, timely receipt deadline, cancellation, immutable objects and DM authorization preserve saved versions/display. Both distinct final Standards/depth and Spec/security reviews PASS without findings. Closure records local completion awaiting coordinator acceptance; it does not accept or enable hosted/live deployment.

Evidence and exact check applicability: [delivery](../evidence/06-delivery.md), [module contract](../evidence/06-module-contract.md), [Spec review](../evidence/06-spec-review.md), [Standards review](../evidence/06-standards-review.md). Final interface16/16; unchanged SQL50/50 and browser7/7 at051f158; final affected saved-reference actual Edge browser1/1. Failed history, original baseline preservation, private additive bucket, runtime joins and owned cleanup are retained. SQL/browser4176/internal49176 leases released, no owned processes/containers or unique lock remain. Defaults remain disabled/quota0/spend0; no new paid provider call, hosted migration/deployment or main merge. Hosted topology/authentication/billing enablement and integrated release remain later gates; retained provider replay is labelled fixture evidence.

2026-10-09 narrow correction:07 discovery exposed SQLNULL parent artwork serialized as JSONnull and wrongly rejected during atomic completion. Additive150000 migration normalizes only parentBackground comparison; accepted140000 migration is unchanged. Correction source `826e32102eee1c1b1f12e260ace1ee8340cd20f3`; both distinct independent narrow Standards/depth and Spec/security reviews PASS without findings. [Correction delivery](../evidence/06-reference-null-delivery.md) records10/10rollbackSQL checks,6/6old-function reproduction,0fail/skip, exact baseline preservation and released SQL lease. Genuine04 reference-only parent retains source=reference, completes/reconciles without implicit display selection; actual changed background remains rejected. Migration NOT persistently applied; local correction complete awaiting coordinator acceptance and subsequent authorized integration. No browser/runtime lease,07/UI change, new provider/paid/hosted operation or merge/deploy.

2026-10-09 original-intent correction: server semantic outcomes now include canonical persisted `originalIntent`; shared `MapGenerationJob.originalIntent?:MapGenerationIntent` remains optional for existing SQL workspace job lists. Correction source `97f2ea1e25e60c5e2506932e63f9fe010ab82db1`; both distinct independent Standards/depth and Spec reviews PASS without findings. [Delivery/type handoff](../evidence/06-original-intent-delivery.md):22/22pureNodePASS0fail/skip and productionbuildPASS.07 callers must authorized-read the selected failed/cancelled job's persisted intent before explicit retry with newUUID/currentexpectedrevision; uncertain jobs keep sameUUID and reconcile. Projection excludes unknown top-level/nested private metadata and validates persisted identity/grid/source/region after owned adapter authorization. NoSQL projection/secondledger/UI changes; noSQL/storage/browser/runtime calls or leases.07 lease ownership untouched. Local correction complete awaiting coordinator acceptance/caller integration; live remains disabled, no newpaid/hosted/merge/deploy.

2026-10-09 recovery acceptance unit locally complete: final source `ad7b06c0a613d5c5f6c09ec839ca4ff243b7aabb`, exact base/evidence `46bd62eeff5e0daa9bdc9e6bf3b9b10e03d86b34`. Both distinct independent final Standards/depth and Spec/security reviews PASS without findings; prior95c8/5216CAS-recovery FAIL checkpoints retained. [Recovery delivery](../evidence/06-recovery-delivery.md), [approved plan](../evidence/06-recovery-plan.md), [Spec review](../evidence/06-recovery-spec-review.md), [Standards review](../evidence/06-recovery-standards-review.md).49NodePASS0fail/skip(41application+8verifier), independentproductionbuildPASS; unchangedSQL22rollbackPASS(12knownreceiptcancel+10absoluteceiling) at95c8b7a. Candidate survives transientPREPARE, explicitread nevergenerates; completedCASreturns alwaysreverifyimmutableoutput once; unknown/cancel/expiry/invalidPNG/tamper remain denied.160000additive guard permits explicitnewUUID after definitively finished cancelledreceipt without quota/spend refund and atomically enforces receipt+24h, including legacyproof/crossing.140000/150000unchanged;160000NOTpersistentlyapplied. Exactlocalbaselinepreserved,SQLlease/unique06lockreleased; no runtime/browserlease or newpaid/hosted/reset/mainmerge/deploy. Runtimeproportionaldecision and limitations recorded; originalintent acceptance unit remains separate. Local delivery awaits coordinator acceptance and authorized integration/enablement.
