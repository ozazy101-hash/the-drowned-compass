---
status: accepted
---

# Keep Grid Maps private and manually uncover the Party Display

The DM uses an extended screen for physical miniatures; players do not need map copies on their devices. Keep complete Grid Maps and immutable artwork versions private to the DM, and present only manually uncovered areas. Preserve Handout reveal/Party Library rules. This revises the map-sharing/stage scope in ADR0004 while retaining its game-grid/calibration separation; ADR0003 remains applicable to Handouts.

Retain earlier artwork versions and branch selected-area revisions or later stages rather than mutating the displayed image. Display uncovering changes a Reveal Mask, not the artwork. Compatible stages retain grid registration, calibrated scale, pan and reveal progress. Full hidden artwork stays on the controller; the display receives only flattened visible output.

The user chose this over distributing whole maps through Party Library or representing exploration only as successive images. It gives predictable gradual discovery without automatic vision or rules enforcement. Existing released map-sharing permissions need migration and obsolete-command denial, and previously obtained copies cannot be revoked retroactively.

Accepted design on2026-10-09; implementation is tracked in .scratch/map-creation/spec.md and tickets03–12. Recording the decision does not change deployed behaviour. Live AI generation and region fidelity must be verified before provider integration.
