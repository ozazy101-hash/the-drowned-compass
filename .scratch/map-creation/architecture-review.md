# Pre-implementation architecture review — 2026-10-09

Skill: `/Users/oscarpauwels/.agents/skills/codebase-design/SKILL.md`, including DEEPENING.md. Reviewed planning head `afefbdf` (spec and tickets03–12), against released source `823e00a`. This is a source-grounded planning review, not a completed-code review or industry ranking.

## Verdict

Original plan: sound scope/module reuse, with six architecture gaps requiring clarification. Revised plan: PASS for pre-implementation module placement and interface discipline; no outstanding planning findings from this review. Implementation must prove depth at the interface/checkpoint and final12 review. No production code, schema, dependencies, credentials or deployment changed.

## Findings and corrections

|Finding|Risk in the original tickets|Correction and owners|
|---|---|---|
|Split generation ownership|PartyContent and generation both owned jobs; UI might coordinate upload, polling, billing and attachment.|06 server application owns the ledger and attachment; PartyContent transports semantic outcomes. Provider port stays internal.03 proves the contract;07 consumes it.|
|Registration equated with checksum|Current adapter derives background registration from digest; current viewport comparison rejects changed-image revisions even if aligned.|04 separates integrity digest from trusted registration lineage and dimensions;08 validates inheritance after constrained composition;11 uses one domain predicate. Arbitrary generation receives new registration.|
|Independent artwork/mask reads|Latest artwork and mask could race, or a mask could be reused on incompatible geometry.|04 defines coherent accepted presentation state;09 commits revision-checked mask intents;10 renders a single snapshot with session/revision guards.|
|Implicit subscription/UI ownership|Existing content subscription is Handout-only; job/mask polling could leak into workshop or Character state.|04 map workspace observation remains at PartyContent;07 consumes accepted snapshots/error states. Character and Handout subscriptions stay separate.|
|07/10/11 overlapping display work|07's Use action could force a second popup implementation or a dependency cycle.|07 builds inputs/inspection and selection intent;10 wires actual display/mask;11 finishes stage compatibility through that path. No stage facade.|
|Unclear coordinate/composition/test seam|Editor/display might duplicate transforms; a lossy encode could violate exact outside-region preservation; tests might freeze helpers.|Shared map-scene drawing/domain conversions, lossless authoritative08 output, interface outcome tests and internal provider fixtures.09 pure arithmetic gets no adapter.|

Source observations: `PartyData.content` in `src/domain/party.ts` already composes PartyContent; its local/Supabase implementations already own files and authority. `src/data/content-subscription.ts` and PartyContent.subscribe deliver Handouts, not map workspace/job/mask snapshots. `src/data/supabase-party-content.ts` assigns `registration:_digest`. `src/features/presentation/map-viewport.ts` compares that registration and dimensions. `MapDrawing` is exported from `GridMapEditor.tsx`, so reusable scene drawing currently lives inside an editor view. `party-display.ts` already owns popup/session/render epochs and calibration, which should be extended rather than duplicated. There is no existing supabase/functions implementation;03 must prove the chosen server runtime, not assume provider/image processing works there.

## Deletion test and interface review

- Grid Map domain earns depth by hiding validated gestures, coordinate conversion, version/registration compatibility and mask transitions; deleting it would spread those rules to controller/render/storage callers.
- PartyContent earns depth by hiding file lifecycle, authority, request identity, accepted revisions and map observation; callers see intent/results, not row/path/cleanup machinery. Keep its map responsibilities cohesive rather than adding a new pass-through facade.
- Server generation application earns depth by hiding external provider conventions, reconciliation, usage controls, normalization/compositing and atomic attachment. Inject the true external provider internally; do not expose it as a workshop configuration surface.
- Party Display earns depth by hiding safe-frame coordination, stale cancellation, authorization and popup/calibration lifecycle. It consumes accepted state, never assembles independent latest queries or manages image jobs.
- Shared scene drawing is private reusable implementation, not a new generic rendering platform or redundant public capability. Workshop/App remain composition and input presentation.

Dependency classification: pure domain transitions/composition are in-process; local SQL/storage have local substitutes; our server transport is owned remote; image provider is true external. Test meaningful commands/accepted outcomes with matching adapters, real local policy checks and bounded live provider evidence. Do not create a port around every dependency or duplicate old/helper tests when moving responsibility.

Dependency graph remains03/04 initially unblocked;05,06 and09 follow their listed prerequisites.04 can define canonical version/presentation structure without a vendor.03 and04 contracts must be reconciled before06. Ticket dependencies do not authorize concurrent writes to shared source files. One combined gate belongs to12, after focused exact-head verification and independent implementation reviews.

## Limits and next checkpoint

The review deliberately does not freeze table layouts, method names or provider choice. Each implementer records a small interface sketch, caller-visible ordering/errors, injected dependencies and actual file ownership before changes. Provider viability, limits/cost, deployed runtime, pixel fidelity and final code depth remain ticket evidence, not established by this document. New findings must be resolved without silently changing user scope.
