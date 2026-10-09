# Ticket 07 independent Standards/depth review

Source: `e0e25ed4b158efb85bbdde94552f60ae34b39a63`.
Diff base: `066bbd34fd3e3b354084e488dcae0840289b9335`.
Reviewer: distinct read-only reviewer, not the implementation writer.

## Verdict

Standards/depth: **PASS** for the frozen source. This is not a Spec verdict or ticket acceptance. Two functional findings below require the separate Spec reviewer/coordinator to resolve before overall acceptance. A new exact-head review is required after dependency adoption or fixes.

## Scope and evidence

Read AGENTS.md and all five referenced repository instructions; CONTEXT.md; ADR0004 and ADR0005; full updated map-creation spec, README, architecture review and ticket07; accepted06 module contract/delivery and server README; adopted browser-verifier decision;07 module contract. Reviewed all15 changed source/test/harness/config/script files against the exact accepted base.

Independently ran the authorized local-only browser selection:
`node node_modules/@playwright/test/cli.js test --config=playwright.map-workshop.config.ts --grep 'local adapter|actual App|local: conflicting'`
Result: **3/3 PASS**,7.6s. Manual PNG/JPEG/WebP and4000×4000/80×80 behavior, reload/alignment preservation, actual App drawing/workshop routes, malformed placement rejection and concurrent alignment conflict preservation were exercised through the existing content seam. Initial sandbox invocation could not write Playwright's result file; authorized managed-worktree escalation then passed. No SQL/storage fixture mutation,49177 runtime, paid provider calls or credentials were used. Existing build/domain evidence was inspected, not independently rerun here.

## Standards and deletion test

- App adds navigation composition only. Workshop owns its inputs, private selection/comparison and save feedback; it does not import server/provider/SQL row types, implement a second ledger or own polling timers.
- Existing PartyContent seam stays cohesive. Both adapters call the same `prepareMapArtworkAttachment` domain preparation, which rejects invalid/extra placement fields, preserves decoded metadata/digest and validates proportional bounded placement. Removing it would spread preparation and validation into both adapters; it earns depth. Public intent adds only geometry, not caller-provided registration or trusted proof.
- Grid Map domain owns closed-outline and bounded proportional-placement invariants. Removing these functions would spread rules into gesture/alignment callers. No hypothetical provider or arithmetic adapter was introduced.
- MapScene supplies reused drawing for editor, inspection/comparison and reference rasterization. Artwork terrain overlays retain visibility, and unique pattern IDs prevent editor/comparison collisions. This is shared implementation, not a redundant forwarding capability. Existing editor gesture/save handling remains preserved.
- Generation consumes immutable input/output commands; server retains verification/registration/attachment authority. Creation, upload and inspection do not choose presentation. Disabled Use this map matches the explicit07/10 ownership contract and has the required alignment reminder.
- Async content/image scopes and object URL revocation remain private to workshop; immutable sources and conflicts stay behind PartyContent. Tests assert observable records/geometry/preservation rather than private helper-call counts. Fixture backend is explicitly distinguished from live provider and script cleanup targets recorded owned identities with exact baseline comparison.

No actionable architecture/Standards finding was identified. The source has two correctness concerns forwarded for Spec review rather than an architecture rejection.

## Functional findings forwarded to Spec review

**P2 — Retry must retain the failed job's own intent** (`src/features/grid-map/GridMapWorkshop.tsx:731–734`, related154–175). Each failed/cancelled job's Retry creation button calls the same `create(true)` using mutable `lastIntent`, ignoring that job's identity. The generated inspection effect rewrites this intent on every workspace update. With saved generated A, start a different brief B and cancel/fail B: the workspace refresh can restore A's intent, and Retry for B submits A. Selecting an older generated version can likewise change the retry brief/reference. Reload with failed/cancelled jobs alone clears the intent and leaves retries disabled. Use accepted per-job intent identity/reconstruction without a second job ledger, and verify retries after selection changes/reload.

**P2 — Keep sketch draft grid separate from inspection grid** (`src/features/grid-map/GridMapWorkshop.tsx:182–194`, related254–263 and308–315). `document` prefers the inspected version's dimensions; sketch pointer mapping/rasterization uses it, while Create validates and attaches the independent Columns/Rows input grid. Inspect20×14 artwork, set draft dimensions80×80 and draw a fresh sketch: capture/rasterization still uses20×14 while the reference version saves80×80. Use the validated creation draft grid for sketch capture/rasterization and the inspected version grid only for inspection; verify the persisted reference alignment after changing dimensions with an existing version selected.

These findings are source-traced; the three available local tests do not cover these generation/sketch combinations. Real backend creation journeys remain pending06's reviewed reference-only-parent SQL NULL correction. That known dependency bug is not assigned to07. No live provider or hosted acceptance is claimed.
