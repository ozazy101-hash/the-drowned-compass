# Party Dashboard (Ticket 06)

The Party Dashboard reads accepted Character Records through the existing Party data seam. `src/components/claimed-character-card.tsx` renders identity, primary class/subclass, total level, maximum Hit Points, Armor Class, the six effective Ability modifiers, Passive Perception and applicable spell save DC. The released `calculateDerivedValues` module supplies effective values, including zero overrides and dependent calculations. An explicit spell save DC override is applicable even without a spellcasting Ability; otherwise an unknown DC is omitted. Visible asterisks and an “Override” legend explain direct overrides without relying on colour.

The compact dashboard heading brings the Party forward. Laptop cards form three columns and two rows; phones keep identity and health/defences before secondary values. Each claimed card is one labelled native button, operable with Enter or Space, with its summary as an accessible description. Unclaimed Character Slots retain their distinct setup action and the heading reports the claimed count. Existing version-aware Party snapshots continue to drive live cards; a failed or conflicting save never becomes a card value until accepted.

## Health and integration seams

Current and Temporary Hit Points, Conditions, concentration, and death saves are not yet stored on the accepted main branch. This ticket adds no invented Session Tracker defaults or readiness assessment: it labels the actual maximum and explicitly displays “Current HP unknown.” Ticket 07 should replace that health block with accepted current/maximum/temporary HP and meaningful critical state, using its own conditional-write model. No schema migration or adapter/transport changes are needed for this read-only dashboard.

`ClaimedCharacterCard` has a `playSummary` composition point after the core summary for Tickets 09 and 10 to supply primary attack and important resource summaries. Supply read-only spans; nested buttons or other controls would break the whole-card interaction. Styling for that content uses `.party-card__play-summary`. Those tickets should compose both summaries rather than replace the card layout. Current total level is the existing single-class `character.level`; a future multiclass implementation must feed the sum to both the level display and `calculateDerivedValues`.

Shared integration imports/replaces the claimed card in `App.tsx`, compacts the dashboard header, and displays the claimed count. Card styles live in a separate, dashboard-scoped stylesheet. Party data, subscriptions, the production adapter, the in-memory adapter, and the shared Vite transport retain their released contracts.

The new HP concurrency acceptance found that released numeric/text editors used the latest remote field version when submitting an older draft. `EditableInput` now remembers the version where typing began, just as the released Derived Value override editor does. Only an accepted local write or explicit Retry advances that draft's base version. Existing request/revision guards still preserve newer typing through older acknowledgements. Retry also avoids an accidental blur-triggered duplicate save. Reviewers integrating other `App.tsx` work should retain this small guard.

## Verification

`e2e/party-summary.spec.ts` covers summaries, applicable/unset spell save DC, effective and zero overrides, reset, reload persistence, live two-session updates, independent writes, failed saves and Retry, stale same-field drafts, six-card responsive layout, long names, and keyboard navigation to every Character Page. Existing browser helpers now follow the configured base URL and viewport for additional sessions, allowing isolated test servers. A shared browser fixture serves an empty Google Fonts stylesheet in every test session so app acceptance exercises the existing local font fallbacks without waiting for third-party font delivery; production font styling is unchanged.

Use the normal Playwright config for ordinary runs. For concurrent implementation, a temporary task-local config reserves port 4206, disables server reuse, preserves both viewport projects and runs one worker; do not commit that port override. Record actual results in the ticket. Hosted frontend release requires approval; there is no database migration for Ticket 06.

## Local results — 2026-09-28

Four laptop dashboard acceptance cases passed with a 90000ms whole-test budget; four phone cases passed with 180000ms (7.7m), with assertion timeouts unchanged. All four Supabase adapter contract cases passed with 180000ms (4.4m). All 131 calculation cases passed (28.3s). The production build and `git diff --check` passed. Laptop and phone screenshots were visually inspected. Exact commands and interrupted-run results are recorded in the ticket.

The full 58-case regression attempt with the 90000ms budget was interrupted after five existing laptop cases passed and two existing two-session cases timed out; 51 did not run. A coordinated full regression run is still required before integrated release. No schema/adapter/transport changes were made, so no database migration rehearsal or local/hosted database mutation was needed. Hosted release remains pending explicit approval.

## Standards review

No actionable Standards findings against accepted main `da52f5af1f5520adedb34b8f79813907111fee7a`. The focused card component and stylesheet follow the documented Party data seam, pure Derived Value calculation, separate overrides, responsive priority, native keyboard interaction and conditional-write safeguards. No actionable baseline smells. The incremental browser fixture review also reported zero findings.

## Spec review

No actionable Spec findings. The six Ticket 06 acceptance requirements are implemented and locally verified. The broader spec's current/Temporary HP, Conditions, concentration and multiclass summaries remain deferred under the explicit task boundary; the card labels the maximum and unknown current HP honestly. The draft-version fix supports detection of stale writes. The incremental fixture review found no masked application behavior, while noting that local acceptance covers fallback typography rather than successful hosted webfont delivery.

Review totals: Standards 0; Spec 0; no worst issue in either axis.
