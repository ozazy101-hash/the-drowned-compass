# 06 — Run private AI generation jobs

Type: task
Status: ready-for-agent
Blocked by: 03, 04
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Implement server-side DM-authorized generation, reference illustration and image-edit jobs using03’s selected provider contract. Attach completed output as a new private version through04. Add progress, reconciliation, retry/cancellation and configured usage controls.

## Module and interface

Generation module hides provider mechanics and output validation; PartyContent exposes authorized accepted jobs/results to workshop callers. Use live and fixture adapters at the same seam.

## Architecture constraints

The server generation application alone owns durable job/usage state, reconciliation, cancellation and private-version attachment. PartyContent's owned transport adapter returns accepted outcomes; React and content adapters do not recreate the ledger. Inject the provider port internally and keep request/credential/mask encoding inside its adapter. Use atomic attachment/receipt decisions so retry after output upload cannot create another version. Expose bounded semantic failures and status, not raw provider/storage payloads.

## Acceptance

- [ ] No provider secret appears in browser bundle, responses, logs or shared storage. Verify party ownership on submission, job queries and output attachment.
- [ ] Enforce03 concurrency/quota/spending and timeout configuration server-side. No provider request on page load; repeated request IDs and polling do not duplicate known submissions.
- [ ] Handle queued/running/completed/failed/cancelled outcomes; uncertain submission reconciles before resubmission. A cancelled/timed-out late result cannot publish or replace the selected display.
- [ ] Validate decoded image dimensions/type/size; failed provider or file writes leave saved maps unchanged and return useful retry feedback.
- [ ] Durable job/result mapping survives controller reload; cleanup cannot remove referenced immutable artwork. Local fixtures are explicitly labelled and never mistaken for live evidence.

## Verification and review

Adapter/job-state and usage-control checks, genuine DM/player denial, duplicate/uncertain-request cases; a bounded live happy-path check using03 configuration and fixture-based failure coverage. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

2026-10-09: Released after accepted03 staged verification and accepted04/05/09 integration. Implement the accepted bounded verification decision in spec.md. Own the sole durable job/proof ledger, generation/provider/storage transport and PartyContent semantic job commands. Exclusive local SQL/storage fixture lease and focused browser port4176; preserve original baselines and clean only owned fixtures. Coordinator retains preview4186/4196. 07/08/10 remain dependency-gated. Defaults disabled/quota0/spend0, concurrency1, provider120s/orphan24h. No new paid calls, hosted migration/deployment or main merge. Independent frozen-head Standards/depth and Spec reviews required.
