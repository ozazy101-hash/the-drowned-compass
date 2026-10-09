# AI map artwork, private versions and manual display reveal

Status: accepted design; implementation unstarted
Date: 2026-10-09
Base: released main `823e00a4b6a89ef7071527b6dfba6bde899099b0`

## Goal and evidence

Let the Dungeon Master create an illustrated Grid Map from a description or sketch, improve selected areas, retain earlier artwork versions, build later story stages, and manually uncover parts of a complete map on the extended Party Display. Maps stay private to the DM; players receive no Grid Maps through the Party Library. Handout sharing remains unchanged.

The user accepted the features of [Prototype2](issues/02-prototype-revisions-and-display-reveal.md), source commit `eb611e7`, branch `codex/map-art-prototype`, standalone `src/features/grid-map/prototype-map-art/index.html`. The earlier prototype and [research](research.md) explain the sketch-to-art decision. Artwork samples are genuine generated images; prototype generation and revisions are simulations. Acceptance validates the workflow, not arbitrary AI geometry fidelity, production access control, latency or cost.

This spec replaces prior map-specific requirements for presenting to automatically reveal maps in the Party Library, externally generated artwork only, no versions and no manual Fog of War. [ADR0005](../../docs/adr/0005-private-map-artwork-and-manual-display-reveal.md) records the tradeoff. Existing Handout rules and game-grid/physical-calibration separation remain authoritative.

## Language and interaction

Use the root CONTEXT.md glossary. Map Artwork Version means an immutable illustrated result; Prepared Map Stage means a selected version intended for a later story state. A Reveal Mask determines which map areas appear on the display. Artwork edits change pixels; Uncover/Hide changes the mask. Present applies to the DM-controlled display; map presentation grants no player-device access.

Starting labels: Invent a map, Use my sketch, Create map, Try another version, Select an area to change, Create area revision, Compare versions, Use this map, Uncover areas, Hide areas, Open extended display. Test clear language with the integrated preview. Avoid mandatory manual-review checkbox gates: provide an alignment/scale reminder and explicit Use this map. Unreviewed candidates are never automatically displayed.

## Creation and alignment

1. DM sets columns/rows and game feet per square; inherit supported limits (2–80 per dimension, 1–100 game feet). Choose dimensions before generation; prototype24×18 is not a production limit.
2. Invent a map accepts a scene description. Use my sketch accepts a freehand closed room outline, rough existing Grid Map drawing, or uploaded image reference. Both accept appearance instructions and produce private artwork. Sketch drawing needs clear/reset/undo and works with pointer/touch; reference upload remains available for complex curves.
3. Request orthographic overhead art without baked grid, labels, tokens or people unless intentionally requested as decoration. Exact room/entrance preservation is a requested constraint, not a promise. Compare the reference outline and grid with each result before use.
4. Existing finished-art upload remains supported (PNG/JPEG/WebP, existing20MiB/16-million-pixel validation unless deliberately amended). Fit proportionally, never stretch. Provide scale and position controls with reset-to-fit; letterboxing and mismatched aspect ratios are explicit. Grid coordinates, image placement and calibration remain separate.
5. Layout references and prompts are private DM content. Artwork is flattened imagery; it does not create editable walls, automatic collision, movement or line-of-sight rules. Existing drawing tools remain available and must not unexpectedly cover artwork.

## Versions, retries and AI jobs

- Save completed results durably as immutable Map Artwork Versions within one Grid Map family, with parent/version identity, dimensions/placement, origin (generated/uploaded/revised), instructions/reference and job identity. Keep editable drafts distinct from accepted saved geometry. Existing grid documents remain readable.
- Try another version creates a sibling from the same starting brief/reference. A selected-area revision or later stage branches from the selected saved version. Keep previous versions and allow comparison and branching from an older one. Selecting an item for inspection changes no display.
- Use this map explicitly selects a saved version for presentation. Generation, failed jobs, retries, uploads and edits never replace a currently displayed version implicitly. No version-deletion UI in this first scope; failed-job orphan cleanup must not remove referenced artwork.
- Call the chosen provider only behind a DM-authorized server-side operation, compatible with the existing static frontend/Supabase deployment. Keep credentials out of frontend bundles, logs and client responses. A live provider adapter and deterministic local fixture adapter satisfy one focused generation interface; adapters must be visibly distinguished in previews/evidence.
- Represent queued/running/completed/failed/cancelled results. Expose useful progress, retry and cancellation; cancellation may not stop provider billing and must not attach a late result. Expired session, rate limit, timeout, malformed/oversized output and failed storage writes produce recoverable feedback with existing work intact.
- Persist request identity so retry/polling/reconnect does not submit or charge a duplicate provider request when outcome is known; after uncertain submission reconcile before resubmission. Limits, concurrency, maximum wait, retention and spending controls are selected/documented in03, configured/enforced server-side in06, and tested. Never silently switch model/provider or submit paid jobs just from page load.

