# Conditions and Rules Tooltips

Ticket 08 associates any of the 15 SRD Conditions, or a player-authored Custom Condition, with a Character Record. Search ignores case; active standard Conditions cannot be added twice. Custom labels can be renamed and removed and never become catalogue definitions. Both views show accepted Conditions; dashboard rule controls sit outside the card's navigation button.

## Module boundaries

`conditions.ts` owns identity, name validation, duplicate prevention, conditional versions, deletion tombstones and snapshot merging. `PartyData.updateCondition(slotId, command)` returns the accepted Character Slot or the current slot with a conflict. Commands address one association; callers never replace a Character's complete Conditions collection. `ConditionsSection` owns drafts, saving, failure feedback and explicit Retry. `App.tsx` composes the section and merges accepted snapshots without losing newer associations.

Both in-memory transports use the same domain transition. LocalStorage writes take the existing Party Web Lock; shared browser-test writes execute serially in the Vite test transport. The Supabase adapter hides row mapping, RPC writes and realtime reloads, including reconnect catch-up. The migration grants members reads through RLS and permits writes only through the authenticated RPC. A locked claimed slot serializes inserts and duplicate checks; independent record versions reject stale updates. Custom-name uniqueness is scoped to a Character Slot. The migration leaves existing slots, records and versions untouched.

`RulesTooltip` accepts a `RulesReference` and an optional reference registry. It owns hover persistence, keyboard focus, tap, a linked-term history, outside/Escape dismissal and focus return. Its interactive content is a named nonmodal dialog, rather than an ARIA tooltip containing unreachable controls. Tab enters the panel; its last Tab or first Shift+Tab returns to the trigger, and the next Tab continues to the next page control. Back and Escape within a linked rule restore the originating linked term; dismissal returns to the root trigger. Portals avoid card clipping and the bounded panel scrolls on phones. This interface is reusable by Ticket 11 without duplicating interaction rules.

Rules References are application-owned paraphrases checked against the [official SRD 5.2.1 PDF](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf). [Rules provenance and exact attribution](../rules/srd-conditions.md) are retained, and the attribution appears in the Character Page's legal disclosure. Conditions describe rules and remain manually tracked; they do not silently change derived statistics or add implied Conditions. Exhaustion's Rules Reference explains levels, but this ticket does not add an automated level tracker.

## Verification

Final results will be recorded after the complete suites finish. Tests cover domain validation and tombstones, equivalent local/shared/Supabase adapter outcomes, production realtime event/reconnect mapping, laptop/phone search and duplicate prevention, Custom naming/removal, two-browser display and distinct-field edits, failed saves and Retry, hover/focus/tap, accessible dialog naming, nested terms, Escape/outside dismissal, Tab exit and focus return. Database verification rehearses the actual forward migration inside a transaction and rolls it back; no hosted or persistent schema change is part of this task.

The browser suite uses reserved port 4208, one worker and the shared verification lock. The temporary local port configuration is excluded from the PR. Hosted end-to-end acceptance requires a later authorized migration and release.
