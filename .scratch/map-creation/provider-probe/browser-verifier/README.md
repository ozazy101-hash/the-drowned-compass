# Browser PNG verification only: bounded Edge probe

Question: can Edge independently verify a browser-composed PNG against immutable trusted source/raw candidate/region, avoiding Edge PNG encoding? This prototype owns no ledger, production authentication/storage, provider calls, SQL or app integration. No installation dependencies: native DecompressionStream('deflate'), WebCrypto SHA256, Uint8Array/DataView. Source/candidate/output byte provenance pinned in provenance.json. Browser outputs copied exactly from reviewed browser-prototype source/evidence commit fe48909b478971bc6e6250a6ed19ece41fd1e2ef, independently compared through existing Node PNG decoder. Inputs use retained live images and matching deterministic ImageMagick transparent-hidden-RGB/lowalpha/noisy seeds. No substitute Node-generated positive outputs.

Public demo contract: POST http://127.0.0.1:4196/verify raw PNG and X-Probe-Request live|transparent|lowalpha|noise. Exact CORS origin http://127.0.0.1:4186 with OPTIONS; this CORS policy is NOT authentication. Client cannot override source/candidate/parent/region via headers or content. Fixture bindings and parent identity come from readonly server manifest; actual source/candidate bytes must match its sizes and SHA256 before decode. Returned digest is computed from submitted bytes and never establishes lineage by itself. HTTP200 verified; HTTP422 mismatch/malformed; HTTP403 unknown identity. Fixture /internal routes expose retained test assets, NOT production private storage/authorization proof.

PNG scope fixed1024square RGB/RGBA8 noninterlaced, <=20MiB encoded bytes per input. Unsupported critical/invalid chunk types, duplicate/missing/out-of-order IHDR, CRC errors, palette/tRNS/APNG, interlace, noncontiguous IDAT, trailing bytes, missing IEND, bad deflate/Adler, invalid filters, exact decoded length or inflation overrun rejected. Compressed input fed <=64KiB chunks with backpressure; inflated output checked against exact scanline allocation and reader cancelled at overrun. Client body bounded incrementally before concatenation. Every RGBA channel compared, including hidden RGB at alpha0. No color conversion/flattening, no encode or composition in Edge. Counts derive trusted region area. Outer16M upload policy and JPEG/WebP/provider larger limits are separate and unproved here.

```sh
node .scratch/map-creation/provider-probe/magick/prepare.mjs
node .scratch/map-creation/provider-probe/browser-verifier/prepare.mjs '/absolute/reviewed/browser-prototype'
node --test .scratch/map-creation/provider-probe/browser-verifier/decoder.test.mjs
# Existing pinned image only; use a unique owned name and exclusive4196 lease.
docker run --detach --name map-browser-verifier-owned --read-only \
  --memory 2048m --memory-swap 2048m --cpus 1 --tmpfs /tmp:rw,size=256m \
  -e DENO_DIR=/tmp/deno --publish 127.0.0.1:4196:9000 \
  --mount "type=bind,src=$PWD/.scratch/map-creation/provider-probe/browser-verifier,dst=/verifier,readonly" \
  sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c start \
  --main-service /verifier/main --event-worker /verifier/events --policy oneshot \
  --max-parallelism 1 --user-worker-request-idle-timeout 150000
node .scratch/map-creation/provider-probe/browser-verifier/exercise.mjs map-browser-verifier-owned
# Capture first; stop/remove ONLY this owned name after browser handoff finishes.
docker stop -t 1 map-browser-verifier-owned
docker rm map-browser-verifier-owned
```

Actual user worker hardCPU2000ms/soft1900ms, memory256MB, wall150000ms; no relaxed budget. Existing pinned Edge1.74.3 compatible Deno2.1.4/V8 11.6.189.12. Container2048MiB/1CPU is enclosing main/events/user workers, not worker memory. Cold means new user worker, module load plus THREE decoded images and comparison; container/file/JIT caches can already be warm. One-shot retires each worker: no warm reuse claim. Optional explicit main PROBE_REUSE=1 with per_worker policy is diagnostic SAME-worker reuse, where CPU budget is cumulative rather than a guaranteed reset. workerInstance log correlates responses to actual supervisor execution IDs. Actual supervisor shutdown reason/CPU is authoritative; a200 alone is insufficient. Whole-container cgroup peak is not user-worker peak; shutdown total memory is a sample. Per-stage CPU is unavailable; wall/total supervisor CPU recorded separately.

Initial retained-live cold CPU1018ms EarlyDrop returned exact. Hardened batch eight positives independently exact, but one EarlyDrop CPU2387ms exceeded configured2s despite returning200; other observed shutdowns235–1663ms. Thus mixed local feasibility, no robust cold acceptance or hosted proof. Outside/inside tampering and wrong request binding rejected; a client-assertion header case transport-failed and remains unproven until affected rerun. All raw evidence retained. No inference that all Edge verification is impossible, or all PNG/device/provider cases supported.

06/08 interface handoff: trusted server resolves immutable request/job/origin/saved-parent/source/rawcandidate/region plus canonical pixel dimensions; client uploads only finalPNG for that authenticated expiring session. Verify exact stored provisional bytes, record computed digest/object identity and trusted binding. Later attachment/recovery must independently re-read/reverify the SAME immutable stored object against SAME authoritative request/source/rawcandidate/region and current parent revision, rejecting expired/replaced/stale objects; never trust caller digest, pixel flag, registration or cached receipt after byte swap. Verification itself never selects presentation or inherits lineage. Whole generation and constrained revision routing remains06/04 authority. Client session expiry, cancellation, durable upload/readback, immutable-object authority and hosted runtime all remain unimplemented/unverified. Full03/06 gated until these reviews/proofs and reliable admitted-runtime envelope.
