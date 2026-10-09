# Ticket 10 independent Standards / depth review

Source: `7099da2be9ec0f5fabca88314201da17d81663ff`.
Accepted base: `d8d43e6f0f789ccc7c3f2ace540fa6e87c664576`.
Reviewer: independent Standards/depth agent, distinct from implementation and Spec reviewer.
Verdict: **FAIL — one actionable P2 finding**. No Spec verdict or delivery claim.

## P2 — Settle the retained reveal draft when popup closure invalidates rendering

Location: `src/features/presentation/party-display.ts:219`, also `:223` and `:245`.

A reveal save puts the draft into pending before awaiting `commitMapRevealMask`. If the popup is closed while that request is outstanding, the one-second close observer increments `epoch` while retaining `draft`. When the request subsequently succeeds or fails, both result paths return on the epoch mismatch before `current.receive`, so that retained draft never leaves pending. Reopening calls `reconcileMap`, which preserves the pending draft; its `observe` queues newer snapshots until a receive that can never occur. The DM controls remain disabled, while retry/discard are absent for pending status. This violates repository cancellation/error locality: a rendering lifecycle invalidation must not orphan persistence state.

Separate frame cancellation from settling a still-current authorized draft, or explicitly reconcile/resolve its pending request on reopen. Preserve epoch checks before publishing any pixels and reject results for replaced/disposed/session-cleared drafts. Add a deferred-save interface/browser regression: begin save, close popup, allow close observer to run, resolve success (and failure), reopen; verify safe accepted output and recoverable editable draft with no duplicate commit.

## Standards and depth assessment

Read AGENTS.md and all five linked repository instructions, CONTEXT.md, relevant ADR0003/0004/0005, codebase-design skill, spec, architecture review, ticket 10 and approved module contract. Reviewed exact committed diff, including source, tests, browser configurations and owned fixture script.

The module placement otherwise earns depth: Party Display hides atomic accepted presentation selection, authority, mask persistence coordination and popup lifecycle behind its existing interface. App adds composition only; PartyContent has no new forwarding facade or independent snapshot assembler. MapRevealControls captures DM gestures using SVG game-grid conversion; domain draft owns history/conflict/expected-revision invariants. MapScene reuses MapDrawing rather than introducing a competing scene compositor. Deleting these modules would spread meaningful rules across callers.

The observation extension enforces monotonic revision, family/mask/geometry compatibility for deliberate retry, dirty/error/stroke retention and deferred pending observations. Visible rendering uses privately decoded artwork and shared scene, opaque integer cell copies, a flattened popup canvas, revision/render-generation/session checks and zeroed temporary canvases/revoked SVG object URL. Handout/PDF paths remain in the existing display lifecycle. Calibration/pan continue through existing mapViewport and geometry predicate. No backend/schema changes or player delivery endpoint added.

## Independent verification

- Production TypeScript/Vite build: PASS (existing-style chunk size/native-loader warnings and ineffective dynamic-import warning; no type/build failure).
- `node node_modules/@playwright/test/cli.js test --config=playwright.calculations.config.ts tests/map-reveal-mask.test.ts --output=/private/tmp/ticket10-standards-domain`: **14 passed**.
- Initial attempted non-existent mask-specific configuration was corrected to the repository calculations configuration. Restricted build/test artifact writes required escalation; source was not changed.
- No SQL, storage fixtures, browser runtime, live AI provider or shared preview used by this reviewer. Browser/SQL evidence belongs to coordinator/writer and is not independently claimed here.
- HEAD confirmed frozen source above; source unchanged by review. Other agents' untracked evidence preserved.
