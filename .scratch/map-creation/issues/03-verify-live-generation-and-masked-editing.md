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
