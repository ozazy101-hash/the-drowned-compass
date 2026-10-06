# Implementation tickets

Spec: [Party content and presentation](spec.md). Tickets 02–09 are `ready-for-agent`; respect their blockers before claiming. The user selected Ticket 01 first; it is now `resolved` after implementation, independent review and verification. Tickets 02–09 have not started.

| Ticket | Scope | Blocked by |
| --- | --- | --- |
| [01](issues/01-concentrate-party-state-reconciliation.md) | Concentrate Party state reconciliation (resolved) | None |
| [02](issues/02-upload-and-maintain-private-handouts.md) | Upload and maintain private Handouts | None |
| [03](issues/03-reveal-replace-and-withdraw-handouts.md) | Reveal, replace and withdraw Handouts | 02 |
| [04](issues/04-open-and-control-party-display.md) | Open and control the Party Display | 03 |
| [05](issues/05-draw-grid-maps-through-a-focused-editor.md) | Draw Grid Maps through a focused editor | 04 |
| [06](issues/06-save-grid-maps-and-upload-backgrounds.md) | Save Grid Maps and upload backgrounds | 02, 05 |
| [07](issues/07-calibrate-projected-map-rendering.md) | Calibrate projected Grid Map rendering | 04, 06 |
| [08](issues/08-reveal-and-present-prepared-map-stages.md) | Reveal and present prepared map stages | 03, 06, 07 |
| [09](issues/09-verify-integrated-party-content-workflows.md) | Verify integrated Party content workflows | 08 |

Delivery stages: 02–03 Handouts; 04 Party Display; 05–08 Grid Maps; 09 combined acceptance. Full visual overhaul remains deferred until after these stages.

[Module placement review](module-placement-review.md) records where existing modules are extended and where new behavior needs a focused module.

[Ticket 01 implementation and review evidence](verification/ticket01/review.md): Standards and Spec pass; 272 calculation/domain and 50 focused browser checks passed.
