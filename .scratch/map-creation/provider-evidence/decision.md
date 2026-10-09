# Ticket03 evidence —2026-10-09

Live provider transport/corpus: **3/3 completed** at frozen source `1a384308f4f9354f99d3986077238ce19d480716`; [unaltered live report](live-1791537498387/report.json) retains provider receipts and usage. The earlier credential-absent report describes the preflight checkpoint only; secure configuration subsequently enabled the authorized corpus. No further paid calls are authorized by this report. Server-runtime acceptance remains blocked;06 stays unresolved pending hosting proof and measured enforceable limits.

|Journey|Latency|Decoded output|Text input tokens|Image input tokens|Image output tokens|Pricing estimate USD|
|---|---:|---|---:|---:|---:|---:|
|Curved shrine, prompt only|22691ms|1024×1024 PNG|56|0|196|0.006160|
|Sea cave, sketch reference|21286ms|1024×1024 PNG|69|1024|196|0.014417|
|Added chamber, masked revision|20150ms|1024×1024 PNG|64|1024|196|0.014392|

All three returned HTTP200 with the explicitly selected `gpt-image-2.5-sunburst`, low quality, PNG, n1. Instructions, sketch/source, raw provider images, inverse-alpha mask and accepted images are retained in `live-1791537498387/`. Timings include local normalization and artifact writing around the request and therefore are end-to-end probe latency, not isolated provider compute time.

