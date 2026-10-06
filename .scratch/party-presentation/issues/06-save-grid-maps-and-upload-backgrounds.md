# 06 — Save Grid Maps and upload backgrounds

**Status:** ready-for-agent

**Blocked by:** 02, 05

**Spec:** [Party content and presentation](../spec.md)

## What to build

Persist Grid Maps and optionally place uploaded landscape artwork below their grid, including artwork generated elsewhere.

## Module and interface

Map persistence owns document versions, saved state, background references and conflict semantics behind save/load outcomes. Reuse the established protected file lifecycle internally for backgrounds without exposing storage details. Keep presentation and player-readable saved maps separate from the DM unsaved document; no full-Party transport. App should compose the editor, not own its drafts, commands or errors.

## Placement and reuse decision

Extend the content module/adapters from Ticket 02 with Grid Map documents and background references. Do not create a separate map repository facade, blob repository or second authentication/client factory. The Grid Map domain module from Ticket 05 validates/edits map documents; the existing content capability owns their save/load versions, visibility and library identity. Reuse its protected image lifecycle for Map Backgrounds. Local adapter sessions come from existing local-party-store authority, but map documents and images must not be inserted into the Character Record Party snapshot. Keep editor draft/save feedback inside the map feature.

## Acceptance

- [ ] Create/save/reload private Grid Maps in the DM Library; add optional image backgrounds without converting art to editable geometry.
- [ ] Background placement preserves image proportions and remains stable in map coordinates; the grid and drawn details overlay it.
- [ ] Save is explicit, with saved/unsaved/error feedback and retry; stale saves report conflicts rather than overwrite newer accepted maps.
- [ ] Saved background/document references remain coherent after failed saves, retries or background replacement.
- [ ] No in-app AI generation; no PDF map-background alignment tooling.
- [ ] Backend/storage protect private map documents and backgrounds; Player reads expose only revealed saved content.
- [ ] Data schema and local/in-memory adapter preserve all editor features across reload.

## Verification and architecture review

Test document save/conflict/retry outcomes in both adapters, actual policy denial for private maps/backgrounds, and browser upload/draw/save/reload journeys. Prove unsaved edits never enter the Player-readable result. Build, focused browser and relevant database checks; migration/schema delivery evidence stays distinct from hosted application.

Complete the [shared depth/review gate](../spec.md#implementation-and-review-gate) before resolving this ticket. Record results and outstanding blockers under Comments.

## Comments

2026-10-06: Created from the completed grilling session; implementation has not started.

2026-10-06: Reviewed planned placement against existing modules; updated reuse guidance before implementation.
