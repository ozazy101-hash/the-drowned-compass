# Isolated Supabase Edge runtime feasibility harness

Run only with coordinator permission for this local fixture lease. No provider credentials or network image calls. This is a throwaway runtime harness, not06 orchestration. It imports the same probe module/PNG decoder; retained live images are replayed through a deterministic provider adapter and are never counted as new live submissions.

Existing image tested: `public.ecr.aws/supabase/edge-runtime:v1.74.3`, image ID `sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c`, linux/arm64, compatible Deno2.1.4. [Pinned worker creation example](https://github.com/supabase/edge-runtime/blob/v1.74.3/examples/main/index.ts) establishes user-worker limits; [pinned event manager](https://github.com/supabase/edge-runtime/blob/v1.74.3/examples/event-manager/index.ts) exposes supervisor events. Main worker forwards fixture input; user worker does decode/mask/composition/encode/roundtrip and independent outside-pixel comparison. No secrets/environment passed to user workers. Mount only probe/evidence readonly; no shared Supabase mounts/services.

First inspect existing image and help (never pull a new image silently):

```sh
docker image inspect public.ecr.aws/supabase/edge-runtime:v1.74.3
docker run --rm public.ecr.aws/supabase/edge-runtime:v1.74.3 start --help
```

From the repository root, choose a unique owned container name and an unused localhost port. Example launch used4193:

```sh
docker run --detach --rm --name map-provider-probe-edge-03-final \
  --read-only --tmpfs /tmp:rw,size=256m -e DENO_DIR=/tmp/deno \
  --publish 127.0.0.1:4193:9000 \
  --mount "type=bind,src=$PWD/.scratch/map-creation/provider-probe,dst=/probe,readonly" \
  --mount "type=bind,src=$PWD/.scratch/map-creation/provider-evidence,dst=/evidence,readonly" \
  public.ecr.aws/supabase/edge-runtime:v1.74.3 start \
  --main-service /probe/edge/main --event-worker /probe/edge/events \
  --policy oneshot --max-parallelism 1 --user-worker-request-idle-timeout 150000
curl --max-time 30 http://127.0.0.1:4193/health
curl --max-time 30 http://127.0.0.1:4193/live
curl --max-time 30 http://127.0.0.1:4193/minimum
docker logs map-provider-probe-edge-03-final
docker stop map-provider-probe-edge-03-final
```

Wait for health before sending cases. Container is `--rm`; stop only the owned named container. Recreate after module changes because compiled module graphs are cached. `/live` consumes retained1024-square source/raw chamber; `/noise` is deterministic1024-square noisy fixture; `/minimum` is deterministic1024×640 (655360pixels, exact provider minimum); `/overlimit` is4000-square legacy outer-limit negative fixture. The minimum/noise cases include fixture creation inside worker budget, so their failures measure that full workload rather than a pure composition-only minimum-size ceiling.

Qualifying user workers have memory256MB, soft CPU1900ms, hard CPU2000ms, wall150000ms; CLI idle150000ms. Actual supervisor events, not host Node timing, determine result. `/live-diagnostic` explicitly increases only CPU to8000ms (header labels budget) in the same runtime; it is never qualifying evidence. Memory measurements are Deno heap/external snapshots or supervisor shutdown samples, not peak memory; Deno reports RSS0, meaning unavailable.

Observed result: **no accepted Edge deployment ceiling**. Original retained1024-square case cancelled at2040ms CPU; optimized compressed case2042ms; final uncompressed-small-PNG case2117ms. Supported-minimum full fixture workload cancelled2061ms. Diagnostic compressed retained1024 case accepted with7447ms supervisor CPU,45,691,362bytes shutdown total memory and0 changed among995776 outside pixels. This demonstrates compatibility at a larger diagnostic budget but fails the hosted2s envelope. A hosted deployment was not attempted; its runtime version/hardware remain independently unverified.

Decode dependencies: explicit `node:buffer`, synchronous builtin `node:zlib`, builtin `node:crypto`; no native image library/npm/remote imports. RGB/RGBA8-bit noninterlaced PNG only. Lossless encoding uses uncompressed zlib blocks when raw bytes fit the encoded20MiB bound, low compression otherwise; PNG byte digest may differ, decoded pixels do not. Provider JPEG/WebP/paletted/interlaced PNG remains rejected by this probe. Further custom codec optimization is out of scope.

Least-scope alternative: keep06 authority/job ledger/attachment behind the existing server seam, run decode/composition in a separately provisioned Node24 image worker with measured memory/CPU headroom. Existing Node local proof is feasibility evidence, not accepted hosted configuration; runtime provision/authority transport/limits require coordinator architecture approval and proof before enabling. A WASM/native Edge decoder is another unproven option requiring separate dependencies/measurements. No alternative was silently installed, provisioned or substituted.
