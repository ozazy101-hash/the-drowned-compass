# 10 — Render only uncovered areas on the extended display

Type: task
Status: ready-for-agent
Blocked by: 05, 07, 09
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Integrate explicit Use this map with the existing extended Party Display. Keep full map controls private on the DM screen, and send only the accepted masked visible frame to the display window.

## Module and interface

Party Display owns authorized flattened rendering, popup lifecycle and transforms. Map selection/mask accepted state comes from existing content/domain modules.

## Architecture constraints

Consume one authorized accepted presentation snapshot (version, registration/grid, mask and revision) from the content capability. Never combine independently read latest artwork/mask in UI. Render output is guarded by snapshot revision and session epoch. Use the shared map-scene drawing implementation privately on the controller, sending flattened visible frames only; no duplicate coordinate rules/compositor in a popup. This ticket owns real display wiring for07's selection intent and09's mask commands.

## Acceptance

- [ ] New map remains black until an authorized saved version and accepted mask are ready; no full-map flash during load/switch/reopen/reconnect.
- [ ] Hidden output is opaque; popup contains no full-map image URLs, retained source buffers, prompt/reference, DM overlay or edit controls. Do not introduce a player delivery endpoint.
- [ ] Accepted uncover/hide updates reach the display; inspecting/revising a candidate does not. Failed persistence retains the accepted mask/frame; stale async renders cannot restore hidden pixels.
- [ ] Open/focus/blocked-popup/close/reopen/clear behaviours are explicit. Sign-out/session revocation blanks the popup and stops updates.
- [ ] Grid/display calibration and pan remain independent of mask and image. Existing Handout/PDF display flows still work when switching content kinds.
- [ ] DM overlay can be toggled without changing what the table sees. Reopen rechecks authority and restores accepted reveal progress safely.

## Verification and review

Two-window laptop/phone journeys, hidden-pixel and DOM/source checks, blocked popup/reopen/session races, genuine authorization and Handout/PDF switching regression. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).
