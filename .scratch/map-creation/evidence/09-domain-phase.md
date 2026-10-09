# Ticket 09 pure domain phase

Accepted dependency base: `c6577fb3261213834d4741801541eefaec8ed706`.
Branch: `codex/map-reveal-masks-09`.
Worktree: `/Users/oscarpauwels/.codex/worktrees/map-reveal-masks-09/Dungeons&Dragons`.

Initial release permits only new `src/domain/map-reveal-mask.ts`, `tests/map-reveal-mask.test.ts`, and own tracker/evidence. Existing shared source, adapters, SQL, UI, fixtures and browser remain protected until the orchestrator supplies the accepted05 assembled base and ownership.

Grid Map domain owns mask validation, cell strokes and history. Small interface: start from a validated atomic presentation; gather brush samples locally; finish a stroke as one history action; undo/redo or whole-map transitions; form one semantic revision-guarded commit intent and accept/conflict outcome. PartyContent later persists accepted state through existing adapters. No arithmetic port or factory.

Hidden invariants: bounded unique cells; 1/2/4-square brush; one stroke per undo group; immutable accepted baseline separate from recoverable draft; validated family, registration and canonical geometry guard; invalid snapshots never produce visible cells; whole-map uncover requires deliberate confirmation. No provider, render or per-sample write orchestration.

Pure in-process dependencies only. Domain and future adapter tests cross intent/outcome interfaces. Ticket10 owns actual controls, overlay and display integration.

Phase in progress; no final completion, SQL/browser or full-ticket verification claim.

## Reviewed phase result

Frozen source: `1453bed52ae45caf05d1b7b0d250f3165cce11e5` (initial candidate `a53bfcd5e63811b553e32b0f67197430821af225`).

Dedicated writer added only the new mask domain and tests. Interface: `createMapRevealMaskDraft(snapshot|null)` exposes snapshot, local semantic commands, prepareCommit and receive; `commitMapRevealMask(current,intent)` supplies pure accepted/conflict/incompatible outcomes. Intent includes expected presentation revision, family and mask identities, accepted geometry and complete validated cell set. Existing matchingMapGeometry and presentation validation are reused; digest and version identity do not substitute for geometry registration. Whole-map uncover requires confirmed intent; pending saves lock editing, failed/conflicting responses retain accepted state plus a recoverable draft.

Writer verification: initial 16/16 focused mask/artwork tests and production build passed. After review fix, 17/17 focused tests and TypeScript check passed. Exact command: `/usr/local/bin/node node_modules/@playwright/test/cli.js test --config=playwright.calculations.config.ts tests/map-reveal-mask.test.ts tests/map-artwork.test.ts --output=/private/tmp/map-mask-09-family-review`; `/usr/local/bin/node node_modules/typescript/bin/tsc -b`. Initial build used pnpm build (existing Vite warnings only).

Distinct independent reviewer: Standards/depth PASS and pure-phase Spec PASS at frozen source. Initial P2 found success response could change familyId while retaining other identifiers. Writer added explicit family guard and recovery/retry regression. Independent final rerun: 17/17 PASS; no remaining actionable phase findings. Independent initial temporary probe reproduced the defect; final regression verifies its repair. No source mutation by reviewer.

No SQL/storage/browser fixtures, shared source, migrations, UI, hosted changes, main merge or deployment. Local dependencies installed from existing store without manifest/lock changes. This is partial progress; full09 persistence, adapter equivalence, policies and browser acceptance await explicit05 handoff and another frozen-source independent review. Ticket remains claimed.
