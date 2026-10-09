# 12 — Verify integrated map workflows and prepare release evidence

Type: task
Status: ready-for-agent
Blocked by: 03, 04, 05, 06, 07, 08, 09, 10, 11
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Combine reviewed heads in an isolated worktree. Run one combined regression and independently review Standards/depth and Spec. Produce one integrated preview and a release/migration runbook; do not deploy as part of local acceptance.

## Module and interface

Integration gate across Grid Map, PartyContent, generation and Party Display; review existing modules as a whole rather than adding a new orchestration facade.

## Architecture constraints

Require a server/client import-graph check, deletion-test evidence for each deep module and interface-level outcome tests. Verify no job/authorization/coordinate/mask-compatibility rule is duplicated in App/workshop/display/adapters. Verify registration digest separation, coherent snapshot races and lossless decoded pixel preservation. Replace superseded helper tests with preserved behaviour coverage rather than duplicate suites. Architecture review of the final implementation is required; this planning review is not proof of implemented depth.

## Acceptance

- [ ] End-to-end Invent and sketch illustration, upload, retained variants, partial revisions, branching, fixed-extent later stages, manual mask/persistence/conflict and extended display all have passing evidence.
- [ ] Genuine private-map/known-path/old-client denial and unchanged Handout/PDF sharing pass. Character editing remains correct while generation/content operations occur.
- [ ] Include failure/retry/uncertain job/cancel/rate limit, stale-render/session loss, hidden-byte/output checks, accepted-mask restoration and stage alignment.
- [ ] Run proportional build/domain/SQL and one combined laptop/phone browser gate; record exact counts, skips/failures and reviewed commit heads. Reconcile narrowly justified failures honestly.
- [ ] Independent Standards/depth and Spec reviews pass with no unresolved actionable findings. Actual live provider proof is distinct from deterministic fixture coverage.
- [ ] Preserve original database schema/data and owned fixture cleanup. Supply dependency-ordered hosted migration runbook, old-client denial/data-preservation queries, rollback limits and deployed smoke plan.
- [ ] Provide an integrated preview for user acceptance. Hosted migration, merge, deployment and physical projector measurement remain separately recorded steps; none is inferred from local checks.

## Verification and review

One combined gate and independently recorded exact-head reviews. Do not run another whole gate for evidence-only commits; release source equality must be checked when later authorized. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).