## Selected-area changes and later stages

- DM highlights a rectangular area on the map; initial scope is rectangle selection with clear/reselect, precise coordinate mapping under zoom/pan and a text instruction. Selection cannot be empty or outside bounds. Freeform edit masks are deferred.
- Send selected saved artwork, region and instruction to the generation module. Keep canvas size, aspect ratio, registration, grid and unselected source pixels fixed. The browser assembles the region into the immutable source and encodes it losslessly. The server independently prepares the expected decoded RGBA from its own source, candidate and region in one bounded stage, then verifies the submitted PNG in a fresh bounded stage; client assertions cannot authorize acceptance. exact preservation refers to decoded source pixels, not compressed file bytes. The initial AI-edit profile is 1024×1024 RGB/RGBA8 non-interlaced PNG, at most 20MiB encoded. Other AI-edit inputs receive explicit unsupported-format feedback without changing saved artwork; general manual JPEG/WebP uploads retain their existing support. do not use lossy re-encoding that changes unselected pixels. Validate decoded dimensions and mask conventions; optional edge blending stays wholly inside the selected area.
- The model can still move features inside the selected region; comparison/review is required. No claim that a prompt guarantees door or wall preservation. Keep layout aligned by default; first release does not offer unrestricted rescaling or full-scene reframing through an area edit.
- Add a chamber or change scenery for a later stage within the existing map extent, creating another private version. Existing geography outside the selection stays fixed. Enlarge-canvas/outpainting across new grid extents is deferred.
- Compatible stages within the same map family preserve image registration, calibrated square size, pan and Reveal Mask. Family identity alone is insufficient: compare dimensions, placement/registration and grid settings. If incompatible, keep the current display intact, show why, and require explicit new-map setup; the new map begins hidden and requires calibration acknowledgement.

## Manual conceal and reveal

- Provide Uncover areas/Hide areas, brush sizes1/2/4 grid squares, Hide whole map, Uncover whole map, undo/redo, and DM-only hidden-region overlay. First scope is cell-based manual reveal as in the accepted demo; no automated vision, named sections or freeform reveal masks.
- A first presentation starts fully hidden. Uncovering does not regenerate art. Same-family compatible stages inherit the current mask; entirely new maps start hidden. Changes are live on the extended display, reversible, and durably saved as reveal progress keyed by map family and validated registration/dimensions, with accepted revision/conflict semantics.
- Reopening/reloading must restore accepted mask progress and safe selected version after DM authorization. Physical calibration remains session-specific under existing rules. If mask state is missing, invalid or unavailable, remain black until reconciled; no unmasked flash while image/mask loading.
- Two DM controllers editing the same mask must not overwrite each other silently. Define expected revision/conflict feedback at the existing content seam. A brush stroke is one undo action; failed persistence retains the last accepted displayed mask and a recoverable draft. Warn/confirm destructive whole-map uncovering so it is not an accidental story spoiler.

## Private display and migration

- DM controls full artwork and mask. Extended Party Display contains only flattened visible output with an opaque hidden area, grid and stable calibration transform. Do not copy original image URLs, source buffers/hidden imagery, sketch, prompts, selection highlights or DM controls into the display window. This is display-only access, not a player distribution endpoint.
- Enforce DM-only map metadata, versions, job status, receipts and current/historical background bytes in backend/storage, including known object paths. Remove Grid Maps from Party Library and old map Reveal/Withdraw commands; map Use/Present must not grant player access. Keep Handout list/reveal/replace/withdraw/PDF behaviours intact, including an object also referenced by a revealed Handout.
- Existing private/revealed Grid Maps become DM-private without deleting map documents, receipts, artwork or independent copies. Players who already saved material cannot be made to forget it. Remove old map actions from clients and revoke obsolete server grants/routes so stale clients cannot republish maps. Reuse protected immutable files safely; shared Handout grants require explicit policy tests.
- Session loss/sign-out clears the display and stops updates. Closing/reopening rechecks access. No stale async job/render/mask result may restore an old image. Clear display removes the current presentation without deleting private content or saved mask progress.

## Module placement and interface contract

[Architecture review](architecture-review.md) applies the codebase-design skill to planning head `afefbdf` and the released source. The following ownership resolves its findings; implementation must verify it at the checkpoint, not treat illustrative operation names as a frozen SDK.

