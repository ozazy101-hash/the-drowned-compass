# Ticket 13 delivery ledger

Implementation complete and review-ready; release awaits separate human approval.

- Fetched-main baseline: `5c6c52d14a34ca3bf606963e863d705252124504`.
- Reviewed code/test head: `5d4c30ecff3f7cacfcbf644db50aed055a7d675a`.
- Coordinator reports independent exact-head Standards **0 findings**, Spec **0 findings**. Reviewers read code; they did not claim independent test execution.
- The following final evidence commit changes documentation only. It does not alter the reviewed implementation or tests.

## Behavior and transaction boundary

`previewRest` proposes saved-state changes without mutation. Short Rest addresses only non-full Short Rest resources. Long Rest also addresses Long Rest resources, manually configured non-full spell-slot levels, current HP to the saved maximum, and each nonzero death-save counter. Successes and failures can be excluded separately. Unknown current HP explicitly previews “Unknown → maximum”; valid maximum HP starts at 1. Full counts, zero configured resource/slot maxima and unconfigured slot levels need no write. All-excluded and empty previews cannot confirm. Cancellation creates no command.

`PartyData.resolveRest` carries selected identities and observed versions, not client-supplied recovery values. The pure transition, IndexedDB adapter (under the existing navigator lock), shared Vite test transport, and Supabase RPC check every selected prerequisite before writing. The RPC serializes under the same Character Slot row lock as existing feature commands. One stale/deleted/missing/re-timed selected resource, stale slot level, Survival version, or selected HP maximum version rejects the complete operation. Excluded records impose no prerequisite; excluding HP removes its maximum-version dependency. Survival remains one independently versioned record, so any concurrent Survival command conflicts with selected Health/death-save recoveries. Selected Survival fields increment that record once; each selected resource/slot record increments once. Existing Character Spells, tombstones, feature records, Conditions, Combat entries, manual unconscious/Inspiration flags, legacy Temporary HP and unrelated Overview fields remain intact. HP recovery clears stale undo history. Death-save-only recovery preserves health undo.

The UI keeps the preview snapshot and selected exclusions until confirmation/cancellation. Accepted and conflicted results merge through the existing version-aware App synchronization seam. Dirty feature drafts remain with their editors; the rest reads saved state. Conflicts disable the old selection and offer a fresh preview. Network errors retain the exact command and freeze its selection while offering retry, fresh preview or cancellation. A persisted latest-operation receipt acknowledges a matching immediate retry without repeating mutations, including after unrelated spending. Same UUID with a different payload rejects. If another rest supersedes the latest receipt, the old command safely conflicts and needs a fresh preview; receipts are not an unbounded operation history. After an ambiguous interrupted attempt, conflict feedback explains that an earlier attempt may already have completed. Receipt reads are Party-member-only; writes are RPC-only.

Ticket 19's deployed Health simplification supersedes the original rest Temporary HP clearing requirement. The exact ticket and spec story57 now explicitly preserve legacy stored values and introduce no Temporary HP controls. Ticket17 is untouched.

## Distinct validation evidence

| Check | Result | Command / scope |
| --- | --- | --- |
| Typecheck + production bundle | Passed | `VITE_USE_IN_MEMORY_DATA=true pnpm build` on reviewed head; existing Vite config-loader and bundle-size warnings remain |
| Pure domain suite | **248 passed** | `pnpm test:calculations` (221 baseline +27 new rest tests), one worker |
| Local rollback-only database suite | **535 assertions, 15 files passed** | `pnpm test:db` (470 baseline +65 new assertions, one added rehearsal); actual Rest + Survival/Health + limited-resource + Magic SQL migration prerequisites inserted into the rollback fixture; existing featured-attacks and Health/Magic rehearsals preserved |
| Focused development-browser acceptance | **26 passed** | `pnpm exec playwright test --config=playwright.rests.config.ts`; strict isolated4446, two workers, laptop Chromium and Pixel7 Chromium, dedicated `test-results/rests` |
| Bundled production UI smoke | **2 viewport journeys passed** | `node /private/tmp/ticket13-production-smoke.mjs`; fresh laptop and Pixel7 browser contexts, strict4450, visible UI only, no `partyTestId` or Vite source imports |

Focused26 comprise18 UI journeys and8 adapter contract/error cases. IndexedDB/local and shared HTTP transport are exercised in browser. Four of the adapter cases exercise the production Supabase adapter through **mocked HTTP responses**, including row mapping, RPC payloads, CAS acknowledgement, receipt replay/mismatch, RPC errors and accepted-but-load-failed errors. They are not live Supabase browser acceptance. Actual local SQL access, bounds, conflict and atomicity evidence is the separate rollback-only database suite. No hosted migration, merge, deployment, hosted smoke or live Character-data mutation was performed.

The focused journeys cover mixed recovery timings, selected/all/excluded actions, no-write cancellation, unknown HP, empty/all-excluded previews, independent saved-record changes, stale selected slot/resource/maxHP previews, removed resources, failure/retry, lost acknowledgement followed by independent spending, accepted-state display and dirty Magic/Health draft preservation. Production smoke adds saved Combat Cutlass-note preservation and reload persistence while checking Health/death saves, all four resource timings and Magic slots. Each production context was new and discarded after verification. Screenshots were inspected at `/private/tmp/ticket13-laptop-preview.png` and `/private/tmp/ticket13-Pixel7-preview.png`; responsive journeys assert no horizontal overflow.

Initial validation attempts exposed test-fixture issues (minimum HP constraint, asynchronous seed rendering, record-array ordering, overly exact accessible-name selectors, a missing mock400 response) and a shared Playwright output-directory collision during concurrent runners. Final suites use corrected fixtures, isolated rest artifacts and serial acceptance. No acceptance run included source edits or HMR.

## Local preview and release order

Production UI preview: http://127.0.0.1:4450/the-drowned-compass/ (local in-memory storage). Choose Player with `player-password`, or Dungeon Master with `dm-password`. Claim a slot, enter saved Health/resources/slots, then use Preview Short Rest / Preview Long Rest. The six demo slots begin unclaimed in a fresh browser. Preview process: session99370.

1. Obtain separate human approval for release. Earlier Ticket12 release approval does not authorize Ticket13.
2. Verify required hosted prerequisites already deployed (Health/resources/Magic), then apply only `20261006210000_preview_and_resolve_rests.sql` to the hosted database under that approval.
3. Verify hosted migration/RPC access separately before merging this PR. Merging triggers Pages automatically.
4. Merge only under human authorization, observe deployment, and perform hosted smoke as separate evidence. Local rollback rehearsals and local UI previews do not establish hosted readiness.
