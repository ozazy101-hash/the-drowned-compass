# 03 — Verify live generation and masked editing

Type: research
Status: ready-for-agent
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

## Browser assembly prototype pointer —2026-10-09

User authorized prototyping browser composition. Retained primary source/evidence in isolated branch `codex/browser-compositing-prototype`, commit `fe48909`, `.scratch/map-creation/browser-prototype/prototype.html` and README. Self-contained HTML, no AI calls/credentials/uploads/shared source. Four actual browser assembly/export cases independently verified by existing Node decoder:995776outside/52800inside pixels exact, including transparency/lowalpha/noise. Initial browser wall times252.8–359.9ms, phone-width desktop402.3ms (not real-phone/per-device guarantee). Tamper/invalidbounds/reset/stale-selection paths checked. Browser feasibility demonstrated for bounded1024RGB/RGBA scope only; server authority, production upload/recovery and formats/device limits unresolved. Client checks cannot satisfy existing server-trusted preservation contract; no production adoption,03acceptance or06release inferred.
