# Module depth check — 2026-10-06

Reviewed locally available `origin/main` at `d66394f6998123486c7dede9466774a16cc3ab4e`, extracted read-only to `/tmp/drowned-architecture-d66394f`. The working checkout remains on the older Ticket 04 branch. This was a quick architecture inspection, not a fresh release verification; no application changes or tests were performed.

The architecture is broadly sound. Focused domain modules hide substantial behavior behind meaningful commands and results. `PartyData` is a real seam with Supabase and in-memory adapters. A wholesale refactor is not justified.

## Prioritized opportunities

1. **Concentrate accepted-state reconciliation in a Party-state module.** `src/App.tsx:73–115` merges eight feature states, preserves Overview versions, and projects multiclass state. The app applies reconciliation to realtime snapshots and saved results at lines 1040 and 1073. A small interface should own these rules before another screen is introduced, keeping App responsible for composition as required by `docs/agents/module-design.md`.
2. **Keep shared content and presentation cohesive and independent of Character Records.** `src/domain/party.ts:109` combines authentication and Character Record operations. Existing commands express meaningful intent; adding uploads, publication, presentation selection and map editing to that interface would introduce unrelated knowledge for callers. A new content/presentation module should hide storage mapping, role enforcement and synchronization behind meaningful commands. Its final interface depends on the interview.
3. **Separate presentation/map updates from full Party reloads.** `src/data/supabase-party-data.ts:159` loads nine feature datasets. Subscriptions trigger that load at line 402, and writes also reload, for example at line 381. This is reasonable for six characters and occasional edits, but unsuitable as the default transport for map gestures or frequent presentation updates.

## Useful depth already present

- `src/domain/derived-values.ts:31`: calculated values and override dependencies.
- `src/domain/survival.ts:23`: health transitions, validation and undo.
- `src/domain/character-rests.ts:30,44`: rest preview, selected recovery, conflict checks and retry identity.
- `src/features/FeaturesStory.tsx:10`: draft handling, retry and delayed-response guards behind a focused editor interface.

## Facts relevant to the interview

The existing DM and Player share authenticated views; role differences do not yet create a dedicated DM control room or Party Display (`src/App.tsx:1092,1167`). Character story text is Party-visible and is not a private handout draft model. Roles exist (`src/domain/party.ts:94`), but new private content requires database/storage authorization, not just hidden browser controls.

Shared uploads, a separate fullscreen display, and later grid maps are compatible with the current static frontend and Supabase direction. This is an architectural assessment, not a claim that these features exist. Physical grid calibration depends on the display setup. Persistent sharing and current presentation should be resolved as distinct concepts in the interview.

The proposal expands the scope currently defined in `CONTEXT.md`. No glossary edits or new ADRs have been made before those decisions are settled.

## Current-main follow-up

Fetched main and moved to `codex/party-presentation` at `92bf4ede616be3d2f908439d176fad76f4d813c6`. Inspected the changes since the reviewed snapshot: Ticket 17 adds the Party Backup domain module, a focused download view, and one backend-authorized snapshot command. Existing reconciliation and full-reload observations still apply. The DM now additionally has a backup control; there is still no separate Party Display or DM content-management view. Earlier line references refer to the original reviewed snapshot.
