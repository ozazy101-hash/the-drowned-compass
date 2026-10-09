# Map artwork workflow exploration

User favors artwork backgrounds for natural curves and specific room layouts. [Prototype question](issues/01-prototype-sketch-to-art.md) explores sketch-guided illustration. Workflow direction accepted on 2026-10-09; no production implementation performed by this experiment.

## Accepted direction — 2026-10-09

Maps remain private to the DM and appear on the extended Party Display only, without Party Library map delivery. Manual conceal/reveal of regions on a fixed complete map is the preferred exploration workflow. Prepared candidates/stages support actual scene changes; partial AI revisions and area reveal are separate actions. Handouts retain their existing sharing workflow. Sketch illustration, description-only invention, retained variants and highlighted-area revisions are desired future capabilities; live AI fidelity is still to be tested. [Prototype verdict and scope](issues/01-prototype-sketch-to-art.md#answer).

Existing published map sharing remains unchanged until a separately implemented change updates the specification and domain decisions. Next design work should clarify labels and explore selected-area editing plus display concealment; no automatic vision or rules automation.


## Prototype2 delivered

2026-10-09: [Versions, selected-area revisions and display reveal prototype](issues/02-prototype-revisions-and-display-reveal.md) delivered on codex/map-art-prototype. Separate display receives only uncovered pixels; map version selection and explicit display switch remain separate. Live AI revisions remain simulated. Accepted by user on 2026-10-09.


## Implementation plan captured — 2026-10-09

User accepted all Prototype2 features. [Spec](spec.md) and implementation prerequisites/tickets03–12 are committed on codex/map-artwork-planning, based on released main823e00a. Prototype01/02 are resolved.03/04 are the initial frontier; later dependencies are listed in [README](README.md). No implementation or deployment started.


## Architecture checkpoint — 2026-10-09

[Pre-implementation review](architecture-review.md) found and corrected six ownership/interface gaps: server job ownership, digest versus registration, coherent presentation snapshots, map observation, display ticket overlap, and composition/test seams. Revised tickets keep deep modules behind small caller interfaces. No implementation started; final implemented depth must be reviewed again.
