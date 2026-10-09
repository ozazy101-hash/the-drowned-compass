# Map textures and quick map creation: research and options

Date: 8 October 2026. Scope: ideation for The Drowned Compass, without implementation or ticket creation. Research uses official product pages and first-party release notes; these are documented capabilities, not a hands-on comparative usability test. “Best in class” here means useful established reference products for different workflows, rather than a measured ranking. BattlemapAI is included as a prompt-based example, not as an established quality leader.

## Recommendation

Build a small, attractive **texture-and-theme system** first, then add a **quick editable encounter generator**. Offer **AI artwork as an optional Map Background**. These solve different needs and can share the existing save, copy, Reveal and Present workflow.

For this campaign, a deliberately small set of excellent materials and reusable encounters will be more useful than an enormous asset catalogue. Start with grass, earth, sand, wet stone, ship planks and shallow/deep water; include forest clearing, ruined shrine, beach landing, smugglers’ cave, dockside and ship-deck starter layouts. These are our proposals, not commitments or competitor features.

## Reference products and ideas to borrow

| Product | Where it runs | Documented strengths | Adaptation for this app |
| --- | --- | --- | --- |
| [Inkarnate](https://inkarnate.com/) | Website | Textures and stamps, textured shape fills and cloneable community maps. Its December 2025 update adds custom layers/masks, reusable Scene Stamps, brush controls and snapshots. | A small material palette, coherent themes and reusable scene pieces. Hide advanced controls until needed. |
| [Dungeon Scrawl](https://blog.dungeonscrawl.com/may-2026-update) | Website | The May 2026 update adds a random dungeon generator, image stamps, curved drawing and lighting improvements. Generated layouts remain customizable; users can regenerate. | “Give me a starting map” followed by ordinary editing. A few generation controls and a clear warning before replacing work. |
| [DUNGEONFOG](https://www.dungeonfog.com/) | Website | Vector map editing with high-resolution decorative assets, community maps users can claim and adapt, and export/print workflows. Room Templates and Color Grading are documented premium features. | Reusable room/encounter templates and a consistent visual theme, rather than requiring the DM to decorate everything manually. |
| [Dungeondraft](https://dungeondraft.net/) | Desktop application | Smart tiling, object scattering, landscape painting, lighting, dungeon/cave generation and offline operation. | Seamless material joins and controlled scatter: a few rocks, roots or debris with reproducible placement. |
| [Dungeon Alchemist](https://www.dungeonalchemist.com/faqs) | Desktop application for Windows, macOS and Linux | Choose a theme and draw rooms; it adds doors, windows, objects and lighting. Its FAQ explicitly says it uses in-house procedural algorithms and artist-created content, **not generative AI or LLMs**. | Theme-aware auto-decoration and useful defaults. This demonstrates that “make a map quickly” need not mean a cloud image model. |

Sources for the Inkarnate update: [Inkarnate 2.0 official release notes](https://feedback.inkarnate.com/changelog/inkarnate-20-star). Dungeon Scrawl source: [official May 2026 update](https://blog.dungeonscrawl.com/may-2026-update). Other row descriptions are supported by their linked official product pages. Feature availability can vary by plan; this report does not compare subscriptions or prices.

The common pattern is **a coherent visual vocabulary plus fast reuse**, rather than asking users to become illustrators. Borrow these interaction patterns and make or license our own artwork; the presence of assets in another product is not permission to redistribute its asset library.

## Three practical creation routes

### 1. Textured editable maps: best immediate improvement

Replace flat-colour areas with continuous seamless patterns across cell boundaries, rather than visibly repeating independent square tiles, and a little controlled variation. Add adjustable grid contrast for projector readability. Add a map-wide theme and material painting/fill tools. Keep walls and doors visually clear above the art. Later, a small stamp palette could supply rocks, trees, crates, barrels and rubble, with rotate/scale and optional low-density scatter.

A useful first scope is six to eight materials, map-wide theme selection, paint/fill/erase, undo and a few starter encounters. Smooth coastlines, freeform masks and a full layer editor substantially expand the authoring model; they should follow proof that the simpler tools are useful.

Feasibility: rendering patterns over existing cell terrain is a relatively small improvement, but giving individual cells different saved materials requires a real document/schema change. A cosmetic grass pattern applied to every floor cell is a demonstration, not a complete texture editor.

### 2. Quick editable generation: best balance of speed and control

Start with templates or a seeded procedural generator, such as “20 × 14 forest clearing, stream, two rock outcrops” or “30 × 20 ruined shrine, five rooms, one entrance”. Return normal editable geometry and terrain, then let the DM adjust it. Controls should be map dimensions, encounter type, density and “Try another”. Preserve an accepted layout while trying variations.

A language model could eventually turn a short description into a constrained scene plan; ordinary code should build and validate the map. That is our architectural proposal, not a claimed existing app capability. It should check bounds, duplicates, valid doors/walls and connectivity where applicable. Requiring structured output alone does not guarantee that a layout is playable.

This route supplies reliable square counts, editable walls and known miniature space. It is more suitable for tactical rooms and prepared stages than relying on a painted image to imply exact geometry.

### 3. AI-generated Map Background: fastest route to rich artwork

Generate an overhead image outside the app and upload it through the existing Map Background workflow. That can be tried without any new application feature. An eventual integrated flow could be: describe scene → generate private preview → retry/select → attach as Map Background → save privately → explicitly Reveal or Present.

[BattlemapAI](https://battlemapai.com/) publicly documents a describe/generate/download workflow and markets rapid battlemap creation for VTT/print. Its homepage shows scene-image examples. The stated generation time and “game-ready” quality are vendor claims, not verified benchmarks. The reviewed page does not establish editable wall/door geometry or structured map export; do not assume those capabilities. Treat this style of result as artwork unless a provider documents otherwise.

For our app, artwork import is feasible now; integrated generation needs a server-side provider call, private job/results handling, cancellation/retry behaviour, output validation and usage controls. Provider secrets must stay out of the public frontend. No model/provider or cost is selected here. The existing presentation spec explicitly places artwork generation elsewhere and excludes an in-app AI generator; selecting integrated generation would be new scope requiring a spec update, not an existing unfinished ticket.

An image can look excellent while containing ambiguous passages, inconsistent object scale or decorative obstructions. Pixel art is flattened: painted walls and crates do not automatically become movable editor objects. Prompted image editing also cannot be assumed to preserve every doorway or physical miniature position. Keep the existing structured grid/walls as the authority when exact placement matters.

## Current app fit and constraints

Reviewed accepted source: `e7f6ea9aa4de34dd93441cb5f4241dba54874b9d`, via the Ticket09 preview checkout. This is source inspection, not a new browser verification run.

- `src/domain/grid-map.ts` defines 2–80 columns/rows, terrain kinds `floor`, `water`, `difficult`, plus wall/door edges. The current `MapDrawing` renders solid fills; it has no saved material palette or stamp model.
- `src/domain/party-content.ts` accepts PNG/JPEG/WebP Map Backgrounds. The shared upload validator permits up to 20 MiB; the map background validator permits up to 16 million pixels and preserves image aspect ratio when fitting it into the Map Grid.
- `supabase/migrations/20261007120000_saved_grid_maps.sql` validates the same terrain kinds server-side. Saved appearance changes therefore need coordinated TypeScript and SQL validation and backward-compatible old-map handling. Simply adding fields in the renderer would not establish durable storage.
- `GridMapEditor.tsx` draws background, terrain, grid, then walls/doors. A future appearance design needs explicit layer/opacity handling so newly painted floor cells do not unexpectedly hide important background art.
- Keep visual material separate from terrain meaning: grass, sand and planks can all be ordinary floor, while difficult terrain remains a distinct marked property. Appearance must not imply new rules automation.
- Preserve the existing PartyContent ownership and permissions, private copies, saved version checks, explicit Reveal and Present, and shared `MapDrawing` output across editing, Library and Party Display.

Repository decisions: `docs/adr/0004-separate-map-grid-from-display-calibration.md` requires game coordinates independent of physical Display Calibration and matching prepared copies that preserve placement. `docs/adr/0003-handout-visibility-and-presentation.md` keeps content visibility distinct from presentation and enforces access in backend/storage. The proposals above fit those decisions if generated results remain private until explicitly shared.

## Projection-specific quality bar

For generated artwork, request an orthographic top-down scene with **no baked grid, text, labels, tokens or miniatures**. Overlay the app’s calibrated Map Grid once; duplicate grids make alignment confusing. Choose the scene’s aspect ratio to match the requested columns/rows and check object scale manually before play. Keep shadows and clutter restrained so physical miniatures and wall boundaries remain readable on the actual projector. These are recommendations based on this app’s physical-table use, not promises a generator will obey every prompt.

Do not regenerate a presented stage in place. Generate/review another private candidate and preserve map registration for stage changes. Replacing the whole illustrated layout can shift landmarks even when the canvas has the same dimensions.

## Suggested next decision

The strongest first prototype is **one forest encounter shown in two creation modes**: an editable textured map with grass/earth/water and a small set of props; and a rich generated overhead image imported as a Map Background. Compare preparation time, ease of moving a stream/door/rock, grid readability and projector clarity. Then decide whether the next implementation is the material editor, a quick starter-map generator, or integrated image generation. No tickets have been created by this research.
