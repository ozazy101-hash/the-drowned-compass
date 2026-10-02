# Features and Story (Ticket 16)

Features contains repeatable player-authored Class, Species, Background and Feat summaries. Story contains Appearance, Personality, Backstory, Allies and General notes. Every entry is visible to the whole Party; text never automates rules effects.

`src/features/FeaturesStory.tsx` supplies the two composable Character Page sections. Editors support multiline text, explicit per-entry Save, Ctrl/Command+Enter, unsaved/Saving/Saved/failure feedback, Retry and Discard changes. Switching Character Record sections preserves mounted drafts. Text is plain text with a 20,000-character limit; Feature names allow 160 characters. Empty Story text is a valid save. Features can be added repeatedly and removed independently.

`src/domain/character-text.ts` defines and validates independently addressable entries, applies the in-memory conditional-write contract and merges records by version. Story identifiers are fixed (`story.backstory`, etc.); Features have generated identifiers. Deletions retain versioned tombstones. The draft remembers its starting version; remote changes cannot silently rebase it. Retry explicitly adopts the latest accepted version. Revision/request guards retain newer typing through delayed responses; snapshot merging preserves accepted newer records and tombstones. Clean editors render accepted entries directly; edited entries own a separate draft captured synchronously. A prior effect that copied accepted values into the draft could run after new input and erase it during a neighboring save. Removing that effect prevents the reproduced race; the boundary regression pins input at that render and checks save/reload persistence.

## Storage and release

Migration `20260928221600_record_features_and_story.sql` adds `character_text_entries` without changing Character Slots, claims, existing values or Overview versions. It grants authenticated members read access through membership RLS and denies anonymous reads. Writes use an explicitly granted authenticated RPC with membership checks, a locked claimed slot, conditional record versions, identity/length constraints and update metadata. Table writes are denied to browser roles, preventing version bypasses. The RPC has a fixed empty search path. Text changes publish Supabase Realtime events; reconnect reloads Party data through the existing adapter path.

Both production and in-memory adapters load and save entries. Vite's shared test transport uses the same validation and conditional writes as the in-memory adapter. All records, including removal tombstones, load with Party snapshots.

The user approved Ticket 16 integration and deployment on 2026-10-02. Apply this migration before deploying the new frontend; it expects the new table. Ticket 16 stays claimed until hosted acceptance confirms the release.

## Integration seams

- `CharacterRecord.textEntries` is additive and optional for legacy in-memory fixtures; production reads populate it. `PartyData.saveCharacterTextEntry` returns the existing slot update envelope.
- `App.tsx` adds text-record merging and mounts Features/Story under the existing section navigation. Peers activating Combat/Inventory can extend the same section selector and add their own mounted sections; the dashboard layout is unchanged.
- The Supabase adapter adds one table read, one RPC method and a text-table Realtime subscription. Its Overview writes remain intact.
- `scripts/run-database-tests.mjs` lists rollback-only migration rehearsals. Peer migrations can append another rehearsal entry without applying a persistent local migration.
- The browser helper uses the selected Playwright project's base URL for the second session, so isolated per-task ports exercise the same test server.

## Verification

`pnpm test:db` passed all 144 assertions across six files, including 33 new migration/RLS/grant/conditional-write assertions, in rollback-only transactions. `pnpm build` and `git diff --check` pass. The final selected browser run passed all 40 tests in 4.4 minutes across laptop and phone: 12 Feature/Story acceptance checks, eight text-adapter checks, four existing Supabase adapter checks and 16 Overview regressions. A separate draft-race regression passed three repetitions on each viewport (six checks total), after reproducing the same data loss in all three baseline runs. The two-session and failure/Retry workflows also passed a focused rerun after correcting exact-label test lookups for populated textareas. Both long Story layouts were visually inspected; long text wraps without page overflow. Browser tests used one worker, the shared browser verification lock and a temporary uncommitted config on reserved port 4216; that config was removed after verification. Hosted UI/database integration is pending the approved release; browser adapter contracts mock Supabase HTTP/WebSocket delivery, while SQL rehearses the real database migration and authorization rules. SQL rehearses the actual forward migration inside a transaction and rolls it back, avoiding any persistent changes to the shared local stack.

Canonical browser selections (the verification-only config changed the port, not the projects or tests):

```sh
pnpm exec playwright test e2e/features-story.spec.ts e2e/character-text-adapters.spec.ts e2e/supabase-party-data.spec.ts e2e/character-overview.spec.ts --workers=1 --timeout=90000
pnpm exec playwright test e2e/story-draft-regression.spec.ts --workers=1 --timeout=90000 --repeat-each=3
```

Review PR: [#7](https://github.com/ozazy101-hash/the-drowned-compass/pull/7), branch `codex/ticket-16-features-story`, based on accepted main `da52f5af1f5520adedb34b8f79813907111fee7a`.

## Standards

Independent static review found no remaining documented-standard violations or baseline smell findings. Clean editors render accepted entries directly; unsaved editors render their separate draft. The synchronous draft reference and version/revision guards preserve the current edit through sibling snapshots and delayed acknowledgements. Blank new Features retain name validation. Earlier feedback on stale Discard feedback and duplicated navigation state was addressed.

## Spec

Independent static review found no remaining correctness or acceptance blocker. All four Feature sources and five Story fields are implemented without private-note scope or rules automation. The final fix removes the obsolete effect that reproduced data loss. The boundary regression verifies draft survival, save and reload, and the long Story journey checks outgoing values as well as persistence. Earlier removal Retry feedback was addressed and covered by regression. Hosted end-to-end verification awaits approved migration/deployment.

Remaining findings: Standards 0 (no worst issue); Spec 0 (no worst issue).

## Integration with accepted main (2026-10-02)

Accepted Ticket 09 attacks/actions and Ticket 06 Party Dashboard now compose with Features and Story. All four sections stay mounted during navigation, and Party snapshot merging retains both text and Combat record versions. Supabase loads both collections and subscribes to both change streams; the shared browser test transport accepts both commands. A new laptop/phone regression switches through Combat, Features and Story, preserves an unsaved Feature draft, then verifies all three accepted records after reload.

The integrated production build, 131 calculation cases, 179 rollback-only database assertions and all 98 existing browser cases passed; the new cross-feature regression passed on both viewports. The hosted dry run selected only `20260928221600_record_features_and_story.sql`, with no seed or role changes. Temporary test port 4216 configuration was removed. Hosted acceptance follows migration and Pages deployment.
