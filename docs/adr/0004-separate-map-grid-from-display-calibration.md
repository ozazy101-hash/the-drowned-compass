---
status: accepted
---

# Separate the Map Grid from Display Calibration

Grid Maps are intended for physical miniatures on a projected table, so game-space dimensions and distances remain independent of physical Display Calibration and view position. A test square establishes the desired physical square size; presenting matching prepared map copies preserves that size and position rather than fitting each map automatically. This favors stable miniature placement over maximizing screen coverage and avoids coupling saved maps to one projector setup.

Prepared stages use private Save as copy maps and explicit Reveal and present actions instead of an automatic version timeline or Fog of War. Background image placement and grid dimensions are copied, while earlier stages retain the normal Party Library visibility rules.


2026-10-09: [ADR0005](0005-private-map-artwork-and-manual-display-reveal.md) supersedes the map sharing, version and manual Fog of War scope above. The separation of game-grid dimensions from physical calibration and stable compatible-stage positioning remains accepted. This is the target design; released behaviour changes only through the tracked implementation.