| Owner | Hidden behaviour | Callers need to know |
| --- | --- | --- |
| Grid Map domain | Validated map/version relationships, coordinate conversions, registration compatibility, region bounds and stroke/undo transitions | Saved source identity; game-space region/gesture; resulting valid state or invalid selection |
| PartyContent, implemented by existing local/Supabase adapters | Authorized map workspace reads/changes, immutable files, accepted revision/conflict results and authoritative invalidation delivery | Party-authorized identities; intent command; request ID/expected revision; accepted result, conflict or unavailable state |
| Server generation application module | Submission/usage reservations, durable job reconciliation/cancellation, server-owned expected-pixel preparation, uploaded-result verification and atomic private-version attachment | Generation intent and job identity/status, independent of provider/storage steps |
| Party Display | Authorized snapshot coordination, explicit selection, stale-work cancellation, safe flattened output and popup/calibration lifecycle | One accepted presentation snapshot and local display settings; no image/provider job orchestration |
| Shared map-scene drawing implementation | Artwork placement, drawing/grid composition and masked frame drawing | Validated scene and view transform; editor/comparison/display do not reinvent coordinate conversion |
| Workshop views | Draft text/gesture capture, private inspection selection, comparison and feedback | Meaningful command/read results; no SQL rows, provider mask polarity or external request scheduling |

### Keep the existing seam small

Extend `PartyData.content`/PartyContent directly where callers already get content; do not add another forwarding facade or a parallel map auth/client factory. Keep related map types/domain functions in cohesive files as needed; moving code into files is not itself a module or interface. App.tsx composes the existing session/content capability and workshop/display views only.

Organize the map capability around workspace read/observe, immutable version/source read, and intent-based changes (attach result/upload, request/cancel generation, choose presentation version, commit reveal stroke), with typed accepted/conflict/error outcomes. These are conceptual interface responsibilities, not a requirement for one giant union or one method per UI button. IDs and revision guards are visible because they express concurrency; object paths, receipt tables, upload/cleanup order, SQL policies and provider payloads stay hidden.

`PartyContent.subscribe` currently supplies Handout snapshots, so map work needs its own authoritative workspace observation within this existing capability. Do not reuse Character subscriptions or make React views own polling timers. Notify accepted job/version/mask/presentation changes and structured read errors; stale deliveries and detach/disposal are handled behind the seam. Jobs finishing produce new private versions, never an implicit presentation command.

### Separate the owned transport from the provider seam

The client reaches our owned generation application through PartyContent's transport adapter. The server application owns the job ledger, quota reservation, storage attachment and cleanup; PartyContent transports its results rather than implementing a second job state machine. Its provider port is internal and injected: real image provider in production, deterministic response/failure adapter in tests. UI callers never choose provider adapters or import secret-bearing/server image code. Distinguish fixture mode in previews, not as a second production user flow.

The application module may use owned storage/SQL adapters internally and ordinary private image utilities. Avoid a public provider registry, generic task engine, generic image-processing framework, one repository per table, or adapters around in-process mask arithmetic.03 proves this port and staged server decode/preservation/runtime feasibility;06 owns the durable orchestration.03's throwaway probe does not become a second production implementation.

### Registration is not an image checksum

Current `supabase-party-content.ts` sets background registration from the file digest and `matchingMapRegistration` compares it. That identity must remain a content-integrity check, not the only geometry identity.04 introduces a trusted registration identity plus canonical pixel dimensions, grid dimensions/distances and image placement. Arbitrary upload and whole-image generation establish a new registration. A constrained region revision inherits registration only after authoritative dimension/placement checks and verified lossless browser assembly preserves all decoded pixels outside its region. Family/parent identity or model assurances alone cannot inherit it.

Use one domain compatibility predicate in the workshop and Party Display; `map-viewport.ts` delegates rather than reimplementing it. Local adapters model the same decisions; the server verifies registration lineage rather than trusting a caller-supplied token. Mask progress belongs to a map family with a validated registration/dimension key, so incompatible geometry cannot reinterpret old cells. Legacy digest-derived registration must be migrated conservatively, preserving compatible identical copies without asserting that unrelated images align.

### Accept a presentation snapshot atomically

A saved last-used version and Reveal Mask must be read/committed as a coherent presentation state: version identity, registration/grid, accepted mask and monotonic revision. Choosing a saved version or committing a stroke applies expected-revision checks at the content seam. Atomic compatibility/mask-retention decisions belong with accepted persistence; popup lifecycle and physical calibration remain session-local in Party Display. Private inspection selection remains separate from accepted presentation selection.

Do not read a latest version and latest mask independently and compose a frame in React. The display consumes one authorized snapshot; each render carries snapshot revision and session epoch, and stale renders cannot publish. An unknown/invalid initial snapshot stays black. A failed new choice/stroke retains the previous accepted frame and recoverable draft. New incompatible registration initializes a hidden mask only through the explicit new-map choice.

