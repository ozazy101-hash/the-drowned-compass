# Ticket07 independent final Standards/depth review

Frozen source: `39cc64b123b23be1885ce8b7fcea27deff6868eb`.
Comparison: prior independently reviewed07 source `e0e25ed4b158efb85bbdde94552f60ae34b39a63`, plus complete07 module review against accepted planning/module contract.

## Verdict

**FAIL — one actionable P2 verification finding.** The architecture/depth assessment passes; the new recovery journey cannot execute because its UUID guard is malformed. No source edits were made by this reviewer. A corrected committed source needs a new exact-head review.

## Finding

**P2 — Admit actual UUIDs before checking the durable recovery receipt.** `e2e/map-workshop.spec.ts:816` uses `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{4}-4[0-9a-f]{4}-4[0-9a-f]{12}$/i`. This requires hex group lengths8-4-5-5-13. The owned party identities and workshop request IDs are produced by randomUUID(), whose groups are8-4-4-4-12. Therefore readReceipt() at817–820 rejects every real owned request/party before any SQL evidence can be collected. The controlled controller interruption journey cannot prove recovery, same-request identity or one provider submission at this source head. Use a canonical UUID validator or the correctv4 form8-4-4xxx-[89ab]xxx-12. Keep owned identity validation before SQL interpolation. Independently reproduced with Node crypto.randomUUID(): groupLengths[8,4,4,4,12], matchesFrozenGuard:false. A focused successful recovery test is needed after the correction.

## Standards/depth assessment

The initial review's module deletion test remains satisfied: App composes navigation; workshop owns drafts/inspection/feedback; shared MapScene owns reusable drawing; Grid Map domain owns outline/placement invariants; existing PartyContent adapters share preparation and hide authority/file sequencing. No new public provider facade, SQL row knowledge, React polling or second job state machine was introduced.

The two original correctness findings are repaired. Sketch capture, pointer conversion and rasterization now consistently use draftDocument, independent from inspection geometry. Retry performs a semantic read for the exact selected job, gates failed/cancelled state, prefers the server's canonical originalIntent and refreshes the expected family revision before an explicit new UUID. The session jobIntents map retains submitted draft inputs only as a fallback; it does not own durable state, provider scheduling or billing. Server authoritative intent projection/recovery were adopted from independently accepted06 changes;06 retains their authority and verification ownership. Completed output feedback now requires the accepted completed state, versionId and reread saved version, preventing empty-success feedback.

Reviewed all07 source changes since the prior freeze, full workshop flow and shared scene/placement seam, new browser fixtures/tests and verification runner. New local UI fixtures are labelled as transport/projection fixtures and assert no provider requests; genuine Edge receipt assertions remain distinct. Fixture cleanup still uses exact owned identities and baseline equality. No resource bound increases or simulated CPU/live-provider claims were introduced.

## Independent verification

- TypeScript/Vite production build: **PASS**. Existing import-extension/chunk-size warnings retained.
- Focused domain suites: **15 passed,0 failed** (grid-map, map-artwork, map-workshop),828ms.
- UUID guard reproduction: **confirmed defective**, as above.
- Exact HEAD after checks: `39cc64b123b23be1885ce8b7fcea27deff6868eb`.

No browser4177,SQL/storage or49177runtime lease was used. Coordinator's final real fixture run was still ongoing at review; no overall browser/baseline result is claimed here. Prior3071CPU failure remains historical and is not converted into passing fresh-worker/live proof. Hosted migration/deployment/provider enablement remain outside this review.
