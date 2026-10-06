# 05 — Draw Grid Maps through a focused editor

**Status:** ready-for-agent

**Blocked by:** 04

**Spec:** [Party content and presentation](../spec.md)

## What to build

Implement the map document and a usable local editor for a blank square grid. Persistence follows in Ticket 06.

## Module and interface

A Grid Map module owns valid document state, coordinates, drawing commands and undo/redo. The interface expresses user intent such as drawing wall segments or painting terrain; renderers consume a stable document representation without knowing edit-history internals. Separate logical grid coordinates from view pixels and physical calibration. Do not create independent forwarding modules per tool.

## Placement and reuse decision

This new domain behavior does not fit any existing character domain module: map geometry, drawing gestures and undo/redo share one cohesive map-document implementation. Keep its coordinate math available internally to the map renderer/editor rather than inventing public geometry, undo, tool and terrain abstractions. Existing validation/conflict patterns can inform its design without adding map fields to CharacterRecord. Pure drawing/coordinate behavior needs no Supabase/in-memory adapter interface.

## Acceptance

- [ ] Selectable bounded grid dimensions and default five game feet per square; input errors are clear.
- [ ] Grid-snapped walls/doors, floor/water/difficult-terrain painting and erasing.
- [ ] Undo/redo covers meaningful drawing gestures and clears redo after a new edit.
- [ ] Document invariants prevent out-of-grid geometry and invalid sizes; consistent behavior at different view zooms.
- [ ] Unsaved document changes remain local to the DM editor; no Player delivery.
- [ ] No tokens, attacks, movement enforcement, visibility calculation, secret layers or decorative brush system.

## Verification and architecture review

Test observable command results, erase, gesture undo/redo, bounds and coordinate conversion through the map interface. Focused browser checks draw a room and terrain at different zooms, including laptop/phone layout. Build; a database test is not applicable until persistence is added. Review should demonstrate that tool/render callers do not reproduce geometry or history rules.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
