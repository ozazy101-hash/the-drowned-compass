# 01 — Try sketch-guided map artwork

Type: prototype
Status: resolved

## Question

Does sketch → appearance description → artwork comparison → private acceptance suit a DM with a specific curved-room layout?

## Prototype

Throwaway branch `codex/map-art-prototype`, beside GridMapEditor at `src/features/grid-map/prototype-map-art/index.html`. Self-contained HTML; double-click to run. The shrine sample is genuine AI artwork from the included original layout reference. Generation in the UI is simulated; drawing, uploads, comparison and review state are interactive. No production changes or backend writes. User accepted the workflow direction on 2026-10-09; see Answer.

## Delivery

2026-10-08: Interactive prototype delivered on its throwaway branch. Laptop and phone controls exercised with no page errors or horizontal overflow. Unreviewed acceptance refused; reviewed private candidate and local display preview worked. Captures retained beside the HTML. The real AI sample follows the supplied outline closely but does not establish a general layout-fidelity guarantee. User verdict remains pending.

Run by opening the self-contained HTML, or `python3 -m http.server 4220 --bind 127.0.0.1 --directory src/features/grid-map/prototype-map-art` from this checkout, then visit http://127.0.0.1:4220/. Existing app preview4215 remains untouched.

## Answer

2026-10-09: User accepted the module workflow in principle. Button terminology needs a clearer design pass. Desired scope includes sketch-guided artwork and description-only map invention; whole-image variants retaining earlier candidates; highlighted-area revisions with layout preservation by default; and building on candidates for later story stages. Live generation and partial-edit fidelity remain unproven by the fixed-sample prototype.

User explicitly selected DM-private maps presented only on the DM-controlled extended screen. Players do not need maps in the Party Library at this stage. A complete map can use manual hide/reveal sections on that display; no automatic vision, movement or rules enforcement. Revealing an area changes the display mask, while AI revisions change artwork. Keep those separate. Handout sharing stays as designed.

This future map workflow revises current map Present/Reveal semantics and the existing Party Library/ADR assumptions. Update the map specification and affected domain decisions before implementation; this record does not alter current production permissions or behavior. Prototype source remains on `codex/map-art-prototype`, initial artifact commit `ae5ca3c`. No production implementation or release is performed by recording this decision.
