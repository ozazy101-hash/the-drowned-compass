# 05 — Restrict Grid Maps to the DM-controlled display

Type: task
Status: ready-for-agent
Blocked by: 04
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Remove persistent player access to Grid Maps while retaining DM access and the separate Party Display. Migrate existing revealed maps to DM-private and retire map-specific reveal/withdraw grants and clients. Do not change Handout sharing.

## Module and interface

PartyContent authorization and Supabase storage/policies own map privacy; Party Library views stop listing maps. Handout lifecycle remains within its existing module.

## Architecture constraints

Backend/storage authority remains the single source for private access; views remove actions but do not replace policy enforcement. Retire obsolete map commands in-place without deleting legitimate copy/save semantics. Read/change intent results remain compatible with04, and Handout subscriptions/types stay unchanged. Do not attach private versions to a player-readable Handout snapshot.

## Acceptance

- [ ] Players/anonymous sessions cannot list or fetch map metadata, jobs, references, versions, receipts or private artwork via current or historical known object paths.
- [ ] Presenting/choosing a map never reveals it to Party Library. Stale clients and obsolete server commands cannot restore sharing.
- [ ] Migration preserves all existing maps, geometry, receipts, independent copies, artwork and Character data. Retain read-only before/after verification and identify old signed-link lifetime if relevant.
- [ ] Revealed Handouts/PDFs still list/read/present/replace/withdraw normally; mixed map/Handout object references preserve intended Handout access without leaking map metadata.
- [ ] Existing maps can still be read by the DM and displayed after authorization. Session loss clears display rather than showing retained private frames.

## Verification and review

Genuine player/anonymous/DM SQL and known-path storage checks plus old-command denial; focused Library/Handout regression on both viewport sizes. No hosted migration during local ticket acceptance. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).
