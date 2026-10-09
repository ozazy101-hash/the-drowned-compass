# Ticket 10 independent Standards / depth re-review

Frozen source: `f0242258955e5ec08af329c1a93b0169b50a1bb8`.
Accepted base: `d8d43e6f0f789ccc7c3f2ace540fa6e87c664576`.
Reviewer: independent Standards/depth agent, distinct from writer and Spec reviewer.
Verdict: **PASS — no actionable Standards/depth findings**. No Spec or final-delivery verdict.

The earlier FAIL against `7099da2be9ec0f5fabca88314201da17d81663ff` remains recorded in `10-standards-7099da2.md`. Its P2 is resolved on this frozen source.

## Correction review

Popup closure and reopen invalidate `renderEpoch`, cancel rendering and clear readiness, while preserving the controller epoch and still-current reveal draft. A delayed successful save rechecks authority before settling its retained request; a failed save settles into recoverable error. Render paths do not publish to a closed popup, and reopen rechecks authority and atomic accepted workspace before rendering. Clear, disposal, session loss and content choice continue to invalidate the controller epoch; discarded/replaced drafts cannot settle into current state. This fixes the orphaned pending state without weakening pixel/session cancellation checks.

New interface/browser regressions cover delayed success and failure after close-observer completion, exactly one commit, reopen and editable/discardable draft recovery. Fresh-controller reload tests cover black-first authorized restoration and suppression by Clear, including Clear during a held workspace read. The actual local-adapter browser test now reloads and restores accepted progress without another Use command. These tests exercise the user-facing module interface rather than internal helpers. Runtime browser execution belongs to the coordinator; this reviewer inspected their committed test assertions without using the leased browser.

## Full change Standards/depth assessment

Re-reviewed the full source/base change, retaining the AGENTS.md linked instructions, CONTEXT, relevant ADR0003/0004/0005, codebase-design skill, accepted spec/architecture/ticket and module contract as review criteria. Party Display owns authority, atomic accepted selection, persistence coordination, frame lifecycle and transforms. App remains composition only. Existing PartyContent remains the semantic seam; no duplicate snapshot assembler, generation ledger, adapter facade or SQL change is added.

MapScene reuses MapDrawing privately, releases its temporary full canvas and SVG URL, and returns only an opaque flattened visible frame. The popup receives a pixel-copy canvas with integer cell partition concealment, never private URLs, instructions, reference art or DM overlay controls. Revision/render generation/controller epoch checks reject stale publication. Geometry comparison and mapViewport retain existing calibration/pan semantics; Handout/PDF remain in the same lifecycle.

The domain observation extension retains dirty/error/active-stroke work as conflict, queues pending observations, rejects revision regression and uses family, mask identity and geometry for explicit retry. The private controls contain gesture capture and preview only, while domain history/conflict rules and persistence stay behind their existing module interfaces. The deletion test supports useful depth: removing these modules would spread authorization, cancellation, geometry and conflict rules across callers. No additional public interface or scattered business logic in App/PartyData is introduced.

## Independent checks on this head

- HEAD independently confirmed as the frozen source above before and after checks.
- TypeScript/Vite production build: PASS (non-blocking native-loader, large-chunk and ineffective dynamic-import warnings).
- Pure domain command: `node node_modules/@playwright/test/cli.js test --config=playwright.calculations.config.ts tests/map-reveal-mask.test.ts --output=/private/tmp/ticket10-standards-domain-f024225`: **14 passed**.
- `git diff --check d8d43e6 f024225`: PASS.
- No feature source mutations, SQL/storage fixtures, browser runtime, live provider or preview changes by reviewer. Only generated build/test artifacts and this report were written. Coordinator/writer browser, SQL, cleanup and source/evidence equality remain separate delivery evidence.
