# 12 — Verify integrated map workflows and prepare release evidence

Type: task
Status: resolved
Blocked by: 03, 04, 05, 06, 07, 08, 09, 10, 11
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Combine reviewed heads in an isolated worktree. Run one combined regression and independently review Standards/depth and Spec. Produce one integrated preview and a release/migration runbook; do not deploy as part of local acceptance.

## Module and interface

Integration gate across Grid Map, PartyContent, generation and Party Display; review existing modules as a whole rather than adding a new orchestration facade.

## Architecture constraints

Require a server/client import-graph check, deletion-test evidence for each deep module and interface-level outcome tests. Verify no job/authorization/coordinate/mask-compatibility rule is duplicated in App/workshop/display/adapters. Verify registration digest separation, coherent snapshot races and lossless decoded pixel preservation. Replace superseded helper tests with preserved behaviour coverage rather than duplicate suites. Architecture review of the final implementation is required; this planning review is not proof of implemented depth.

## Acceptance

- [x] End-to-end Invent and sketch illustration, upload, retained variants, partial revisions, branching, fixed-extent later stages, manual mask/persistence/conflict and extended display all have passing evidence.
- [x] Genuine private-map/known-path/old-client denial and unchanged Handout/PDF sharing pass. Character editing remains correct while generation/content operations occur.
- [x] Include failure/retry/uncertain job/cancel/rate limit, stale-render/session loss, hidden-byte/output checks, accepted-mask restoration and stage alignment.
- [x] Run proportional build/domain/SQL and one combined laptop/phone browser gate; record exact counts, skips/failures and reviewed commit heads. Reconcile narrowly justified failures honestly.
- [x] Independent Standards/depth and Spec reviews pass with no unresolved actionable findings. Actual live provider proof is distinct from deterministic fixture coverage.
- [x] Preserve original database schema/data and owned fixture cleanup. Supply dependency-ordered hosted migration runbook, old-client denial/data-preservation queries, rollback limits and deployed smoke plan.
- [x] Provide an integrated preview for user acceptance. Hosted migration, merge, deployment and physical projector measurement remain separately recorded steps; none is inferred from local checks.

## Verification and review

One combined gate and independently recorded exact-head reviews. Do not run another whole gate for evidence-only commits; release source equality must be checked when later authorized. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

## Answer

2026-10-10: Local integration accepted at frozen `84772f6d53431ada5a2b30f3ad9531e960ed95a0`. Both independent exact-source Standards/depth and Spec PASS. All56 distinct browser cases pass in the honest aggregate51+3+2; original51/5 and affected3/2 failures remain retained. Build/domain/application/rollback SQL pass, all baseline hashes preserved, owned backend fixtures cleaned. [Delivery and limits](../evidence/12-delivery.md), [preview](../evidence/12-preview.md), and [release runbook](../../../docs/release/map-artwork.md). Hosted runtime/Auth/migration/release/provider/projector gates remain separate; inherited P3 Handout accessibility advisory is scoped follow-up.
