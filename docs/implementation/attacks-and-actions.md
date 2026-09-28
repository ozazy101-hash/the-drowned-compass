# Attacks and actions (Ticket 09)

Combat now includes a focused `CombatEntriesSection`. Every attack/action is a separately addressed, versioned record. Editing an entire record is deliberate: two devices changing that same record receive a visible conflict rather than silently combining incompatible drafts. Different records and Overview fields remain independent. Drafts keep their starting record version; only explicit Retry or Discard adopts an incoming version. Typing during an older request remains unsaved and is preserved. Remote removal retains an open dirty draft for copying or discard. Clean editors render accepted details directly; the first change copies those details into a local draft. This avoids a passive snapshot-hydration race that could replace newly typed notes before submission. Selecting an Ability and clearing its manual bonus is one draft update.

Names, range, damage, damage type and notes are player-entered. An attack records either a manual whole-number attack bonus (including zero) or a relevant Ability reminder. Selecting an Ability does not infer weapon proficiency, damage, or class rules. Actions have a name and player-authored notes. Move up/down buttons provide keyboard and touch ordering using fractional ranks; equal ranks have stable ID ordering.

The primary attack is one separately versioned pointer per Character Slot. Selecting an action as primary is prohibited. Removing the primary attack clears the pointer atomically. Removal retains a versioned tombstone, so delayed acknowledgements or snapshots cannot revive removed records. The merge seam takes the newest version of each record and of the primary selection independently.

## Integration seams

- `src/components/CombatEntriesSection.tsx` is one composable Combat section. Ticket 10's resources can sit alongside it; this component does not own other Combat content.
- `primaryAttackSummary(character.combatEntries)` in `src/domain/combat-entries.ts` returns a concise string or null. Ticket 06 can place it in its existing dashboard card layout. Today's small dashboard addition displays the same string beneath identity.
- `CharacterRecord.combatEntries` is optional for old fixtures/local storage, normalized to an empty collection by the in-memory adapter. The production adapter loads `character_combat_entries` and `character_primary_attacks`. `PartyData.updateCombatEntry` submits one conditional command. Existing Overview behavior remains untouched.
- `mergeCombatEntries` must remain called by the shared Character Record snapshot merger during integration.
- The shared Vite test transport uses the same command seam as local storage. Browser tests reserve port 4209 in an untracked config; committed default ports remain unchanged. The existing two-browser helper now uses the effective Playwright project server URL so isolated task configs work.
- The database runner expands the new migration into a rollback-only fixture, alongside its existing Derived Values fixture. No persistent local migration is necessary.

## Migration and release

Migration `20260928220900_manage_attacks_and_actions.sql` adds two tables and one narrow RPC. It preserves Character Slots, claims, Overview inputs/versions, and existing data. Browser roles can read records only through existing Party membership RLS; they cannot directly insert/update/delete the new tables. The authenticated RPC checks membership and a claimed slot, locks that slot for atomic primary selection/removal, validates supplied details and applies the expected record/selection version. Anonymous users cannot read or execute the RPC. Validator and RPC privileges are explicitly revoked/regranted, independent of local default privileges. Both tables are published to Supabase Realtime and reconnect reloads Party data.

Release requires approval for this ticket, applying the migration to hosted Supabase, deploying the reviewed frontend and verifying member persistence, two-session synchronization and conflicts. No hosted migration, production data edit or deployment is authorized by the implementation request. Hosted acceptance and release remain pending; Ticket 09 stays claimed until accepted deployment.

## Verification

The production build, 131 calculation tests and whitespace checks pass. Independent Standards and Spec reviews report zero remaining findings. Browser verification is pending completion of the shared verification queue; see the ticket and PR for exact outcomes.

All 146 local database assertions passed: 111 baseline/Derived Values and 35 Combat assertions. The new RPC has zero `plpgsql_check` findings. The direct container checks ran through the shared database lock after localhost connections timed out; every fixture and lint transaction rolled back. The Combat fixture expands the actual forward migration and verifies preserved slots/data, permissions, conditional writes, ordering, primary selection/removal, tombstones and member/outsider access.

## Standards review

No remaining findings. The independent review confirmed fixes to test-context URLs, typed feedback states and accessible field labels/styles.

## Spec review

No remaining findings. The independent review confirmed the creation acknowledgement remains visibly Saved after the editor becomes a persisted record.

Review totals: Standards 0; Spec 0. Neither axis has an outstanding issue.
