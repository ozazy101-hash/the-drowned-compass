# 03 — Verify live generation and masked editing

Type: research
Status: needs-info
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Prove prompt-only generation, sketch-reference generation and region editing using a documented server-side image API. Select one provider/model and record the actual mask/reference/output contract before production integration. Use a small fixed corpus: curved shrine, sea cave and added chamber. Record credentials/billing prerequisites without exposing secrets; do not silently substitute a different model.

Deliver a reproducible bounded capability probe and decision report, rather than a production UI.

## Module and interface

Generation module with a live provider adapter and deterministic fixture adapter; prototype assets are evidence only, not the production adapter.

## Architecture constraints

The provider dependency is a true external dependency: prove a small injected internal port, including server-side decoding, lossless masked composition within existing size limits, hosting/runtime support, and ambiguous submission reconciliation. Do not invent a multi-provider framework or expose provider payloads to workshop callers. The probe is throwaway evidence;06 owns the sole production job application. Coordinate the normalized output/registration contract with04 without making the persistence foundation depend on a particular vendor.

## Acceptance

- [ ] Follow current official provider documentation and cite exact endpoints/model/mask conventions. Confirm the backend runtime supports generation, references and editing; record decode formats, size limits, waiting/polling and cancellation semantics.
- [ ] Retain input/output images and instructions for all three journeys; report actual latency, output dimensions, usage/cost evidence and observed geometry drift. Distinguish provider guarantees from our observations.
- [ ] Prove authoritative masked compositing can preserve decoded unselected pixels exactly, including mask inversion and boundary cases. Never claim prompt-only fidelity is exact.
- [ ] Select initial server-enforced concurrency, quota/spending cap, timeout and orphan-retention settings from the evidence; make them deployment configuration with explicit documentation.
- [ ] If credentials or provider capability prevent a live proof, record the exact blocker and leave dependent06 unresolved. Do not treat local mocks as success.

## Verification and review

Small live corpus and deterministic invalid-output/mask cases; no full regression. Record the selected interface and failure behaviours for06/08. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).

2026-10-09: Released by coordinator at exact base `0b596249f1598da1df102046c9e7823e66067983`. Isolated branch `codex/map-artwork-provider-probe`. Exclusive ownership: this ticket, `provider-probe/**` and `provider-evidence/**`. No production/shared changes.

Module placement before coding: throwaway server capability probe under `.scratch/map-creation/provider-probe/`. A small injected internal provider port accepts generation intent (prompt, optional reference/source, validated rectangular region) and returns normalized encoded image bytes, decoded dimensions and provider receipt/usage or structured failure/uncertain outcome. Provider payload and mask polarity remain private. Decode, validation and lossless source-region composition stay probe-internal. The caller must know input/output limits, cancellation billing limits and uncertain submission reconciliation; no blind paid retry. Arbitrary generation creates new registration; constrained revision can inherit only after authoritative dimensions and exact outside-region preservation. Ticket06 owns production orchestration.

## Verification checkpoint —2026-10-09

Bounded probe implemented in [provider-probe](../provider-probe/README.md); [decision and evidence](../provider-evidence/decision.md). Source head `1a384308f4f9354f99d3986077238ce19d480716`, branch `codex/map-artwork-provider-probe`. Dedicated implementation and distinct independent review performed. Standards/depth PASS with42/42 independent focused checks; Spec BLOCKED. No remaining actionable source findings.

Missing actual live corpus proof: OPENAI_API_KEY absent at checked process boundaries,0provider calls. User intends secure configuration, but no saved-confirmation/live evidence yet. Supabase Edge decode/composite execution unverified; maximal16M Node composition exceeds documented CPU/memory limits and provider full-canvas output size. No production UI, shared fixtures, SQL, migrations, hosted actions or deployment changed. Ticket03 remains unresolved and dependent06 blocked until genuine provider/runtime proof and observed cost/latency/geometry permit acceptance.

## Live checkpoint —2026-10-09

After user-confirmed secure credential configuration, exactly3authorized synthetic calls completed without retries at unchanged source `1a384308f4f9354f99d3986077238ce19d480716`. Prompt/reference/edit all HTTP200,1024×1024PNG;22.691/21.286/20.150seconds. Retained live receipts/instructions/images/mask/usage in provider-evidence/live-1791537498387. Independent live review verified995776outside pixels preserved exactly and selected pixels equal raw candidate; provider raw outside drift966233pixels. Perspective/layout drift and clipped incomplete chamber documented honestly. Estimated usage cost$0.034969, actual billing unknown.

Standards/depth PASS, evidence sanity PASS, full Spec still BLOCKED on hosted-runtime execution and enforceable spending/runtime limits; dependent06 remains unresolved. No additional paid calls authorized. Source unchanged; evidence committed separately.

## Runtime checkpoint —2026-10-09

Existing local Supabase Edge imagev1.74.3/Deno2.1.4 exercised in isolated credential-free disposable workers under256MB/2000msCPU/150s wall; retained1024 live image revision cancelled at2117msCPU. Minimum1024×640fullfixture cancelled2061msCPU, including fixture construction. Relaxed8000ms diagnostic on earlier compressed encoder preserved995776outsidepixels exactly using7447msCPU/8125mswall;45,691,362bytes shutdown memory is sampled, not peak. No accepted hosted-size ceiling. Owned containers cleaned up; shared services untouched.

