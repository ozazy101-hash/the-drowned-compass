# Ticket08 delivery — ready for coordinator acceptance

Worktree: `/Users/oscarpauwels/.codex/worktrees/map-revision-08/Dungeons&Dragons`.
Branch: `codex/map-revision-08`.
Accepted dependency base: `1925ecf56440e2b32f1c423547e15eeda480a9c6`.
Frozen source: `c4ad29368c770ef7b3ea246f46e5e5d115629450`.
Source commit: Add private selected-area map revisions and lossless assembly.
Evidence is committed separately; its commit is the HEAD containing this delivery file and is recorded in the final handoff. No dependents are released by this ticket.

## Delivered behavior and module depth

The DM selects a rectangle on immutable saved artwork using the saved placement, zoom/scroll/pan and pointer/touch. Empty, nonfinite and outside-image gestures are rejected. The displayed rectangle encloses the approved integer pixel region. Area instructions submit the selected retained parent through the same generation application. Accepted private versions compare with their parent; earlier versions remain available for branching. Inspecting, generating, retrying, cancelling and uploading never select or replace the Party Display.

Grid Map domain owns selection validation and pixel quantization. RegionSelection owns local gestures and the inverse screen transform, reusing MapDrawing. One browser-private assembly command covers whole and region output; its private worker preserves all decoded RGBA bytes, including RGB under transparent pixels, and stops on cancellation, timeout, controller replacement or failure. Existing06 PREPARE/FINALIZE independently computes/verifies the expected output and04 atomically attaches it with trusted registration. Browser assembly is untrusted: no client proof, digest or registration assertion grants authority. This follows the accepted06 handoff and coordinator-approved08 module contract rather than adding a second generation pipeline. No App, PartyContent, scene, server, SQL, migration, provider or dependency-version changes.

Canonical whole/area retry instructions come from the existing semantic job read. A transient restoration failure has feedback and explicit Refresh progress recovery. Immutable image URLs now follow version identity, preventing authoritative workspace observations from tearing down selection mid-gesture.

## Frozen-source verification and independent review

- TypeScript and Vite build PASS: `08-final-build.txt`; existing native-config/chunk warnings retained.
- Domain/lossless PNG interface checks **6/6 PASS**: `08-final-domain.txt`.
- Existing generation application/verifier **49/49 PASS** at frozen source: `08-generation-node-c4ad293.txt`.
- Genuine local rollback SQL **45/45 PASS**: artwork35/35 and reference-parent10/10 in `08-map_artwork_versions-c4ad293-sql.txt` and `08-map_generation_reference_parent-c4ad293-sql.txt`. Root before/after snapshots agree exactly.
- Final seven-case local Edge/auth/SQL/storage browser run **6/7 PASS**, followed by unchanged-source phone-only rerun **1/1 PASS**: `08-browser-final.txt`, `08-phone-rerun.txt`. Thus all seven distinct cases passed in aggregate; this is not a clean single7/7 run. Laptop RGB and actual CDP-touch phone RGBA accepted outputs each preserved **962,140 outside pixels**, used candidate bytes for **86,436 inside pixels**, with **zero RGBA mismatches**. Registration, source, dimensions, placement and presentation stayed intact. Wrong full-frame output was rejected authoritatively.
- Covered aligned saved placement despite unsaved alignment drafts, zoom/native scroll, clear/reselect, primary/multiple touch and cancellation, parent comparison, older-parent branching, area siblings after reload, original-deadline cancellation/retry, expired proof and stale parent denial, held-worker termination/timeout/controller replacement, and whole-map canonical intent restoration/explicit refresh recovery. Held-worker tests are labelled controlled browser fixtures, not provider behavior.
- TWO distinct independent reviews at exact source: **Standards/depth PASS**, `08-standards-c4ad293.md`; **Spec PASS**, `08-spec-c4ad293.md`. No unresolved actionable source findings; neither reviewer was the writer/root.

## Baseline, cleanup and leases

Post160000 schema hash: `ee3810b06c6316094d45b09c676372e18efd6694e1c8a97d98597a29dc4eec1d`.
Retained data hash: `d179b9c136736dc896ad4896757e1c37119a181dd8098fc92152ffa14d7d4baf`.
Every table in the recorded snapshots is equal. Browser runs restored their exact baseline and cleaned only recorded owned identities and objects. The last phone run cleaned nine owned parties/DMs, one Player and eight objects; its container, temporary secrets/files and verification lock were removed. Root rollback SQL also restored the exact baseline. No database reset or migration apply occurred. Coordinator4186/4196 previews remained untouched. No4178/49178 listeners remain. **Ticket08 releases local SQL/storage/browser4178/backend49178 leases.** The temporary accepted07 dependency symlink is removed after review checks; no dependency files were committed.

The last narrow run recorded18 fresh bounded workers, maximum reportedCPU839ms and maximum shutdown memory sample46,248,844 bytes, exceeded=false. This is a shutdown sample, not peak memory or a universal cold-start guarantee. Accepted07's historical cold CPU failure remains a release consideration.

## Retained failures and limits

Earlier browser runs are retained: initial2FAIL diagnosis, second2FAIL comparison locator, third3PASS/2FAIL (upload and image-observation gesture race), fourth6/6PASS. Fourth cancellation checks forced fixture deadlines; final cancellation/retry checks do not modify deadlines. The initial raw transcript/runtime was not retained before overwrite; `08-initial-failure.md` records that limitation honestly. Later transcripts, runtime logs and before/after snapshots are retained separately.

Final and narrow runs include sporadic401/PGRST303; final phone branching also encountered403/access-denied. Fresh subsequent auth/user and job reads succeeded with DM membership; clocks aligned. Cause remains unknown, and `08-auth-diagnostic.md` does not invent a cause. Passing reruns do not prove universal local transport/auth reliability. Errors preserved saved work; no server or adapter patch was made for these diagnostics.

All provider journeys here are explicitly labelled retained-image deterministic fixtures, not new live generation. Paid calls0; live stays disabled/quota0/spend0. Historical03 evidence supplies only the approved bounded provider capability. Initial AI profile is1024-square RGB/RGBA8 noninterlaced PNG up to20MiB; manual PNG/JPEG/WebP20MiB/16M-pixel support is unchanged. No outpainting, exact inside geometry promise or player map sharing. Real Use this map wiring belongs to10; combined verification/hosted topology, migration authorization, main merge and deployment remain later gates. No hosted migration, merge or deployment performed.

## Source equality

After the evidence-only commit, compare frozen source to evidence HEAD. Only `.scratch/` evidence/tracker changes are permitted; production, verification source, configuration, package/dependency and Supabase trees must be byte-identical. The final handoff records the resulting evidence SHA and equality result.
