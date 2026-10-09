# Ticket07 independent Spec review

Frozen source: `e0e25ed4b158efb85bbdde94552f60ae34b39a63`
Accepted dependency base: `066bbd34fd3e3b354084e488dcae0840289b9335`
Worktree: `/Users/oscarpauwels/.codex/worktrees/map-workshop-07/Dungeons&Dragons`
Reviewer: dedicated independent Spec agent, distinct from coordinator, writer and Standards reviewer.
Verdict: **FAIL — two actionable findings**. This is provisional; exact final source must be reviewed again after fixes and the reviewed06 dependency adoption.

## Finding

**[P2] Bind Retry creation to the failed job and retain its original intent across reload.** `src/features/grid-map/GridMapWorkshop.tsx:731–737` renders every failed/cancelled job retry using `create(true)`, which clones the single `lastIntent.current` (`254–265`), rather than the corresponding job. Inspection and each workspace refresh overwrite that ref from the selected generated version (`152–175`). Concrete scenario: retain generated version A, submit a different brief B in that family, then let B fail/cancel; the refresh while A stays selected resets the ref to A, so B’s Retry creation silently submits A’s instructions/source instead. Another scenario: after the first Invent job fails or is cancelled without a saved generated version, reload; the ref is cleared (`125`), and neither persisted jobs nor a reference-only parent can restore it, so the failed job’s retry stays disabled. This fails the required original-input preservation, job retry/reconnect and same-starting-brief behavior. Retain/recover the immutable original intent per request through the accepted content/server seam (not a second job ledger), and have each job retry explicitly choose that intent; keep private inspection’s sibling action separate. Add a focused behavior regression for A selected/B failed, and for reload after a first failed/cancelled job.

**[P2] Use the creation draft geometry for the sketch surface and its raster reference.** `src/features/grid-map/GridMapWorkshop.tsx:182–194` prefers `selected.document` for the sketch surface and `referenceFile` rasterization (`246–251`), while Create map uses the editable columns/rows/feet controls (`270–274`) for the new reference attachment. Concrete scenario: inspect a saved20×14 version, choose Use my sketch without selecting an existing saved drawing, change columns/rows to80×80, then draw and create. The displayed sketch surface and saved raster encode20×14, but the accepted draft document is80×80; the room outline is rescaled/repositioned relative to the chosen grid before AI starts. Keep inspection geometry separate from creation draft geometry, while preserving the expressly documented original dimensions when the user explicitly chooses an existing saved drawing. Add a regression that changes dimensions after inspecting an existing version and checks the sketch/grid/reference mapping.

## Confirmed scope and safety

- App composes workshop/editor navigation; workshop does not call obsolete Reveal, open a popup, or choose presentation on creation, upload, inspection or accepted output. Disabled Use this map plus the alignment reminder matches the explicit07/10 handoff.
- Output submission uses accepted generation input/output commands; no caller registration/proof is fabricated. General manual PNG/JPEG/WebP validation stays independent of the admitted1024-square AI PNG profile.
- Uploaded alignment is a fresh immutable attachment with retained parent, proportion validation and a new registration. Draft placement survives the tested conflict path; originals/display remain untouched.
- Private object URL effects revoke old URLs and suppress stale responses on dependency/unmount scope. Workshop mutation continuations check the content scope. No provider credentials, paid calls, UI polling timer or parallel generation ledger were added.
- Shared scene preserves artwork beneath terrain using translucent terrain fills and avoids colliding grid pattern IDs. Sketch closes outlines atomically and offers undo/clear; pointer cancellation clears the pending gesture.
- Creation UI clearly distinguishes deterministic fixture mode from live provider and does not claim prompt-guaranteed geometry.

## Evidence and limits

Independently executed exact-head domain suites: **15 passed, 0 failed, 0 skipped** (`tests/grid-map.test.ts`, `tests/map-artwork.test.ts`, `tests/map-workshop.test.ts`, calculations config). Read all07 changed source, browser journeys/harness/fixture script; read AGENTS and its five instruction documents, CONTEXT, applicable map ADRs, updated spec, architecture review, ticket,06 delivery/server README and accepted bounded verifier decision. The writer’s recorded local UI3/3 is historical evidence, not an independent exact-head full browser pass. No browser lease was used, no SQL/storage mutation or backend49177 start occurred, and no external provider calls occurred.

Full genuine local Supabase/fixture UI journeys remain pending the orchestrator’s reviewed06 reference-only-parent correction and SQL/storage/backend lease return. That known dependency bug belongs06 and is not charged as a07 finding; pending evidence is not counted as acceptance. Hosted migration, provider enablement, deployment and integration ticket12 remain separate gates.
