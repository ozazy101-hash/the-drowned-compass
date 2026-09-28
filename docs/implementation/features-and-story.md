# Features and Story (Ticket 16)

Features contains repeatable player-authored Class, Species, Background and Feat summaries. Story contains Appearance, Personality, Backstory, Allies and General notes. Every entry is visible to the whole Party; text never automates rules effects.

`src/features/FeaturesStory.tsx` supplies the two composable Character Page sections. Editors support multiline text, explicit per-entry Save, Ctrl/Command+Enter, unsaved/Saving/Saved/failure feedback, Retry and Discard changes. Switching Character Record sections preserves mounted drafts. Text is plain text with a 20,000-character limit; Feature names allow 160 characters. Empty Story text is a valid save. Features can be added repeatedly and removed independently.

`src/domain/character-text.ts` defines and validates independently addressable entries, applies the in-memory conditional-write contract and merges records by version. Story identifiers are fixed (`story.backstory`, etc.); Features have generated identifiers. Deletions retain versioned tombstones. The draft remembers its starting version; remote changes cannot silently rebase it. Retry explicitly adopts the latest accepted version. Revision/request guards retain newer typing through delayed responses; snapshot merging preserves accepted newer records and tombstones.

## Storage and release

Migration `20260928221600_record_features_and_story.sql` adds `character_text_entries` without changing Character Slots, claims, existing values or Overview versions. It grants authenticated members read access through membership RLS and denies anonymous reads. Writes use an explicitly granted authenticated RPC with membership checks, a locked claimed slot, conditional record versions, identity/length constraints and update metadata. Table writes are denied to browser roles, preventing version bypasses. The RPC has a fixed empty search path. Text changes publish Supabase Realtime events; reconnect reloads Party data through the existing adapter path.

Both production and in-memory adapters load and save entries. Vite's shared test transport uses the same validation and conditional writes as the in-memory adapter. All records, including removal tombstones, load with Party snapshots.

Hosted migration and reviewed frontend deployment remain pending user approval. Apply this migration before deploying the new frontend; it expects the new table. No hosted data edits are authorized by this ticket implementation. Ticket 16 stays claimed while review/release is pending.

## Integration seams

- `CharacterRecord.textEntries` is additive and optional for legacy in-memory fixtures; production reads populate it. `PartyData.saveCharacterTextEntry` returns the existing slot update envelope.
- `App.tsx` adds text-record merging and mounts Features/Story under the existing section navigation. Peers activating Combat/Inventory can extend the same section selector and add their own mounted sections; the dashboard layout is unchanged.
- The Supabase adapter adds one table read, one RPC method and a text-table Realtime subscription. Its Overview writes remain intact.
- `scripts/run-database-tests.mjs` lists rollback-only migration rehearsals. Peer migrations can append another rehearsal entry without applying a persistent local migration.
- The browser helper uses the selected Playwright project's base URL for the second session, so isolated per-task ports exercise the same test server.

## Verification

Verification results are appended after the local acceptance runs. Browser tests use both laptop and phone projects with one worker and a temporary uncommitted config on port 4216. SQL rehearses the actual forward migration inside a transaction and rolls it back, avoiding any persistent changes to the shared local stack.
