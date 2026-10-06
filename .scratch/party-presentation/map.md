# Party content and presentation — design interview

## Notes

The user wants DM-managed letters/maps available to the Party, a separate shared display suitable for a TV, and eventually simple editable grid maps calibrated for physical miniatures. Fog of War has the lowest priority. This is a design interview, not authorization to implement the feature.

The user has accepted extending the Party Companion to Handouts. CONTEXT.md now records Handout, Dungeon Master Library, Party Library, and Reveal. Grid-map and presentation semantics remain under discussion.

Architecture facts are being checked against locally available origin/main rather than the older Ticket 04 working checkout.

## Decisions so far

- First delivery: shared Handouts. A separate Party Display is next, before grid-map editing; the extended-display arrangement is accepted. Fog of War stays last.
- The Dungeon Master can upload private Handouts before a session, reveal them to the Party Library, and choose separately what to show on the TV.
- Revealed Handouts remain accessible for players to revisit independently on their devices.
- Initial formats: images and PDFs.
- Initial setup: upright TV. Later ambition: project onto a table for physical miniatures; calibration is deferred, not forgotten.
- Existing Party Dashboard is a Character Record overview, distinct from the proposed presentation window.

## Fog

- Product scope and delivery priority.
- Persistent Party library versus temporary presentation; meaning of sharing.
- Supported content in the first release.
- In-person and remote display use; visibility controls.
- Physical screen placement and map calibration.
- Later map authoring, interaction, and Fog of War semantics.

## Initial frontier

1. Scope and order: shared handouts, separate Party Display, grid-map authoring, then Fog of War?
2. Sharing: retain revealed handouts for later access, independently of what is displayed now?
3. Content: image/PDF uploads first, with maps as images until authoring exists?
4. Audience: in-person display plus Party phones, or remote synchronized displays too?
5. Physical setup: upright TV for shared viewing, or horizontal screen under physical miniatures?

ADR 0003 records the accepted single-collection visibility model and the distinction between revealing and presenting. Replacements preserve visibility; the revealed replacement action is labelled Replace for everyone.

## Working branch

The user authorized moving this work to a fresh branch. `codex/party-presentation` starts from fetched main `92bf4ede616be3d2f908439d176fad76f4d813c6`. Archive and interview documentation are carried over as uncommitted changes. Round one and two decisions are recorded in this map. The separate extended-display window is accepted.

## Round two frontier

- Confirm a separate Party Display window on an extended TV/projector display; remote/device access is not yet settled.
- Whether presenting a private Handout also reveals it automatically or requires an explicit reveal step.
- Whether revealed Handouts can later be withdrawn from the Party Library.
- Whether edits/replacements of revealed Handouts become visible immediately or require a new reveal.
- PDF presentation: DM-selected page on the TV versus independent player reading.
- Whether saved Handouts must be available during internet outages; network recovery behavior remains to be settled.

Party Data Backup currently covers character data and settings only. The user has deferred Handout backup/export; the interface must state that uploaded files are excluded.

## Round two decisions

- The Party Display is a separate player-safe window on an extended TV display, controlled from the DM's laptop. Remote synchronized devices are outside the initial requirement.
- Presenting a private Handout also reveals it to the Party Library. Use a clearly labelled Reveal and present action.
- Handouts remain revealed until the DM withdraws them. Withdrawal retains the private Handout and clears it from the Party Display if active; it cannot recall existing copies.
- Handouts form one collection with private/revealed visibility, not two databases or moved copies.
- The Party Display shows a DM-selected PDF page. Players independently read the complete revealed PDF.
- Online operation is initial scope. Offline access and synchronization are explicitly deferred. Retaining the current item during a connection interruption was accepted as part of the recommended initial behavior; guarantees and revocation upon reconnection must remain honest.
- A draft/publish replacement workflow was challenged as too burdensome. Recommended simplification awaiting confirmation: replacement retains visibility, with Replace for everyone for revealed Handouts.

## Round three frontier

- Confirm simplified replacement semantics.
- Confirm DM control of TV zoom/pan and independent player navigation.
- Set minimal library management and player download behavior.
- Decide whether a Handout backup/export is initial scope or deferred, acknowledging that Party Data Backup currently excludes files.
- Decide whether detailed map-editor grilling happens now or after Handouts and Party Display are delivered.

## Round three decisions

- File replacement preserves private/revealed visibility. Replacing a revealed Handout updates it for everyone without draft/publication stages; label the action Replace for everyone.
- The DM controls Party Display PDF pages, zoom and pan. Fit to screen is the default; Clear display is available. Players navigate independently on their own devices.
- Initial libraries: titles, thumbnails, search, and DM private/revealed filters. DM-only management; players can view/download revealed Handouts.
- Annotations, folders and player uploads are deferred.
- Handout export/backup is deferred. The DM retains original files; Party Data Backup must state that it excludes uploaded files.
- The user wants a quick map-editor grilling now, not after the earlier features ship.

## Map design frontier

