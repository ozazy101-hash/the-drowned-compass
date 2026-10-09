# Ticket03 bounded capability probe

Throwaway server probe; production orchestration belongs solely to06. Source placement/interface was recorded in ticket03 before coding. No application imports, package changes, database changes, credentials files or hosted actions.

## Reproduce

Run from the checkout root with Node24:

```sh
node --test .scratch/map-creation/provider-probe/probe.test.mjs
node .scratch/map-creation/provider-probe/run.mjs --live
```

After the user explicitly confirms the secure helper saved the credential, the coordinator can run:

```sh
node --env-file=/Users/oscarpauwels/.config/drowned-compass/provider.env .scratch/map-creation/provider-probe/run.mjs --live
```

This loads the external file directly through Node without displaying its contents. Do not read the file before saved confirmation.

The live command checks only `OPENAI_API_KEY` presence. Supply it securely to the process environment; never put it in repository files or terminal history. Billing, project permission/model access and any required organization verification must already exist. No account/spend settings are changed. With no credential, exit2 and `provider-evidence/live-blocker.json` document zero calls. With a credential, at most three sequential submissions run, stopping on any failure/uncertainty, without retries. Each run has a new evidence directory: instructions, sketch, mask, raw image, accepted PNG, receipt, dimensions, usage and latency. Inspect retained images for layout drift and reconcile usage against actual billing separately; usage is not a paid invoice. Repeated invocations incur additional calls and require coordinator authorization.

## Small interface and hidden invariants

`runIntent(intent, provider)` accepts generate/reference/revise intents and returns accepted normalized PNG/digest/decoded dimensions/origin/parent identity, rejection, failed or uncertain. Provider is an injected internal `generate` port with live and deterministic adapters; HTTP payloads, decoding, polarity and composition remain private. Tests exercise observable intent/outcome. No provider registry or public client configuration.

Sources carry saved identity and bytes, not caller-asserted registration. Arbitrary generation/reference gets new registration. A revision requires integer in-bounds nonempty rectangle and equal decoded dimensions. It copies candidate pixels only inside the rectangle, retaining source RGBA outside, then verifies PNG roundtrip. Composition evidence includes parent/source digest, region, outside count and raw-provider drift. Production06 must resolve parent identity, canonical grid/placement and attachment authoritatively with04; `server-verification-required` does not grant inherited registration or select presentation. Nothing reaches Party Library/Display. Map probe width/height to04 pixelWidth/pixelHeight and generation/reference origin to generated,revision to revised;04 owns canonical x/y/width/height placement,grid and object identity. Receipt identity does not authorize lineage.

## Explicit provider selection, 2026-10-09

Selected OpenAI **gpt-image-2.5-sunburst**, before any calls. [Current model page](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst) and [Images edit reference](https://developers.openai.com/api/reference/resources/images/methods/edit). `gpt-image-1.5` was considered but its model page marks it deprecated. Never silently replace the selected model.

[Official image guide](https://developers.openai.com/api/docs/guides/image-generation): POST `/v1/images/generations` for prompt-only; multipart POST `/v1/images/edits` with `image[]` for reference and alpha-PNG `mask` for revisions. Selected pixels are transparent, retained pixels opaque; mask guides the model without exact fidelity guarantees. Fixed low quality, PNG, n1, 1024square corpus, nonstreaming response/base64. Supported provider formats include PNG/JPEG/WebP; probe deliberately accepts only 8-bit noninterlaced RGB/RGBA PNG and rejects other encodings. Production decoder breadth is unresolved. Live requested output dimensions additionally require multiples of16, aspect ratio1:3–3:1, edges≤3840 and655360–8294400 pixels; above2560x1440 is experimental. These provider limits differ from the16million-pixel upload/composition outer limit:4000square live full-canvas edits are rejected before fetch, without resizing or re-registering. Tiny deterministic fixtures test composition only. Provider docs offer streaming but no durable Images polling/cancel/retrieve contract established here. Aborting a request does not prove cancellation or refund. Request receipts aid support reconciliation; client request IDs are correlation, not proven idempotency.

## Runtime and deployment gates

Node builtin zlib/fetch/FormData succeeds locally; that is **not Supabase Edge proof**. [Supabase limits](https://supabase.com/docs/guides/functions/limits) document256MB memory,2s CPU,150s idle/free wall time,400s paid wall time, and no multithreaded sharp/libvips. No Deno executable or leased Edge/container execution was available.Initial16million-pixel Node test including fixture allocation took~13s: do not deploy this decoder or infer supported Edge maximum. Existing domain16million-pixel and20MiB encoded limits are checked; hosting runtime still needs measured maximum-size decode/composition, memory/CPU and provider wait proof.

Tentative deployment configuration for06: generation disabled/daily quota0/spending cap0 until live/runtime acceptance; then initially concurrency1, daily submission quota3,120000ms wait,24h orphan retention,PNG output,20MiB bytes/16million pixel outer limits. These are conservative proposals, not measured live limits. Runtime measurements may require a lower initial pixel ceiling.06 must enforce durable reservations, cumulative spending (including input tokens and unknown results), quota and orphan cleanup; this probe enforces only its three-call bound and response timeout/size. No finite dollar ceiling is inferred from missing usage. Unknown submissions retain reservations and cannot blind-retry. Orphan retention must not delete unresolved reconciliation metadata or saved versions.
