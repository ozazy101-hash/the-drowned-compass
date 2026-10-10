# Ticket12 independent Standards/depth review

Reviewer: independent Standards agent, distinct from writer, coordinator and Spec reviewer. Final frozen source `84772f6d53431ada5a2b30f3ad9531e960ed95a0`, branch `codex/map-ticket12`. Accepted dependency base `80bae39f5ccbd462a48ae33b1c2e974f5988a2e2`; integrated architecture assessed against planning `0b596249f1598da1df102046c9e7823e66067983`.

**PASS for Ticket12 Standards and implemented depth.** No unresolved actionable Ticket12 regression. One inherited P3 accessibility advisory is recorded below, outside accepted Ticket12 production ownership. This is not a finding-free application or hosted-readiness claim.

## Source grounding

Read AGENTS.md/all five agent documents, CONTEXT.md, ADR0001/0003/0004/0005, accepted spec/architecture/ticket12 and codebase-design including DEEPENING.md. Read actual App/workshop/RegionSelection/MapScene/Party Display imports and implementations, PartyContent types/both adapters, map-artwork/map-region/map-reveal-mask, server generation application/store/provider/verifier/worker and authoritative version/privacy/mask/generation migrations. Reviewed all Ticket12 committed changes. Production src, migrations and server runtime remain byte-equal to accepted80bae39. Ticket12 adds verification and release documentation; final corrections affect assertions/configuration and delivery sequencing only.

Client imports domain/features/data/library code; its Worker URL resolves to client map-region-worker. domain/map-generation is an intent/result type surface, not server code. Server imports its internal application/store/provider/verifier/worker. No provider/credential dependency enters client graph; actual import sites were independently read alongside12-import-graph.json. Dynamic react-dom/server is a rendering library, not generation server.

## Implemented depth and deletion test

Grid Map domain hides validated geometry, source-pixel region conversion, registration compatibility and accepted mask stroke/history/conflict transitions. Deleting it distributes rules across workshop/display/adapters. Views capture gestures and consume domain results; no digest grants registration.

PartyContent retains the existing semantic workspace/version/generation/presentation/reveal seam. Local transactions and Supabase row/storage/receipt/cleanup mapping stay in adapters. Stable SQL workspace/presentation snapshots and local transactions return coherent accepted artwork/mask; observation invalidates authoritative reads. Deleting it exposes authority, immutable files, requests and cleanup to callers.

Server generation execute hides durable claims, usage/deadline/cancel/reconciliation, proof staging and atomic attachment. Provider and owned SQL/storage are internal injected adapters. Completed recovery re-reads immutable bytes and independently verifies proof; browser passed flags/digests cannot attach results. Deleting it spreads provider/billing/proof machinery across workshop/transport.

Party Display retains popup/session/render epochs/calibration at the existing module. It consumes accepted snapshots; registration/family changes require setup acknowledgement. Private MapScene rasterization returns opaque visible pixels; only copied visible canvas reaches popup, never original image URLs/source SVG/prompts. Deleting it spreads safe-frame/session/popup/stale/cancel lifecycle into callers.

Lossless browser assembly is one internal worker command, not a forwarding facade. PNG handling preserves unpremultiplied RGBA including alpha-zero RGB; only selected bytes are replaced. Independent server decoded-RGBA verification is necessary authority separation, not duplicated UI business logic. Client format hints do not replace server validation.

App remains navigation/composition and existing display-intent wiring. matchingMapGeometry is reused by masks/stages/display; digest checks integrity while immutable lineage/verified constrained revisions determine registration. SQL enforces trust-seam invariants independently, not via workshop job state machines. Shared MapScene is private rendering reuse. No new shallow facade or button-level PartyData interface was added.

DEEPENING dependencies: pure domain computation is in-process; SQL/storage has local substitutes; server transport is owned remote; image provider is true external/injected. Tests exercise interface outcomes, including real local policy/storage commands, not merely helper internals. Existing meaningful tests are reused in one combined config.

## Independent checks and inspected evidence

Independently executed `node --test supabase/functions/map-generation/application.test.mjs supabase/functions/map-generation/verifier.test.mjs .scratch/map-creation/provider-probe/probe.test.mjs`:93PASS/0FAIL/0SKIP at222e42f0. Those exact modules/tests remain unchanged through84772f6d, verified by diff. Output:/private/tmp/ticket12-standards-pure.txt. Earlier accepted-base run92PASS predates added controlled429 test. Independently inspected SQL/privacy/render authority and final source equality; no SQL/browser/provider fixture mutation by reviewer.

Writer evidence inspected distinctly: buildPASS;41domain outcomes;42application outcomes;9rollback SQL files/233assertionsPASS with exact baseline restoration. ENOENT SQLPATH failed attempt preserved. Initial combined222e42f0:51PASS/5FAIL/0SKIP. Affectedc4297a5d:3PASS/2crossFAIL. Final84772f6d:2crossPASS/0FAIL (laptop28.8s/phone27.7s). All56 distinct cases therefore have aggregate passing evidence51+3+2; **not a clean56-case single run**. Failure logs/contexts preserved. Reruns address bounded readiness waits, actual PNG state/pixels and route fulfillment; production unchanged.

Independently read final logs and compared JSON: final schema/data/all26 table hashes exactly match before. Writer final cleanup reports25owned parties/DMs, eight Players/33users,6objects and49182runtime removed; initial86/affected13objects retained in evidence. No original deletion/reset/hosted migration/merge/deploy/paid action by reviewer.

## Inherited advisory and limits

P3: PDFpage2->PNG replacement can retain canvas aria-label Party Display page2 while canonical state is1/1 and correct replacement pixels appear. Confirmed identical ordering in planning0b596249: label set before image branch emits canonical page. Outside Ticket12 production ownership; coordinator scopes to follow-up, documented12-owner-handoff-request.md. No silent production fix. Corrected cross test proves state/pixels and does not claim accessibility label correctness.

Retained-artwork fixtures are labelled, not fresh live-provider proof. Carry07cold PREPARE3071ms and this run2608msCPU failure; initial123stages/119shutdowns leave four without exit logs. Affected runtime11/11 shutdowns reports maximum2035ms EarlyDrop above configured2000ms, with no CPUTime reason; that is not universal qualification. Final8/8 shutdowns report maximum1210ms and no CPUTime/memory-exceeded flag. No universal cold-runtime guarantee, and passing phoneInvent does not establish causality/recovery for2608msinstance. Localiat120s margin preserves absoluteexpiry/expiredDMdenial, not freshAuthlogin proof. Hosted topology/projector measurement remain unverified. Runbook records dependency-ordered migrations, preservation/hash inventories, old-client denial, rollback limits and deployed smoke without authorizing execution.
