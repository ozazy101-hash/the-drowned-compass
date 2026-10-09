# Independent Standards/depth review: staged browser PNG verifier

Reviewed frozen source: `8e679aede15bfaa106ab8e5f13dbd672c02f1583`.

Reviewer: distinct independent review agent; primary assignment Standards/depth. Spec/runtime evidence receives a separate independent reviewer.

## Verdict

**Standards/depth PASS. No actionable source findings.**

The probe stays inside its owned directory and introduces no production App, PartyContent, Grid Map, Party Display, dependency or SQL changes. PREPARE and FINALIZE hide canonical decoding, authoritative input integrity, region replacement and exact RGBA digest verification. Their split addresses the measured per-worker CPU envelope without exposing prepared proof authority to callers. Removing this module would spread image validation and binding rules across transport callers.

The main fixture adapter owns the four trusted bindings and prepared proof lookup. Client authority/proof headers are rejected before worker creation; submitted bytes supply only a candidate final PNG. Preparation validates exact trusted source/candidate byte sizes and SHA256. Finalization checks request, parent, source/candidate digests, region, dimensions and expiry before comparing the entire canonical RGBA digest. Computed encoded-image digest remains integrity evidence rather than registration authority. The RAM lookup and local fixture routes are clearly identified as nonproduction transport.

The decoder bounds encoded bytes and exact inflated allocation, rejects malformed chunk structure/CRC/order, unsupported formats and frames, reconstructs all RGBA channels, and keeps transparent RGB intact. Streaming inflation has bounded input chunks and overrun cancellation. Independent tests cross the command/decoder interfaces rather than asserting private implementation details.

## Independent checks

Executed at this frozen source:

`node --test .scratch/map-creation/provider-probe/browser-verifier/decoder.test.mjs .scratch/map-creation/provider-probe/browser-verifier/staged.test.mjs`

**41 passed, 0 failed, 0 skipped.** Includes independent canonical comparison of four actual browser outputs; inside/outside tampering; source/candidate substitution; request/parent/region/proof expiry and integrity guards; invalid PNG/frame/CRC/order/deflate cases; and staged expected-digest equality against independently decoded browser bytes.

The separate Spec reviewer must assess joined actual worker execution IDs/shutdown reasons/CPU, ingress rerun and browser receipt provenance. Older monolithic failure is not staged success evidence. This Standards verdict does not certify durable authentication/job/storage, stored-byte re-verification or TOCTOU guards, cancellation, atomic attachment, hosted execution or paid enablement. Those remain explicit 06/08/04 integration obligations.

No source edits, additional containers, provider calls, credential access, shared SQL/browser fixture mutations or hosted actions were performed by this reviewer. This file is review evidence only.
