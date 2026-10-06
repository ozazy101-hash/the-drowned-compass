# Ticket17 delivery evidence

Implementation baseline: accepted deployed `d66394f6998123486c7dede9466774a16cc3ab4e` (PR #25, Ticket13). Code/test candidate: `31ee6251505624a36581554a84d91ee83c294044`; preceding implementation head `bd6503ec6056c5383471b4d2234e88f32b329391`. The candidate adds only four portable pgTAP fixture assertions to the preceding implementation. Independent Standards and Spec review reported zero findings at the implementation head; both reviewers reaffirmed zero findings at exact candidate `31ee6251505624a36581554a84d91ee83c294044` (Standards0 / Spec0). Reviews inspect code; they do not constitute independent test runs.

## Snapshot and portable schema

`PartyData.exportPartyBackup()` captures committed saved data. Supabase uses one read-only, STABLE, SECURITY DEFINER RPC statement with party membership and DM role derived from `auth.uid()` in the same snapshot. It does not accept client role or party arguments. All SQL fields and nested JSON keys are explicit allowlists; the private projection helper is not executable by application roles. The production adapter calls this RPC once and projects its result through the same domain allowlist. It does not fall back to cached or sequential table reads.

Schema version1 has format `the-drowned-compass-party-data-backup`, six ordered slots, complete Character Records and saved feature data, and `settings.partyName`, the only persisted Party Companion setting. It includes saved Character Story backstories/notes, custom spell descriptions and notes, SRD spell associations identified by pinned SRD5.2.1 identity, manually configured slots, health/death saves/resources, inventory/currency, classes, Conditions, attacks/actions and feature/story records. Campaign story/world/sessions/DM preparation remain outside this application's data and are explicitly excluded in UI and schema scope.

Versions, deleted-record tombstones, ordering/ranks, legacy Temporary HP and explicit Health undo state are preserved deliberately. Operational latest-rest retry receipts and audit/auth identities are excluded. Arrays are deterministically ordered; no capture timestamp makes identical saved snapshots identical JSON. Unknown nested keys, malformed object-valued scalar fields, credentials, tokens, unrelated browser storage and unrelated Supabase data are excluded. The fixed JSON filename is `the-drowned-compass-party-data-v1.json`. This is a download format; there is no restore/import feature or compatibility promise for restoration.

The in-memory local adapter captures IndexedDB under its existing party lock. IndexedDB upgrade preserves legacy records and adds a password-issued opaque-token role registry. Shared development authority uses a namespace-scoped server token registry. Unknown/revoked tokens and forged display roles fail; signout and role replacement revoke old tokens. Legacy display-role compatibility cannot authorize export until password signin. Local browser data is user-controlled prototype data, not production authentication. The feature discards asynchronous results after signout/unmount/role switch, excludes dirty drafts and preserves the editor draft, and offers safe download error/retry feedback.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Domain | `pnpm test:calculations` |260 passed:248 baseline +12 backup tests |
| Build/typecheck | `VITE_USE_IN_MEMORY_DATA=true pnpm build` |passed; existing Vite/chunk-size warnings remain |
| Actual local SQL | `pnpm test:db` |582 assertions /16files passed:535 baseline +47 backup assertions |
| Focused browser | `pnpm exec playwright test --config=playwright.backup.config.ts` |24 passed:20 local/shared browser journeys +4 production-adapter HTTP mock cases, laptop and Pixel7 |
| Fresh bundled production | bundled Node `/private/tmp/ticket17-production-smoke.mjs` against4470 |2 viewport journeys passed with actual downloaded files |

SQL rehearsal composes actual prerequisite and backup migrations inside rollback-only fixtures. It covers DM/player/nonmember/anonymous authority, forged role/downgrade, allowlisted complete feature projection, tombstones, zero values, legacy HP, Story, receipt/secret omission and read-only snapshot metadata. No hosted migrations, reset or persistent fixture writes were performed.

Focused browser checks cover actual downloaded JSON, deterministic repeated download, local/shared DM authority, Player direct invocation and forged role rejection, revoked/unknown/cross-namespace tokens, signout/role replacement, legacy IndexedDB upgrade, dirty draft preservation, delayed response after role change and error/retry. The four Supabase adapter cases mock HTTP and separately verify one RPC, mapping, backend refusal, safe errors and retry; they are not live Supabase browser acceptance. Actual SQL evidence is the rollback rehearsal above.

Production smoke uses fresh browser contexts and the built bundle, no `partyTestId` and no source imports. Both viewports claim a record through UI, save health/death saves/resource/custom spell/spell slots/Story, leave an unsaved Story draft, download and inspect JSON, verify saved data and omission of draft/unrelated secret sentinel, retain the draft, then sign in as Player and verify the action is absent. No page errors or horizontal overflow; both section screenshots inspected. Temporary evidence: `/private/tmp/ticket17-laptop-backup.json`, `/private/tmp/ticket17-Pixel7-backup.json`, and corresponding `*-backup-ui.png` screenshots. These are local generated test artifacts, not committed personal data.

## Preview and release

The local-only production preview remains at `http://127.0.0.1:4470/the-drowned-compass/`; choose Dungeon Master and enter `dm-password`, or Player and `player-password`. These are prototype demo passwords, not hosted credentials. Existing previews4390/4422/4434/4450 were preserved. Focused acceptance uses isolated strict4466, two workers, separate artifacts and no HMR edits during runs.

Ticket17 prerequisite statuses were reconciled using accepted coordinator release evidence for completed core work, including Ticket12 PR #24 at `5c6c52d14a34ca3bf606963e863d705252124504` and Ticket13 PR #25 at the current baseline. This is trusted release history, not independent hosted inspection.

Release order requires separate human approval: verify deployed prerequisites; apply only `20261006220000_download_party_data_backup.sql` to hosted Supabase before merging; verify backend DM success and Player denial; approve merge and Pages deployment; then run hosted smoke. Local acceptance does not establish hosted migration/deployment success. This task performed no hosted migration, merge, deployment or live Character changes.

Suggested PR: **Add DM-only portable Party Data Backup**. Description: “Dungeon Master access can download a versioned JSON snapshot of saved Character Records, Spells, trackers and the persisted party name. Authoritative backend DM checks and explicit field projection exclude credentials, unrelated data and drafts; the interface explains campaign exclusions and preserves Character Story notes. Validation:260 domain tests,582 rollback SQL assertions/16files,24 focused browser cases and2 fresh bundled download journeys. Four browser cases use Supabase HTTP mocks; hosted migration must precede merge under separate release approval.”