07 delivers workshop input/inspection and the selection intent, not a second popup implementation.09 owns mask domain/persistence, not provider/render orchestration.10 wires actual Use this map and mask controls to the accepted snapshot and display.11 completes revised-stage compatibility/pan retention through the same path; it must not add a stage manager or duplicate compositor.04 sets structural/atomic contracts,09 adds mask transitions,10 consumes them.

### Test depth through the interface

Classify pure map transitions/composition as in-process, database/storage as local-substitutable/owned transport, and the image provider as true external. Exercise public commands/results with the local/Supabase adapters and injected provider responses; verify real SQL/storage permissions separately. Test server generation/compositing through its intent/outcome interface, including exact decoded pixel preservation with lossless output. Keep provider-specific mask fixtures inside adapter tests.

Assert accepted versions/masks, conflicts, no duplicate known submissions, cancellation, no implicit display switches, registration compatibility and safe frames. Do not spy on helper calls or expose private hooks purely for tests. If responsibility moves, replace obsolete tests with equivalent seam-level behaviour coverage instead of accumulating duplicate suites. Independently review the deletion test: removing each module would spread its rules into callers. An extra layer whose removal changes no rule locality is rejected.

Before implementing each ticket, record the owning module, a small interface sketch, visible ordering/error invariants and dependency injection. Review03/04 interfaces together before06/09 integration without making04 wait for vendor selection. Keep server/client import graphs separate. Related tickets touching PartyContent/Grid Map/display are coordinated; the dependency graph does not authorize concurrent writes to shared files.

## Verification and delivery gate

Follow docs/agents/ticket-delivery.md and module-design.md. Each ticket records exact committed source head, relevant domain/adapter/SQL checks and focused laptop/phone browser evidence. Verify keyboard access to non-canvas controls and touch/pointer selection, clear progress and recoverable errors. Include large supported image/grid performance without per-pointer network jobs.

At12 run one combined browser/data regression against reviewed heads; repeat only for material changes or unresolved failures. Review Standards/depth and Spec explicitly, with no unresolved actionable findings before acceptance. This spec does not itself dispatch agents. Use genuine local Supabase authority fixtures alongside deterministic generation fixtures; all actual image-provider claims require the03 evidence and focused live checks. Never label simulated generation as live.

Critical cross-feature scenarios: generation while Character edits continue; private map known-path denial; unchanged Handout sharing; cancellation/unknown-result retry; branching without overwriting display; exact unselected pixel preservation; stable same-map stages; mask conflicts/reload; black hidden output and no full-map flash; session loss. Retain original database baselines and owned fixture cleanup.

Local migrations/rehearsal, hosted migration, merge, deployment and deployed smoke are separate states. Preparing this spec authorizes planning only; it performs no implementation or hosted changes. Retain a migration/release runbook including policies, old-client denial, before/after data preservation and safe dependency order. Obtain release authorization when ready under the existing delivery workflow.

## Out of scope

Automatic vision/rules, digital tokens, player-device map access, animated maps, offline sync, community asset catalogues, a full layer/texture editor, map version deletion/retention UI, freeform masks/named regions, unrestricted layout reframing and enlarged-canvas outpainting. These are not needed to deliver the accepted prototype features.

## Implementation sequence

See README and individual tickets03–12.03 settles live provider feasibility and operating limits;04 builds the durable foundation. Later tickets add privacy, jobs, creation, revision/stages, masks and display integration.12 owns combined acceptance. Prototype tickets01/02 are resolved, not remaining implementation work.

## Accepted bounded verification decision — 2026-10-09

User authorized adoption after the server test passed. Accepted frozen verifier source `8e679aede15bfaa106ab8e5f13dbd672c02f1583`, evidence `754354ac5509b39699a3715be07dbd875432af95`; both independent Standards/depth and Spec reviews pass. See provider-evidence/browser-verifier-decision.md for exact runtime limits, retained failure history and provenance. This chooses existing Supabase Edge stages plus browser lossless assembly, without a new hosting account.

06 owns the sole durable job/intent ledger and private prepared proof: verifier version, request/job/origin, immutable source/candidate object IDs and digests, saved parent/revision, approved region and canonical dimensions. Final attachment/recovery re-reads and verifies the same immutable provisional object against that proof and current authoritative bindings; reject expired, swapped, stale or cancelled results. Browser hashes or receipts never grant registration. 04 atomic attachment remains the authority.

Implement defaults: live generation disabled, quota0/spend0, concurrency1, provider wait120s, orphan retention24h. Nonzero paid limits/new paid calls require a separate enablement decision; local fixture development is released now. Hosted authentication/storage/durable recovery and final integration verification remain delivery gates.
