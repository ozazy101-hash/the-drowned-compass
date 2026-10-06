# Handouts, Party Display, and Grid Maps

Status: confirmed for implementation planning; tickets created at the user’s request on 2026-10-06. Feature implementation has not started.

## Delivery order

1. Shared Handouts.
2. Party Display.
3. Grid-map editing.
4. Fog of War only as a later, separately designed feature.

## Shared Handouts

The DM uploads images or PDFs privately, titles them, and reveals them to a persistent Party Library. Players can view/download revealed content on their own devices. Keep one collection with visibility state; backend/storage enforce access. DM-only management. Titled thumbnails, search, and DM private/revealed filters suffice. Annotations, folders and player uploads are deferred.

Replacements retain visibility; use Replace for everyone for revealed content. No draft/publish replacement workflow. Withdraw removes Party access, retains private content, and clears an active presentation; it cannot recall copies.

## Party Display

Separate player-safe window on an extended TV/projector display, controlled from the DM laptop. Reveal and present also reveals private material. DM chooses content, PDF page, zoom and pan. Fit to screen and Clear display are available. Players independently read complete revealed PDFs. Initially online; offline access/sync and remote synchronized displays are outside initial scope. Preserve the current rendered item during a connection interruption where possible without claiming guaranteed offline access.

## Grid-map editor

DM-only visual drawing on a blank square grid with selectable dimensions and five game feet per square by default. An optional uploaded landscape image can serve as the Map Background beneath the grid; artwork is not automatically converted into editable geometry. Artwork is generated elsewhere; there is no in-app AI generator. Grid-snapped walls/doors, floor/water/difficult-terrain painting, eraser, undo/redo. No digital markers, movement/attack enforcement, automatic visibility or Fog of War. Intended for physical miniatures on a projected table.

DM edits during play remain local until Save; saving updates a revealed map and its active presentation. Logical map size, view zoom and physical projection scale remain separate. Include simple test-square calibration for physical miniatures; preserve calibrated scale rather than automatically fitting content. Reveal exposes the whole saved map; no hidden layers.

## Prepared map stages

Save as copy duplicates saved map content, canvas/grid dimensions and background placement, creating a private copy. The DM can edit and save copies in advance, then Reveal and present each stage. Matching stages preserve the calibrated physical square size and map position when switching; do not automatically fit them to the screen. Earlier revealed stages remain in the Party Library until withdrawn, independently of the active presentation. No automatic version timeline or partial-reveal system.

The DM must omit unrevealed geography from each stage's uploaded image or drawn content. Identical canvas size alone does not guarantee independently generated images share the same geographic placement.

## Deferred

Handout backup/export, offline access/synchronization, annotations, folders, player uploads, digital tokens and rules automation. Party Data Backup must clearly state that uploaded files are excluded.

## Confirmation

The user accepted the design, added a deferred visual overhaul, and requested implementation tickets with explicit deep-module review. This confirms shared understanding for planning.

## Architecture direction

Follow the existing deep-module guidance. Handout visibility and persistence, Party Display coordination, map document editing and calibrated rendering should have focused interfaces. Keep uploads, maps and frequent display updates independent of Character Record reloads. Keep existing accepted-state reconciliation within the Party domain; its optional extraction from App is separate maintenance and does not block the new Party Display, which consumes no Character Records. Backend/storage permissions enforce private content access.

## Implementation and review gate

Use `docs/agents/module-design.md` and the codebase-design skill. Depth means substantial behavior behind a simple interface, not a large file or a ratio of implementation lines to interface lines.

Before implementation, record the module, its callers, what they must know, invariants, errors/conflicts and dependencies. The proposed interfaces in tickets are intent, not mandatory function names or method counts. Keep actual interface knowledge small; hide transport details and internal seams. Use real Supabase and in-memory/local adapters where persistence varies; pure computation needs no adapter abstraction.

Before resolving each ticket, review two axes: repository standards (including module design and glossary) and fidelity to the spec. The code-review skill may run the independent reviews. Record concrete findings and corrections in the ticket. No ticket passes simply because it exports few functions. Verify:

- Callers express intent without reproducing validation, authorization, geometry, synchronization, retry or conflict rules.
- App composes views; feature modules own drafts/save feedback; adapters own storage and transport.
- New content/display updates do not trigger full Character Record reloads.
- Deleting the module would spread useful behavior across callers. Thin forwarding wrappers and speculative seams fail this test.
- Observable behavior is verified through the same interface callers use. Reuse/move meaningful existing coverage rather than layering tests of private helpers or repeating every full regression for every ticket.
- Test build/domain/data/database and focused laptop/phone browser behavior as applicable. Report not-applicable checks honestly. Run the combined regression once at Ticket 09, then repeat only when changes/failures justify it.

Required review evidence: concise interface/caller description, why the module has depth, relevant test outcomes, and unresolved findings. A design that exposes unnecessary complexity must be revised before integration; do not waive it merely to close a ticket. Follow repository ticket-delivery guidance for exact-head evidence, previews and release separation.

## UI roadmap

A full visual overhaul follows Handouts, Party Display and Grid Maps, informed by reference websites the user will provide later. Clear navigation, usable controls, accessible reading and consistent styling remain acceptance requirements now. Keep rendering/styling separate from domain behavior so redesign does not require rewriting permissions, document edits or presentation state. No visual overhaul is included in these implementation tickets.

## Module placement review

See [placement review](module-placement-review.md) for code evidence and rejected alternatives. Ticket boundaries do not imply separate public modules. The selected arrangement is:

- Reuse existing PartyData composition, environment selection, authenticated Supabase client, role/membership authority and local session registry. Introduce no independent content authentication/client bootstrap.
- Add one cohesive campaign-content capability containing Handouts and saved Grid Maps, file lifecycle, visibility and content-specific delivery. Expose this narrowly through the existing composition; do not insert content into the Party/CharacterRecord snapshot or add a flat method per storage detail to PartyData.
- Add one Grid Map domain module for document invariants, drawing and history. Map persistence/copy/reveal extend the content capability; they do not require independent repositories.
- Add one Party Display feature module for selected-content rendering, cross-window coordination and viewport state. Calibration extends that module; it does not require a separate public module or adapter.
- Retain existing character domain modules and editor behavior. Reuse established validation/version/outcome patterns without generalizing character text/inventory modules to unrelated campaign content.
- Ticket 01 is optional existing-domain maintenance (`needs-triage`), outside the new-feature critical path.

Verify this arrangement at implementation review against actual caller knowledge; internal helpers and adapter files are permitted without promoting every helper to a public seam.
