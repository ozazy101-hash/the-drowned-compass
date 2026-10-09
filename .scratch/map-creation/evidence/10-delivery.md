# Ticket 10 delivery — 2026-10-10

Ticket: Render only uncovered areas on the extended display.
Branch: `codex/map-display-10`.
Worktree: `/Users/oscarpauwels/.codex/worktrees/map-display-10/Dungeons&Dragons`.
Accepted dependency base: `d8d43e6f0f789ccc7c3f2ace540fa6e87c664576`.
Frozen final source: `8964763df2d90c1d65cf34726053a14d13871499`.
Evidence commit: this separate documentation commit; resolve its exact SHA through Git.

## Delivered behavior and depth

Existing Party Display owns explicit saved-version choice, authorized atomic presentation consumption, expected-revision reveal persistence, private flattened rendering, popup and session lifecycle. App only wires workshop selection and controls. Shared MapScene reuses MapDrawing; only opaque uncovered canvas pixels enter the popup. Full artwork, URLs, prompts, references and DM overlay remain in the controller. Mask draft observation stays in the existing domain module with monotonic accepted state, dirty/active/error conflict retention, family/mask/geometry retry checks and deferred pending reconciliation.

Fresh Open restores the saved atomic version and reveal progress after authorization, starting black. Clear suppresses restoration within the controller. Popup closure invalidates rendering while still-current authorized saves settle; Clear, content replacement, disposal and session loss invalidate controller work. Calibration and pan remain independent of reveal changes. Existing Handout/PDF lifecycle is retained.

Module contract: [10-module-contract](10-module-contract.md).

## Exact review and verification

- TWO distinct independent reviews: Standards/depth **PASS**, [10-standards-8964763](10-standards-8964763.md); Spec **PASS**, [10-spec-8964763](10-spec-8964763.md). No unresolved actionable source findings. Earlier reviews at7099da2 failed one P2 each; their reports are retained. Both fixes were independently re-reviewed.
- Production-identical build **PASS** atf024225, independent reviewer build **PASS**; final fixture script syntax and test collection **PASS** at8964763. Production files are identical between those heads.
- Focused domain **24/24 PASS** (mask/artwork/viewport); independent mask-domain **14/14 PASS**. [10-domain-reviewfix](10-domain-reviewfix.txt).
- Focused laptop/phone browser **24/24 PASS**, including existing ten Handout/PDF checks, private opaque output/DOM, actual workshop Use, pointer/touch, blocked popup, stale choice/decode, Clear/session blanking, calibration isolation, reload and pending-save close success/failure. Strengthened final lifecycle assertions **6/6 PASS** atf024225. [Full](10-browser-reviewfix24.txt), [affected final](10-browser-reviewfix-final6.txt).
- Supported maximum artwork/grid browser checks:4000×4000 PNG/80×80 grid; bounded4080×4080 output, hidden RGBA[0,0,0,255],20 pointer samples cause0 persistence calls followed by1 save and0 generation calls. Observed initial frames709ms laptop/359ms phone emulator are diagnostic samples, not universal performance guarantees. [10-browser-affected](10-browser-affected.txt).
- Final genuine LOCAL Supabase laptop+phone **2/2 PASS** on8964763: real storage/version reads, cell persistence, competing accepted conflict/retry, intentional503 recoverable draft/frame retention, reopening, fresh controller reload without another Use, Player/expired-DM/anonymous known-version denial, actual owned DM membership revocation, two-page PDF/content switching. [10-live-frozen-8964763](10-live-frozen-8964763.log). No live AI provider claim.
- No new migration or SQL policy changes. Real local authority/persistence exercised through accepted adapters; no extra pgTAP suite needed for unchanged SQL. Exact schema/data/original table hashes **equal** before/after final fixture run: schema`ee3810b06c6316094d45b09c676372e18efd6694e1c8a97d98597a29dc4eec1d`, data`d179b9c136736dc896ad4896757e1c37119a181dd8098fc92152ffa14d7d4baf`. [Before](10-baseline-before.json), [after](10-baseline-final.json).2 unique owned parties,4 auth users and4 objects removed. No provider/backend runtime used.

## Honest limits and retained diagnostics

Original final laptop setup and unchanged retry failed before presentation with401/PGRST303. Instrumented actual requests showed `JWT issued at future` with matching intended/sent token fingerprints and one response timestamp43 seconds behind issuance. Node10-request and browser30-request minimal loops passed; two paired original/backdated probes both passed. Precise validator/proxy clock/cache cause remains unknown. Two bounded backdated laptop diagnostic journeys passed, then the final two-device run above passed.

The LOCAL fixture runner now explicitly issues iat120 seconds before host issuance and preserves absolute exp at host issuance+3600 seconds. It also exercises deliberately expired DM tokens. This is a documented local-fixture skew allowance, not a production auth-policy change, fresh Supabase Auth login proof or universal root-cause fix. Historical red logs and fingerprints remain retained: [diagnosis](10-auth-fixture-diagnosis.md), [final original failure](10-live-frozen-f024225.log), [unchanged retry](10-live-frozen-f024225-laptop-retry.log).

Live generation remains disabled; no paid calls, hosted migration, reset, main merge or deployment. Integration ticket12 must carry the local clock/fixture limitation and perform the combined gate.

## Source equality and lease closure

Source is frozen at8964763. This closure changes only tracker/evidence documents. Verify equality with `git diff --exit-code 8964763df2d90c1d65cf34726053a14d13871499 HEAD -- src tests e2e scripts supabase '*.config.ts' package.json pnpm-lock.yaml` after committing evidence.

Owned fixture cleanup completed and exact original baseline restored. Writer/reviewers hold no process or fixture. Browser4180 and optional backend49180 leases are released to the orchestrator after port check; coordinator4186/4196 and other checkouts/previews preserved. Ticket10 does not release11 or12, merge main, apply hosted migrations or deploy.
