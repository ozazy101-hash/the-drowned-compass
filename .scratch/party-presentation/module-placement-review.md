# Planned module placement review — 2026-10-06

Reviewed branch `codex/party-presentation`, based on main `92bf4ed`, before feature implementation. Compared all nine tickets with existing implementation and codebase-design/module-design guidance. No feature code or tests were changed.

## Conclusion

Most new behavior cannot live in existing character modules without increasing caller knowledge and mixing permissions. However, the earlier tickets left too much room for independent factories, persistence facades and a calibration module. Tighten the plan to three cohesive new areas, composed through existing data/authentication infrastructure: campaign content, Grid Map domain editing, and Party Display. Internal implementation files are not additional public modules by default.

| Planned behavior | Placement | Existing evidence and reason |
| --- | --- | --- |
| Environment/auth/client composition | Extend existing data factories | `src/data/create-party-data.ts:5` chooses the adapter; `src/data/supabase-party-data.ts:136–140` creates the authenticated client. Keep one composition/auth setup per app window. |
| Local role/session authority | Reuse local-party-store session registry | `src/data/local-party-store.ts:50–58` owns opaque-token session operations; do not trust a new editable role flag. |
| Private/revealed Handouts and files | New cohesive content capability composed at existing data seam | No file-upload/visibility implementation exists. Existing PartyData is character-centric (`src/domain/party.ts:110`), so expose focused content capability rather than flatten every detail into it. |
| Saved maps, backgrounds, copy and library visibility | Extend that content capability | These share file access, identity, saved versions and visibility. A separate map repository/stage manager would duplicate caller obligations. Map geometry remains in the map domain. |
| Drawing, geometry, document history | New Grid Map domain module | Existing domains concern character resources/text/items. None owns geometric documents or undo/redo. Pure computation needs no adapter seam. |
| Party Display, PDF/image rendering, window lifecycle | New cohesive display feature | `src/main.tsx:3–15` and App own composition; no existing display/window/media module exists. Reuse content/auth operations and keep window/rendering implementation internal. |
| Projector calibration | Extend Party Display viewport behavior | It alters the same rendering transform and view position; no separate public calibration interface is justified. Reuse map-coordinate helpers internally. |
| Character reconciliation | Optional extraction within existing Party domain | `src/App.tsx:74,103` orchestrates existing merge functions. A useful cleanup, but the new display reads content rather than characters, so it is not a feature prerequisite. |
| Backup exclusions | Extend existing explanatory UI | `src/features/backup/PartyBackupDownload.tsx` and `src/domain/party-backup.ts` already own the export; no new backup module is needed. |

## Alternatives rejected

- **Put Handouts in CharacterRecord/story/inventory:** `src/domain/character-text.ts:20–46` validates character-specific kinds/IDs and `FeaturesStory.tsx:100` saves through a CharacterSlot. Inventory models equipment and currency. Party-level private files would introduce unrelated semantics and weaker access assumptions.
- **Add content to getParty/subscribeToParty:** `src/data/supabase-party-data.ts:143–165,412` loads character feature datasets on changes. Content needs independent delivery so viewport/file updates do not refresh characters. Shared client/session does not require shared snapshots or subscriptions.
- **Independent authentication/content factories:** duplicate configuration, token ownership and failure modes that the existing adapter composition already hides. Backend authorization remains enforced for new content despite sharing auth plumbing.
- **Generic file/draft/undo framework immediately:** a familiar save-feedback pattern is not an established shared interface. Keep feature-specific drafts/history internal; extract a common module only when actual callers demonstrate useful depth.
- **One public module per ticket:** tickets divide delivery; module ownership spans them. Tickets 02/03/06/08 extend one content lifecycle; 04/07/08 extend one display; 05/06/08 extend one map document behavior.

## Ticket changes

All tickets now include Placement and reuse decision guidance. Ticket 01 is `needs-triage` optional maintenance; Ticket 04 depends only on 03. Ticket 07 explicitly extends the existing display instead of introducing a calibrated-rendering facade. The spec review gate and ticket index record these decisions.

## Review limits

This is a grounded placement review, not proof of a future implementation's depth. Names and function counts are not prescribed. During implementation, verify actual interfaces, independent content subscriptions, shared session/client composition, privacy enforcement and deletion-test outcomes; revise a seam if those checks reveal excess caller knowledge.
