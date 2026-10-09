# 07 — Build the map creation workshop

Type: task
Status: ready-for-agent
Blocked by: 04, 06
Spec: [Map artwork and display reveal](../spec.md)

## What to build

Add Invent a map and Use my sketch, appearance instructions, creation jobs, finished-art upload, version browsing/branch selection, comparison and explicit Use this map. Replace prototype wording and simulated actions with actual capabilities.

## Module and interface

Grid Map workshop owns inputs/drafts and user feedback; Grid Map domain owns reference drawing/alignment; PartyContent/generation supply meaningful accepted commands. App composes navigation only.

## Architecture constraints

Consume PartyContent workspace read/observe and generation intent results; no provider ports, storage sequencing, polling timers or SQL row knowledge in UI/App. Share map-scene drawing and domain coordinate conversion between drawing, reference comparison and display. Keep private inspection selection separate from the persisted presentation intent.07 owns the Use this map intent/control;10 supplies its real display wiring, so07 must not implement a temporary popup or call the obsolete Reveal command. A disabled/unwired control during isolated07 acceptance is explicitly recorded until10 integration.

## Acceptance

- [ ] Invent uses a text brief; sketch mode supports closed freehand outlines with clear/undo, uploaded reference and existing saved map drawing. Touch and pointer input remain usable.
- [ ] DM chooses map dimensions before creation. Uploaded/generated images fit proportionally with scale/position/reset controls; grid overlay and sketch comparison expose layout drift.
- [ ] Try another version retains earlier results from the same brief/reference. Inspecting/creating/uploading never changes the active display. Accepted saved versions persist on reload.
- [ ] Provide clear job progress/cancel/retry and original work preservation; show image/provider failures without an empty-success state.
- [ ] Use this map is an explicit action with a concise alignment/scale reminder; no mandatory review checkbox gate. Buttons and empty states use consistent plain language.
- [ ] Keyboard-accessible controls, phone widths, touch sketching and large supported images work; artwork does not unexpectedly vanish beneath terrain fills.

## Verification and review

Focused real/local creation and upload/reload/comparison workflows on laptop/phone, drawing transitions and render/alignment checks. Persisted data is reread; label fixture/live transports. Follow the shared [verification and delivery gate](../spec.md#verification-and-delivery-gate). Record source heads, evidence and outstanding blockers; where a ticket claims live AI capability, no simulated output may stand in for that proof.

## Comments

2026-10-09: Created from user-accepted Prototype2 and module decisions. Implementation unstarted. Read the dependency status and module interface before claiming.

2026-10-09: Architecture review refined ownership, small interfaces and seam-level verification before implementation. See [architecture review](../architecture-review.md) and [interface contract](../spec.md#module-placement-and-interface-contract).