- Visual map aid versus game rules enforcement.
- Blank grid drawing versus image-based map annotation.
- Minimum authoring vocabulary: walls, doors, terrain, eraser and undo.
- Physical versus digital tokens, and who controls them.
- Pre-session authoring versus edits during play and when changes become visible.
- Logical grid dimensions and game distance versus deferred physical projection calibration.

The initial map decisions are recorded below. Grid Map and Map Grid have been added to the glossary; remaining questions concern image use, physical calibration and whole-map visibility.

## Map round decisions

- DM-only map drawing and editing; movement, attacks, automatic visibility and other rules enforcement are deferred.
- Start with a blank square grid. Uploaded map images are also wanted, but whether as existing Handouts or editable backgrounds is unresolved.
- Initial tools: grid-snapped walls and doors, terrain painting (floor, water, difficult terrain), eraser, undo and redo. No decorative/custom brush system.
- No digital character or enemy markers. Grid Maps are intended for tabletop projection with physical miniatures.
- The DM can edit during play. Unsaved edits stay on the DM screen; Save updates revealed content and the Party Display.
- Selectable grid dimensions; default five game feet per square. Map dimensions, display zoom and physical calibration are distinct.
- Earlier deferral of calibration must be revisited because the user now expects the map release to be used with physical miniatures on a projected table.

## Remaining map frontier

1. Uploaded map images: standalone Handouts initially, or aligned editable backgrounds in the map editor?
2. Include simple physical square calibration in the map release, keeping automatic projector correction deferred?
3. Accept whole-map visibility on reveal/save, with no hidden rooms or secret layers until Fog of War exists?

After these answers, summarize the agreed design and obtain shared-understanding confirmation before implementation or implementation-ticket creation.

## Map follow-up decisions

- Support an optional uploaded Map Background, including externally AI-generated landscape artwork, with the app's grid overlaid. The DM need not reconstruct the artwork as editable walls or terrain. A built-in AI generator has not been requested or agreed.
- Include simple test-square calibration for tabletop projection in the map release. Physical scale is retained separately from map dimensions and ordinary view zoom; calibrated presentation must not automatically fit/rescale content during stage changes. Automatic correction for angled projection is deferred.
- Revealing a map reveals the entire saved map; no secret layers or Fog of War initially.
- The user proposes preparing multiple map versions with progressively revealed terrain, then presenting them in sequence. This is a valid simpler alternative to Fog of War, provided unrevealed content is genuinely omitted from each revealed image/map.
- Consistent stage overlays require the same map grid, canvas, image registration and presentation transform. The app can preserve these when copying; independently generated images cannot be assumed to share identical geography.

## Final frontier

- Confirm artwork is generated elsewhere and uploaded, rather than adding an in-app AI generator.
- Confirm a simple Save as copy workflow for prepared stages, with copies initially private and presentation preserving matching map placement. Decide earlier stages' library visibility after this workflow is selected.
- Final shared-understanding confirmation after the remaining answers.

## Final map decisions

- Artwork is generated externally and uploaded. An in-app AI generator is a separate future feature.
- Save as copy duplicates a Grid Map's saved content, canvas dimensions, grid and background placement. The copy begins private; the DM edits and saves it before Reveal and present.
- Presenting matching stages preserves the calibrated physical scale and map position. Maps with different grid dimensions/registration must not be silently treated as matching stages.
- Earlier revealed stages retain their existing visibility until withdrawn, applying the already accepted Party Library rule. A copy does not automatically withdraw or replace its source.
- No automatic map-version timeline, automatic partial reveal or Fog of War.

## Interview status

The decision frontier is empty. Consolidated spec is ready for shared-understanding confirmation. No implementation tickets have been created and no feature implementation is authorized by these design answers alone. Once the user confirms, implementation planning can begin.

## Planning confirmation and ticket creation

The user requested implementation tickets with deep modules, simple interfaces and explicit architecture review. This confirms the design for planning. Nine individual implementation tickets and their dependency index are in README.md. The visual overhaul is deferred until after Grid Maps; usability and consistent styling remain required now. The ticket review gate covers interface knowledge, behavior locality, real adapter seams and observable verification, alongside standards/spec review. Feature implementation has not started.

## Placement review before implementation

The user requested checking whether planned behavior belongs in existing modules. Reviewed existing data factories, session/client initialization, PartyData, local-party-store, feature domains and character editors. Findings and code evidence are in module-placement-review.md. Updated all nine tickets: reuse existing auth/composition; put Handouts and map persistence in one content capability; treat calibration as an extension of Party Display; avoid separate persistence/stage facades. Grid drawing remains a justified new domain module. Optional reconciliation Ticket 01 is needs-triage and no longer blocks Ticket 04. No feature code changed.

## Ticket 01 resolved

User-selected cleanup first is complete. App now delegates to the focused Party-state module. One implementation agent and one independent review agent completed; no findings required another iteration. Standards/depth and Spec pass; 272/272 calculation/domain checks, 50/50 laptop/phone browser checks, build and diff checks pass. Exact source and review evidence are in verification/ticket01/review.md. No content feature tickets have started and no application release was performed.
