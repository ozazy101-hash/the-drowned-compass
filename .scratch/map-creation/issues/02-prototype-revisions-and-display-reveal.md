# 02 — Try private map revisions and manual display reveal

Type: prototype
Status: resolved

## Question

Do clear creation modes, retained and branched versions, selected-area edits, later stages and manual display-only conceal/reveal match the accepted DM workflow?

## Scope

Throwaway prototype2 on codex/map-art-prototype, src/features/grid-map/prototype-map-art/index.html. Real sample artwork; generation/revisions simulated. No production or backend changes. Previous prototype retained as version-1.html. User verdict pending.

## Delivery — 2026-10-09

Prototype2 implemented: Invent a map / Use my sketch; custom outline and image upload; retained versions and branching; rectangle-based area selection; simulated whole/area variants and later-chamber patches; before/after comparison; explicit Use this map; manual grid-cell uncover/hide, undo and full-mask actions; real separate extended-display window receiving only flattened visible pixels. No map-library delivery, backend, live AI or calibration changes.

Exercised laptop and phone controls: new map fully hidden, mask painting, area revision produced a second version without switching display, choosing a revision retained the reveal mask, later-stage workflow switched explicitly, custom sketch drawing worked. No runtime page errors or horizontal overflow. Separate display contained no source image element and sampled hidden pixels were opaque black. These are prototype interaction checks, not production access-control evidence or AI fidelity proof. Mask alignment is retained only for versions in the same map family; independent new maps start hidden.

Self-contained index.html runs directly, or use existing local preview http://127.0.0.1:4220/. Previous prototype remains version-1.html. Artwork samples are genuinely AI-generated, while in-browser generation and revisions are visibly labelled simulations. User verdict pending; production stays unchanged.

## Answer — 2026-10-09

User accepted all demonstrated module features and requested the implementation spec and tickets. Prototype commit `eb611e7` on `codex/map-art-prototype` is the primary interaction reference. Sample generation/local revision simulations remain capability limits; live image generation and masked-edit preservation require Ticket03 verification. Production implementation has not begun.
