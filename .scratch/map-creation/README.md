# Map artwork and DM-controlled reveal

[Accepted specification](spec.md) · [Decisions](map.md) · [Research](research.md) · [Architecture review](architecture-review.md)

2026-10-09: User accepted Prototype2 and requested the implementation spec and tickets. Planning branch `codex/map-artwork-planning` starts from released main `823e00a`. Prototype source stays on `codex/map-art-prototype` at `eb611e7`; it is not copied into production. No implementation, provider connection, hosted migration or release has begun.

|Ticket|Work|Status|Blocked by|
|---|---|---|---|
|01|Sketch-to-art prototype|resolved|—|
|02|Versions and display-reveal prototype|resolved|—|
|03|[Verify live generation and masked editing](issues/03-verify-live-generation-and-masked-editing.md)|ready-for-agent|—|
|04|[Persist private Map Artwork Versions](issues/04-persist-private-map-artwork-versions.md)|resolved|—|
|05|[Restrict Grid Maps to the DM-controlled display](issues/05-restrict-maps-to-dm-controlled-display.md)|resolved|04|
|06|[Run private AI generation jobs](issues/06-run-private-generation-jobs.md)|ready-for-agent|03, 04|
|07|[Build the map creation workshop](issues/07-build-map-creation-workshop.md)|ready-for-agent|04, 06|
|08|[Revise selected areas and build later stages](issues/08-revise-selected-map-areas.md)|ready-for-agent|07|
|09|[Persist manual Reveal Masks](issues/09-persist-manual-map-reveal-masks.md)|resolved|04|
|10|[Render only uncovered areas on the extended display](issues/10-render-masked-extended-map-display.md)|ready-for-agent|05, 07, 09|
|11|[Switch aligned Prepared Map Stages](issues/11-switch-aligned-prepared-map-stages.md)|ready-for-agent|08, 10|
|12|[Verify integrated map workflows and prepare release evidence](issues/12-verify-integrated-map-workflows.md)|ready-for-agent|03, 04, 05, 06, 07, 08, 09, 10, 11|

First unblocked work:03 live AI feasibility and04 durable map-version foundation. A ready-for-agent status does not override Blocked by; resolve every listed dependency first.05 privacy and06 job integration follow04;09 mask domain can follow04 independently.07/08/10/11 integrate these capabilities;12 owns one combined acceptance gate. Shared-module edits must be coordinated rather than assumed conflict-free parallel work.

The first ticket must verify a real generation/edit provider and choose documented operating limits. Image samples/tint edits in the prototype establish no live production guarantee. Map-sharing changes revise previous semantics; [ADR0005](../../docs/adr/0005-private-map-artwork-and-manual-display-reveal.md) records the accepted target. Runtime remains unchanged until implementation and release.

2026-10-09: Pre-implementation architecture review completed. Six planning gaps corrected in spec/tickets; refined interface ownership reviewed against actual released code. No implementation started.

2026-10-09: Coordinator accepted and integrated reviewed tickets04/05/09;09 delivery evidence: [09-delivery](evidence/09-delivery.md). Remaining generation path is blocked on03 hosted runtime decision/proof; ready labels do not override dependencies. Batch ledger records exact heads and leases.
