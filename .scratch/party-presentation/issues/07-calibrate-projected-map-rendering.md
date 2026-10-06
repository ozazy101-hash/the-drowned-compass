# 07 — Calibrate projected Grid Map rendering

**Status:** ready-for-agent

**Blocked by:** 04, 06

**Spec:** [Party content and presentation](../spec.md)

## What to build

Add tabletop projection calibration to the map renderer without changing game-space dimensions.

## Module and interface

The existing Party Display module owns calibrated logical-to-display transforms, physical test-square adjustment and view position. Its focused interface accepts a saved map and display settings; callers do not compute per-tool scaling. Calibration belongs to the display setup, not the saved map's game distances or background geometry.

## Placement and reuse decision

Extend the Party Display module from Ticket 04: calibration is a viewport mode of the same display, not a new top-level rendering module or persistence seam. Reuse the Grid Map coordinate representation from Ticket 05. Keep test-square adjustment, transforms and retained view position behind that existing interface; an internal pure transform helper is appropriate if it concentrates useful shared behavior. Do not add a separately configured CalibrationData adapter or put projector dimensions in the saved map document.

## Acceptance

- [ ] Provide an adjustable test square for the DM to measure on the table; describe calibration as a physical setup step.
- [ ] Preserve calibrated square size while panning; prevent normal Fit to screen/zoom from silently invalidating calibration.
- [ ] Clearly distinguish ordinary viewing mode from calibrated projection mode; reset/recalibrate intentionally when display setup changes.
- [ ] Do not automatically fit matching map stages on content changes; preserve size/position.
- [ ] Use saved maps only in the Party Display, with no editor UI, private drafts or hidden data.
- [ ] Automatic correction for angled projectors and guaranteed pixel-perfect placement across uncalibrated devices are out of scope.

## Verification and architecture review

Test transforms across grid sizes and viewport settings through the rendering interface. Browser geometry checks verify test-square/cell dimensions and no rescale after content changes, pan or reopening with retained settings. Record that actual projected physical size needs manual measurement; automated browser success is not proof of projector calibration. Build and focused control/display checks.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