Current frozen source `b2f5aa4f45ca91df7a802432688307f277ef90aa`. Distinct independent Standards/depth PASS with43/43checks,0fail/0skip; codec near-limit finding fixed/re-reviewed. Qualifying Edge failures were executed at earlier `f4ed051b556900602b2d53adc086cec6f4760a1b`; final fallback-only fix did not change1024encoding path and received no additional Edge run. Evidence attributes heads explicitly. Full Spec BLOCKED on accepted hosting runtime/enforceable deployment limits. Deployment proposal remainsdisabled/quota0/spend0; separate Node24image worker behind existing authority seam is a least-scope alternative requiring architecture approval and measured hosted proof, not silently substituted.06owns production enforcement; missing06ledger implementation alone is not claimed as03blocker.

## Hosted worker research —2026-10-09

Coordinator requested bounded primary-source research after measured Edge CPU failure. [Concrete Node24worker option](../provider-evidence/node-worker-option.md) proposes AWS Lambda ARM64,2048MB/60s/reservedconcurrency1, AWS_IAM/SigV4 and scoped private object transport;06retains sole job/authority/spending/attachment ownership. Includes decoder limits,2houruploadcapability limitation, exact receipt re-verification after lost response, billedINIT-aware cost baseline and reversible local RIE proof plan. Distinct independent planning review PASS after fixes. This is a reviewable architecture proposal only: no accounts/provisioning/deployment/install/imagepulls/shared sourcechanges/paidcalls performed. Full03Spec and06remainBLOCKED pending architecture decision and actual hosted proof/limits.

## Authorized local Lambda proof —2026-10-09

Coordinator approved local proof only; officialARM64Node24image pulled/pinned digest `sha256:9456eddcb52b414c777c7dfb4f9fb6871c103f63183871e74e505bdb3461104b`. Frozen source `82f8a2db91a363ca1aaff187ba3d2e17ca6b6081`. Distinct independent Standards/depth PASS and local feasibility/Spec evidence PASS;27/27worker tests,0failed/0skipped. No remaining actionable source findings. Existing43baseline checks retain prior head attribution.

Actual retained-live source/rawcandidate replay had4/4correct local outcomes: fresh/warm/recovery verified995776outsidepixels0changed and selectedpixelsrawexact; lostuploadresponse uncertain. Fresh4746mswall/4697msCPU;warm1426/1427;recovery1949/1960. Cgroup2GiB/1CPU cap and cumulative198,823,936bytepeak observed.60soutertimeout,512MiBtmp,readonlyroot/mount;exact1024PNG/20MiB/16KiBcommand/deadline caps. Source/candidate byteidentical to original synthetic provider outputs; independent reviewer reconstructedoutputdigest/size. Historical deterministic replay/startupfailure evidence remains separately labeled. APNG/host/redirect/digest/deadline/bounds/readback/partialupload/recovery negative cases tested.

Allownedcontainersremoved,port4194released,preexistingimagespreserved. No credentials/campaign data/newprovidercalls/AWSorSupabasehostedcalls/productionorSQLchanges. Full03Spec and06remainBLOCKED pending approved hosted runtime/realIAM/scoped expiring capability/durablestorage/recovery/isolation/limits proof. Candidate local configuration measured successfully;06solely owns productionledger/provider/usage/cancel/atomicattachment enforcement. See [local worker proof](../provider-probe/lambda/README.md) and decision.

## No-new-host WASM comparison —2026-10-09

Userauthorized bounded magick-wasm test. Pinnedofficialpackage0.0.44; exactregionCopy replacement, losslessRGBAPNG, retained1024syntheticlive+transparent/lowalpha/noisyfixtures. Distinct independent Standards/depth PASS onsource `e5c9c8c1c44c44c76460b88dd82de05c7756ca37`; independent9/9Nodechecks, packageintegrity and historicalEdge995776outside/52800selectedpixelcomparisonPASS.

ExecutedEdge resource verdict: unreliable/notaccepted. InitialcoldCPUTime2407nooutput; intermediateexactoutputs had unavailablefinalresourceevents/warmtermination; final ONElevel0compression rerunCPUTime3626/HTTP500/initwall6606.984ms/noPNG/warmskipped. Workerbudget2sCPU/256MB;61,813,680shutdownmemory is a sample,252,678,144wholecontainerpeak separate. No relaxed result countedPASS, noresolution/color/transparencycontractchange, noalllibraryimpossibleclaim. Executedcompositionhead `a7b1f6d1a1f8f87aa56b4455efb0d3ccbe77ab41`; finalharness-onlyfixes re-reviewed, nofurtherruns.

[Comparison evidence](../provider-evidence/magick-edge-1791562499380/decision.md). Allownedcontainersremoved/4195released; noAWSsignup/provision/hosteddeploy/migration/credentials/newprovidercalls/sharedsource. Full03Spec remainsBLOCKED;06notreleased. EarliercustomJSfailure did not establish allcompositorinfeasibility; this bounded library comparison now independently supplies its own limited executed evidence.

## Browser assembly prototype pointer —2026-10-09

User authorized prototyping browser composition. Retained primary source/evidence in isolated branch `codex/browser-compositing-prototype`, commit `fe48909`, `.scratch/map-creation/browser-prototype/prototype.html` and README. Self-contained HTML, no AI calls/credentials/uploads/shared source. Four actual browser assembly/export cases independently verified by existing Node decoder:995776outside/52800inside pixels exact, including transparency/lowalpha/noise. Initial browser wall times252.8–359.9ms, phone-width desktop402.3ms (not real-phone/per-device guarantee). Tamper/invalidbounds/reset/stale-selection paths checked. Browser feasibility demonstrated for bounded1024RGB/RGBA scope only; server authority, production upload/recovery and formats/device limits unresolved. Client checks cannot satisfy existing server-trusted preservation contract; no production adoption,03acceptance or06release inferred.