[Official model pricing](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) and [standard API pricing](https://developers.openai.com/api/docs/pricing), fetched2026-10-09: text input $5/million, image input $8/million, image output $30/million. Applying those standard uncached rates to returned usage gives **$0.034969 estimated total** (text189 tokens=$0.000945; image input2048=$0.016384; output588=$0.017640). Actual invoiced/billed cost remains unknown; `billingCostUSD` stays null. This arithmetic is not a provider invoice, hard cap or guarantee of future cost. [Image guide](https://developers.openai.com/api/docs/guides/image-generation) explains masking as model guidance rather than exact editing fidelity.

Coordinator visual inspection of retained outputs: shrine is angled rather than strictly orthographic; sea cave retains the broad round cavern and southern entrance but rough walls/islets drift from the sketch; raw added chamber extends beyond the220×240 selected rectangle at(650,160), and authoritative clipping does not yield a complete connected chamber. These are observations of this corpus, not provider guarantees. The raw masked candidate changed966233 of995776 outside-region pixels (~97.033%). The accepted composition reports exact preservation of all decoded outside pixels; a distinct reviewer independently verified995776/995776 outside pixels, exact selected candidate pixels and0mask-polarity mismatches. Pixel invariance does not establish semantic chamber success or alignment inside the selected region. No prompt-only geometry fidelity is claimed.

Initial provider-source verification:42/42 Node tests pass,0 failed/0 skipped. Covers arbitrary generation/reference normalization, four region cases including full canvas/corner/right-bottom edges, alpha mask inversion, five invalid rectangles, dimensional drift, four corrupt output cases, invalid source/source identity, credential absence, HTTP401/429/500/408 classification, ambiguous disconnect without retries, invalid base64, request/receipt/usage contract,16million-pixel roundtrip and over-limit rejection. `deterministic-tests.txt` is executable output. Mock HTTP calls are fixtures, not provider submissions.

`fixture-*` images retain local sketch, inverse-alpha mask, deliberately globally changed candidate and composed result. `fixture-composition.json` records exact decoded unselected pixel preservation; this fixture demonstrates arithmetic only. Those fixture images are separate from the subsequently completed live corpus. Live fidelity observations appear above; prompts remain reproducible in `provider-probe/corpus.mjs`.

Runtime: local Node24 darwin arm64, builtins only. `runtime-local.json` measures complete constrained revision (decode, mask, compose, encode and roundtrip) for1024square:328ms wall/375ms CPU/~100MB peak process RSS;4000square:4913ms wall/4870ms CPU/~466MB peak RSS. RSS is cumulative process peak, not isolated operation allocation. CPU/RSS are not Edge proof; maximum-size Node case exceeds documented Edge2s/256MB. Initial read-only inventory found no running Edge worker/Deno host executable. This availability checkpoint is superseded by the isolated existing-image worker tests below. No shared fixtures mutated, no runtime installed and no hosted deployment performed.

Selected port/04 handoff: normalized PNG MIME/encoded size/SHA256 digest/canonical decoded dimensions; request/origin/parent identity; constrained region composition source digest/outside count/raw drift evidence. `server-verification-required` never authorizes inherited registration.06 must resolve saved parent and canonical grid/proportional placement and attach atomically through04's trusted server-only path; arbitrary outputs establish new registration. Receipt/attachment does not select presentation. No SQL/browser/application changes.

Initial deployment settings remain tentative and generation defaults disabled with quota/spend0. Proposed concurrency1/quota3/day/wait120s/orphan24h are informed by three~20–23s live journeys but still require durable spend reservations, an approved spending ceiling and a measured hosting-runtime ceiling; full16million-pixel support remains a runtime blocker. Unknown paid submissions retain reservations and reconciliation metadata; no automatic paid retry or refund/cancellation promise.


Source freeze: `1a384308f4f9354f99d3986077238ce19d480716`. Distinct independent reviewer at the earlier preflight checkpoint: Standards/depth PASS, Spec BLOCKED on actual live corpus and accepted server runtime proof; no remaining actionable source findings. The corpus is now completed; independent live evidence and pricing review PASS; full Spec acceptance remains BLOCKED on hosted runtime and enforceable spending/runtime limits. Independent42/42 checks passed,0failed/0skipped. Earlier source `4466b62120e7a940426f7d62e5d1b2394fddf9e9` failed review for large-response regex overflow and missing provider dimension checks; both fixed and re-reviewed. Added >4MiB response, canonical base64 rejection and pre-submission live-dimension cases.

Provider output limits are separate from composition/upload limits: multiples of16, edges at most3840, aspect ratio1:3–3:1,655360–8294400pixels; larger than2560×1440 experimental. A4000-square source cannot receive a same-size live edit; no silent resize.04 handoff maps width/height to pixelWidth/pixelHeight and generate/reference to generated, revise to revised.

No browser/SQL/migration/hosted/deployment checks: this ticket changed only probe-local source/evidence. No production integration or release is accepted.


Final independent live review:3distinct HTTP200receipts,1024×1024outputs with matching sizes/digests,2825total tokens. Source Standards/depth PASS;42/42independent checks remain applicable. Evidence sanity PASS, including pricing arithmetic and fidelity limitations. No new source findings.


## Actual isolated Edge runtime checkpoint

Qualifying-failure runtime source freeze: `f4ed051b556900602b2d53adc086cec6f4760a1b`; current source after byte-limit review fix: `b2f5aa4f45ca91df7a802432688307f277ef90aa`; prior live corpus remains from `1a384308f4f9354f99d3986077238ce19d480716`. No new paid calls/credentials access. Runtime changes preserve decoded pixels while PNG encoded bytes/digests can differ. Distinct independent review completed on current `b2f5aa4`: Standards/depth PASS,43/43 checks passed with0failed/0skipped; no remaining actionable source findings. Full Spec remains BLOCKED on accepted hosting runtime and enforceable limits. Reviewer found a near20MiB uncompressed block-overhead rejection at `f4ed051`; current source checks actual encoded size and falls back to lossless compression before rejection.

Existing public.ecr.aws/supabase/edge-runtime:v1.74.3 image, IDsha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c, linux/arm64, Deno2.1.4 compatible. Only owned disposable containers, localhost4193, readonly probe/evidence mounts, no secrets forwarded, no shared Supabase restart/mutation. Containers stopped/removed. [Pinned worker example](https://github.com/supabase/edge-runtime/blob/v1.74.3/examples/main/index.ts) and [event manager](https://github.com/supabase/edge-runtime/blob/v1.74.3/examples/event-manager/index.ts) informed the isolated harness. The image is an existing local version, not confirmation of hosted runtime identity/hardware.

Qualifying limits were actual user-worker256MB memory/1900ms softCPU/2000ms hardCPU/150000ms wall and150000ms idle; one fresh worker/request. Initial worker exposed Node globalBuffer absence, corrected with explicit builtin node:buffer imports. Builtin node:zlib/node:crypto subsequently loaded; no dependency/native/WASM installation.

|Case|Worker budget|Outcome|Supervisor CPU|Meaning|
|---|---|---|---:|---|
|Initial retained1024-square live source/candidate replay|2000msCPU/256MB|Cancelled|2040ms|Current codec failed hosted-envelope CPU|
|CRC/filter optimized retained1024 replay|2000msCPU/256MB|Cancelled|2042ms|Optimization did not establish feasibility|
|Optimized noisy1024 full fixture|2000msCPU/256MB|Cancelled|2029ms|Deterministic full-workload failure|
|Legacy4000-square full fixture|2000msCPU/256MB|Cancelled/emptyHTTPresponse|2059ms|Outer upload limit is not accepted Edge generation size|
|Compressed retained1024 diagnostic replay|8000msCPU/256MB|Accepted|7447ms|Explicitly nonqualifying relaxed-budget diagnosis|
|Final retained1024 replay with uncompressed-smallPNG output|2000msCPU/256MB|Cancelled|2117ms|No accepted1024 Edge ceiling|
|Final provider-minimum1024×640 full noisy fixture|2000msCPU/256MB|Cancelled|2061ms|Includes fixture construction; not isolated minimum-size compositor proof|

The compressed diagnostic case used the earlier encoder before the final uncompressed-smallPNG choice; its measurements are historical and are not represented as current-head performance. The case reported8125ms wall, exact0 changed among995776 decoded outside pixels, and supervisor shutdown memory45,691,362bytes. Deno phase snapshots had roughly53MB external/14MB heap; these are sampled values, not peak allocation. Deno RSS0 is unavailable, not actual zero. This proves basic compatibility at a larger diagnosticCPU budget, never success under documented hosted2s. Raw events/responses are retained asedge-*.log/json/txt. `runtime-node-tests.txt` contains43/43 focused regressions at `b2f5aa4` after codec changes,0fail/0skip, including1456×3600 compressibleRGBA near20MiB that previously failed on uncompressed block overhead. No further Edge run was made after this narrowly scoped fallback; retained1024 output stays on the same uncompressed path, so the existing CPU failure remains a blocker rather than claiming exact-current-head runtime success. These are deterministic/runtime checks, not additional live submissions.

No Edge hosting size ceiling accepted. [Disabled deployment proposal](../provider-probe/edge/deployment-proposal.json) leaves generationdisabled/dailyquota0/spend0 and documents tentative1024 dimensions/concurrency1/wait120s/orphan24h separately from16million-pixel uploads and provider bounds.06 must own real enforcement/ledger/attachments. Least-scope alternative is a separately provisioned Node24 image worker behind the same existing server authority seam; local Node evidence does not establish that hosted alternative. Provisioning/authority transport/resource caps need coordinator architecture approval and measured proof before enabling. Further custom-codec optimization and unproved WASM/native substitutions were not performed.06 remains blocked on accepted runtime/limits.


Current final reviewed source: `b2f5aa4f45ca91df7a802432688307f277ef90aa`. Evidence commit is separate and must leave provider-probe source equal to that freeze. Runtime feasibility work completed; measured Edge CPU incompatibility is a configuration/runtime blocker, distinct from ticket06 owning production enforcement implementation. No accepted enabled-hosting decision or nonzero spending ceiling is claimed.


## Bounded local Lambda alternative checkpoint

Initial synthetic-worker source freeze: `96968c0352abb7cf18bad6c122269ce682cc3f99`; current retained-live replay/cleanup-fix source freeze: `82f8a2db91a363ca1aaff187ba3d2e17ca6b6081`, based on evidenceHEAD `4e6c9b0695a661b6bed9dbdb5f9df1d819ea26dc`/reviewed codecsource `b2f5aa4f45ca91df7a802432688307f277ef90aa`. Distinct independent review pending. No additional image-provider, AWS hosted or Supabase calls; no credential access. InitialRIE proof used preexisting deterministic1024-square source/candidate images in probe-owned lambda/corpus. Subsequent coordinator authorization explicitly added/replayed the exact retainedlive sea-cave-output and added-chamber-raw images, without another provider request or unrelated campaign-data mount.

Official image public.ecr.aws/lambda/nodejs:24 ARM64 pulled under explicit coordinator authorization and pinned tosha256:9456eddcb52b414c777c7dfb4f9fb6871c103f63183871e74e505bdb3461104b. No preexisting image removed. Actual image Nodev24.21.0linuxARM64. LocalRIE harness enforces cgroup memory2048MiB/no additionalswap,1CPU quota,512MiBtmp,readonlyroot/probe-only mount,exclusive127.0.0.1:4194,60s outer watchdog that kills owned container; finally stops it on any success/failure. Containers removed and4194 released. Private synthetic HTTPstorage stub on internal127.0.0.1:8081 uses no account secrets and no external transport.

`lambda-unit-tests.txt`:27/27focused checks pass,0fail/0skip. Observable verify/reverify outcomes include exact995776outside0mismatch, fullrectangle outsidecount0, forged-but-self-consistent output digest rejection, independent selected-candidate comparison, same-operation read-only recovery after lost write response, null/malformed commands, provenance/region binding, foreignoperation, partial provisional upload, hostile host/redirect, bytes both with/withoutContentLength, actualPNG header pixelceiling, APNG framechunksbeforedecode, expired/deadline/late receipt, unauthorizedread and immutable writecollision.

Actual localRIE evidence: `lambda-rie-1791540743573/summary.json` and per-call files/container.log. Fourplanned synthetic-corpus calls completed with expected outcomes; a separately authorized four-call retained-live replay is recorded below. No paid provider request or second job ledger exists.

|RIEcase|Outcome|Handlerwall|ProcessCPU|Cgroupmemory.peak atread|
|---|---|---:|---:|---:|
|Fresh verify|verified|3617ms|3602ms|196280320bytes|
|Warm same-operation reverify|verified|1240ms|1275ms|211746816bytes|
|Lost write response|uncertain|762ms|777ms|234283008bytes|
|Same-operation recovery|verified|446ms|460ms|234283008bytes|

All three verified cases independently decoded stored output and exact retainedsource/rawcandidate:995776outsidepixels0mismatch, insidecandidateexact. Source/candidate/output SHA256/region/sourceIdentity/operation identity are retained; reverify never writes or invokes provider. Digest-only self-consistency is insufficient; current proof requires canonical encoded identity as well as decoded equality. Kernelcgroup `memory.max=2147483648`, `cpu.max=100000 100000` confirm localconstraints. memory.peak is cumulativecontainerhighwater at handler read includingemulator/runtime/localstub, not per-invocationincrement or hostedpeak. RSS is sampled separately. Runtimeinitialization~5186ms is separate from handlerwall. EmulatedREPORT MemorySize/MaxMemoryUsed3008MB/BilledDuration are defaults; they are not used as memory/billingproof. Initialstartup-onlysocketclose `lambda-rie-1791540676649` yielded nohandleroutcomes and was superseded by HTTPreadiness detection; it is retained honestly.

[OfficialAWSNodeimage docs](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html), [hostedmemory/CPU docs](https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html) and [RIE scope](https://github.com/aws/aws-lambda-runtime-interface-emulator), inspected2026-10-09, distinguish localruntime emulation from hostedorchestration/security. Local1CPU cap is not assumed equivalent to hosted2048MiB CPUallocation. Image-local feasibility passes; actualhosted IAM, scopedexpiringinput/outputtransport, durableprovisionalstorage, secret/sourceisolation, deadline/cancellation/recovery and acceptedattachmentremainunproved. The fixture rejects URLqueries and therefore is not SupabasesignedURLtransport evidence. Exact1024×1024/16KiBdescriptor/20MiBencoded/deadline≤60s are explicitprobeceilings, not arbitrary<=1024 or32KiB acceptance. Runtimecandidateconfiguration is documented inlambda/deployment-proposal.json with productiondisabled/quota0/spend0.06solelyownsreal authority,ledger,provider,usage/cancel,storage reconciliation and atomicattachment. Full03/06remainblockeduntilhostedproofandindependentreview acceptance; no merge/deploy is authorized.


### Retained-live corpus Lambda replay

Exact current source freeze `82f8a2db91a363ca1aaff187ba3d2e17ca6b6081` contains the same measured handler/verifier, explicit --live fixture selection, two separately named retained-live inputfiles and the independent-review cleanup fix. Runner marks launch attempted before awaiting DockerCLI, always stops/kills exact uniquely owned PID+timestampname even on uncertain CLI response;60s outer watchdog remains. No additional runtime optimization/provider call. Source equality after evidence edits is required before evidence closure.

Actual retained-live RIE directory `lambda-rie-1791541052952/summary.json`; all4planned local outcomes correct. Eachverifiedoutcome independently decoded provisionalPNG and compared every pixel against exact source/rawcandidate:995776outsidepixels0mismatch; selectedpixels matchcandidate. Inputsource copied byte-for-byte fromlive-1791537498387/sea-cave-output.png SHA256eea733e73c403ea2978916a56733facd6074cbecff19f868d1e54343ed8fad89. Candidate copied byte-for-byte fromadded-chamber-raw.png SHA25617719d4c861923e3103e0edb8944d0bb2a3622576722cacbdeae44c55db034b4; the earlier composedcandidate was never substituted. Worker returns new canonical lossless encoded identity with exactpixel proof; does not trust the prior provider's registration/guarantees.

|Retained-live RIEcase|Outcome|Handlerwall|ProcessCPU|Cgroupmemory.peak atread|
|---|---|---:|---:|---:|
|Fresh verify|verified|4746ms|4697ms|161595392bytes|
|Warm same-operation reverify|verified|1426ms|1427ms|198823936bytes|
|Lost write response|uncertain|806ms|819ms|198823936bytes|
|Same-operation recovery|verified|1949ms|1960ms|198823936bytes|

Constraints unchanged: officialpinnedNode24ARM64 image,actualcgroup2048MiB/1CPU,tmp512MiB,readonlyroot/mount,60souterwatchdog,exact1024square,20MiBencoded,16KiBcommand. Current27/27focusedchecks pass0fail0skip. Memoryhighwaters are cumulativekernelcgroup atread, not RSS or hosted peaks; logs/RIE billingplaceholder metrics are not hosting/billingproof. Historicalsyntheticrun and failedstartup evidence are retained separately; neither stands in for the actual retained-live replay. All ownedcontainersremoved/port4194released. Distinct independent re-review on82f8 completed: Standards/depth PASS, local feasibility/evidence PASS,27/27worker checks with0failed/0skipped; no remaining actionable source findings;03/06fullhosted IAM/privateexpiringtransport/durablestorage/deadline/prodledgerattachment proof remainsblocked.


Final local-proof review at `82f8a2db91a363ca1aaff187ba3d2e17ca6b6081`: independent reviewer confirmed input bytes match originals and independently reconstructed canonical output SHA256 `886e40ddb7fe491fffbfcf524f44836effff3dc9ce1111b593fdf79d4e8b2d2f`,4,196,031bytes, matching all verified RIE receipts. Standards/depth PASS; local proof Spec/evidence PASS. Full ticket03 Spec remains BLOCKED on selected actual hosted runtime/authority/capability/durability/isolation proof and accepted deployment limits. Missing ticket06 production enforcement implementation alone is not a ticket03 feasibility blocker;06 retains that implementation ownership. No hosted/provider calls were made during local proof.


## Bounded ImageMagick WASM comparison

Userauthorized no-new-host comparison of officialSupabase-supported npm:@imagemagick/magick-wasm. Pinned0.0.44 inprobe-onlydependencydirectory with integrity/JS/WASM hashes. Reviewedsource `e5c9c8c1c44c44c76460b88dd82de05c7756ca37`; distinct Standards/depth PASS. [Executed comparison decision](magick-edge-1791562499380/decision.md). Independent9/9Node checks and historical Edge live/transparent outputs preserve exactcanonicalRGBA, including hiddenRGB/lowalpha; noisy1024Node case and invalid input/shape/bounds rejected separately.

ActualEdgev1.74.3 under2sCPU/256MBworker: initialcoldCPUTime2407/nooutput; intermediatepixel-correctoutputs lack retained final resourceevents and warmterminated; final ONEtargetedlosslessPNGlevel0 rerunCPUTime3626/HTTP500/nooutput/warmskipped. WASM initelapsed6606.984ms; shutdownmemory61,813,680bytes sampled, wholecontainerpeak252,678,144bytes includes main/events/user and is not workerpeak. No reliable qualifiedcold/warm resource envelope established. Tests did not reduce1024resolution, colorconvert or flattentransparency. No universalImageMagick/WASMimpossibility claim.16Muploads remain separate.

Frozen compositor execution head `a7b1f6d1a1f8f87aa56b4455efb0d3ccbe77ab41`; final reviewed head only fixes reproduciblefixturemkdir and asyncboundedDockerwatchdog/cleanup. Prior9independent tests/pixelchecks remain applicable; syntax/diffchecks pass. Ownedresourcescleaned/4195released,preexistingimages/containerspreserved. No credentials/newprovider/hosted/SQL/sharedsource changes. Full03Spec and06remainBLOCKED pending accepted runtime/real authority/transport/limits proof; user preference to avoid new hosting accounts is respected.
